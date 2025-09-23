import { Job } from 'bullmq';
import { bullMQManager, QUEUE_NAMES, VideoProcessingJobData, CourseVideoProcessingJobData, JOB_TYPES } from '../infra';
import { downloadFile, uploadFile, S3_BUCKETS } from '../infra/aws/s3';
import { existsSync, mkdirSync, unlinkSync, readFileSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CoursesRepository } from '../repository/courses.repository';
import { ContentWithModule } from '../shared/types/courses.types';
import { ContentType } from '../shared/enums';

const execAsync = promisify(exec);

// Video Processing Interfaces
interface TranscodingConfig {
    outputFormats: Array<{
        resolution: string;
        codec: string;
        bitrate?: string;
        fps?: number;
    }>;
    audioCodec?: string;
    audioBitrate?: string;
    generateThumbnails?: boolean;
    thumbnailCount?: number;
    removeOriginal?: boolean;
}

interface TranscodingResult {
    success: boolean;
    outputFiles?: Array<{
        path: string;
        format: string;
        resolution: string;
        size: number;
        duration: number;
    }>;
    thumbnails?: string[];
    metadata?: {
        originalDuration: number;
        originalSize: number;
        totalOutputSize: number;
        processingTime: number;
        inputFormat: string;
        inputCodec: string;
    };
    error?: string;
}

// FFmpeg Video Processing Class
class FFmpegVideoProcessor {
    private ffmpegPath: string;
    private ffprobePath: string;
    private serviceName: string;

    constructor(ffmpegPath: string = 'ffmpeg', ffprobePath: string = 'ffprobe') {
        this.ffmpegPath = ffmpegPath;
        this.ffprobePath = ffprobePath;
        this.serviceName = 'FFmpegVideoProcessor';
    }

    async isAvailable(): Promise<boolean> {
        try {
            const { stdout } = await execAsync(`${this.ffmpegPath} -version`);
            return stdout.includes('ffmpeg version');
        } catch (error) {
            this.logError('availability_check', error, { ffmpegPath: this.ffmpegPath });
            return false;
        }
    }

    async transcodeVideo(
        inputPath: string,
        outputDir: string,
        config: TranscodingConfig
    ): Promise<TranscodingResult> {
        try {
            this.validateConfig(config);

            if (!existsSync(inputPath)) {
                throw new Error(`Input video file not found: ${inputPath}`);
            }

            // Ensure output directory exists
            if (!existsSync(outputDir)) {
                mkdirSync(outputDir, { recursive: true });
            }

            this.logOperation('transcode_start', {
                inputPath,
                outputDir,
                config,
            });

            const startTime = Date.now();

            // Get input video metadata
            const inputMetadata = await this.getVideoMetadata(inputPath);
            const originalSize = statSync(inputPath).size;

            // Process each output format in parallel
            const outputFiles: TranscodingResult['outputFiles'] = [];
            const thumbnails: string[] = [];

            // Create parallel processing promises for each output format
            const formatPromises = config.outputFormats.map(async (format) => {
                const outputFilename = this.generateOutputFilename(inputPath, format.resolution, format.codec);
                const outputPath = join(outputDir, outputFilename);

                // Build and execute FFmpeg command
                const command = this.buildFFmpegCommand(inputPath, outputPath, format, config);

                this.logOperation('ffmpeg_command_start', {
                    command,
                    outputPath,
                });

                await execAsync(command);

                // Verify output file was created
                if (existsSync(outputPath)) {
                    const outputSize = statSync(outputPath).size;
                    return {
                        path: outputPath,
                        format: format.codec,
                        resolution: format.resolution,
                        size: outputSize,
                        duration: inputMetadata.duration,
                    };
                }
                return null;
            });

            // Wait for all format processing to complete
            const formatResults = await Promise.all(formatPromises);
            outputFiles.push(...formatResults.filter(result => result !== null));

            // Generate thumbnails if requested (parallel with video processing)
            let thumbnailPromise: Promise<string[]> = Promise.resolve([]);
            if (config.generateThumbnails) {
                thumbnailPromise = this.generateThumbnails(
                    inputPath,
                    outputDir,
                    config.thumbnailCount || 5
                );
            }

            const thumbnailPaths = await thumbnailPromise;
            thumbnails.push(...thumbnailPaths);

            const processingTime = Date.now() - startTime;
            const totalOutputSize = this.calculateTotalSize(outputFiles.map(f => f.path));

            const result: TranscodingResult = {
                success: true,
                outputFiles,
                thumbnails,
                metadata: {
                    originalDuration: inputMetadata.duration,
                    originalSize,
                    totalOutputSize,
                    processingTime,
                    inputFormat: inputMetadata.format,
                    inputCodec: inputMetadata.codec,
                },
            };

            // Clean up original file if requested
            if (config.removeOriginal && outputFiles.length > 0) {
                try {
                    const fs = require('fs');
                    fs.unlinkSync(inputPath);
                    this.logOperation('original_file_removed', { inputPath });
                } catch (error) {
                    this.logError('remove_original_file', error, { inputPath });
                }
            }

            this.logOperation('transcode_success', {
                outputCount: outputFiles.length,
                thumbnailCount: thumbnails.length,
                processingTime,
                totalOutputSize,
            });

            return result;
        } catch (error) {
            this.logError('transcode_video', error, { inputPath, outputDir, config });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown transcoding error',
            };
        }
    }

    async transcodeToHLS(
        inputPath: string,
        outputDir: string,
        resolutions: string[],
        segmentDuration: number = 10
    ): Promise<any> {
        try {
            if (!existsSync(inputPath)) {
                throw new Error(`Input video file not found: ${inputPath}`);
            }

            // Ensure output directory exists
            if (!existsSync(outputDir)) {
                mkdirSync(outputDir, { recursive: true });
            }

            this.logOperation('hls_transcode_start', {
                inputPath,
                outputDir,
                resolutions,
                segmentDuration,
            });

            const startTime = Date.now();

            // Get input video metadata
            const inputMetadata = await this.getVideoMetadata(inputPath);
            const originalSize = statSync(inputPath).size;

            // Process each resolution in parallel
            const resolutionPromises = resolutions.map(async (resolution) => {
                const resolutionDir = join(outputDir, resolution);
                if (!existsSync(resolutionDir)) {
                    mkdirSync(resolutionDir, { recursive: true });
                }

                const playlistPath = join(resolutionDir, 'playlist.m3u8');
                const segmentPattern = join(resolutionDir, 'chunk_%03d.ts');
                const bitrate = this.getBitrateForResolution(resolution);

                // Build HLS FFmpeg command
                const command = this.buildHLSCommand(
                    inputPath,
                    playlistPath,
                    segmentPattern,
                    resolution,
                    bitrate,
                    segmentDuration
                );

                this.logOperation('hls_resolution_start', {
                    resolution,
                    command,
                });

                await execAsync(command);

                // Get segment files
                const segmentFiles = this.getSegmentFiles(resolutionDir);

                this.logOperation('hls_resolution_complete', {
                    resolution,
                    segmentCount: segmentFiles.length,
                    playlistPath,
                });

                return {
                    resolution,
                    playlistPath,
                    segmentFiles,
                    bitrate,
                };
            });

            // Wait for all resolutions to complete
            const resolutionResults = await Promise.all(resolutionPromises);
            const totalSegments = resolutionResults.reduce((sum, result) => sum + result.segmentFiles.length, 0);

            // Create master playlist
            const masterPlaylistPath = join(outputDir, 'master.m3u8');
            await this.createMasterPlaylist(masterPlaylistPath, resolutionResults);

            const processingTime = Date.now() - startTime;

            const result = {
                success: true,
                resolutions: resolutionResults,
                masterPlaylist: masterPlaylistPath,
                metadata: {
                    originalDuration: inputMetadata.duration,
                    originalSize,
                    totalSegments,
                    segmentDuration,
                    processingTime,
                },
            };

            this.logOperation('hls_transcode_complete', {
                resolutionCount: resolutions.length,
                totalSegments,
                processingTime,
            });

            return result;
        } catch (error) {
            this.logError('transcode_to_hls', error, { inputPath, outputDir, resolutions });

            return {
                success: false,
                resolutions: [],
                error: error instanceof Error ? error.message : 'Unknown HLS transcoding error',
            };
        }
    }

    private validateConfig(config: TranscodingConfig): void {
        if (!config.outputFormats || config.outputFormats.length === 0) {
            throw new Error('At least one output format must be specified');
        }

        for (const format of config.outputFormats) {
            if (!format.resolution || !format.codec) {
                throw new Error('Each output format must have resolution and codec');
            }
        }
    }

    private parseResolution(resolution: string): { width: number; height: number } {
        const resolutionMap: { [key: string]: { width: number; height: number } } = {
            '240p': { width: 426, height: 240 },
            '360p': { width: 640, height: 360 },
            '480p': { width: 854, height: 480 },
            '720p': { width: 1280, height: 720 },
            '1080p': { width: 1920, height: 1080 },
            '1440p': { width: 2560, height: 1440 },
            '2160p': { width: 3840, height: 2160 },
            '4k': { width: 3840, height: 2160 },
        };

        const parsed = resolutionMap[resolution.toLowerCase()];
        if (!parsed) {
            throw new Error(`Unsupported resolution: ${resolution}`);
        }

        return parsed;
    }

    private calculateTotalSize(filePaths: string[]): number {
        const fs = require('fs');
        let totalSize = 0;

        for (const filePath of filePaths) {
            try {
                const stats = fs.statSync(filePath);
                totalSize += stats.size;
            } catch (error) {
                this.logError('calculate_file_size', error, { filePath });
            }
        }

        return totalSize;
    }

    private buildFFmpegCommand(
        inputPath: string,
        outputPath: string,
        format: TranscodingConfig['outputFormats'][0],
        config: TranscodingConfig
    ): string {
        const parts = [this.ffmpegPath];

        // Input file
        parts.push('-i', `"${inputPath}"`);

        // Video codec
        parts.push('-c:v', format.codec);

        // Resolution
        const { width, height } = this.parseResolution(format.resolution);
        parts.push('-s', `${width}x${height}`);

        // Video bitrate
        if (format.bitrate) {
            parts.push('-b:v', format.bitrate);
        }

        // FPS
        if (format.fps) {
            parts.push('-r', format.fps.toString());
        }

        // Audio codec
        if (config.audioCodec) {
            parts.push('-c:a', config.audioCodec);
        }

        // Audio bitrate
        if (config.audioBitrate) {
            parts.push('-b:a', config.audioBitrate);
        }

        // Output file
        parts.push(`"${outputPath}"`);

        // Overwrite output files
        parts.push('-y');

        return parts.join(' ');
    }

    private async getVideoMetadata(videoPath: string): Promise<{
        duration: number;
        format: string;
        codec: string;
        width: number;
        height: number;
    }> {
        try {
            const command = `${this.ffprobePath} -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
            const { stdout } = await execAsync(command);
            const metadata = JSON.parse(stdout);

            const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');

            return {
                duration: parseFloat(metadata.format.duration) || 0,
                format: metadata.format.format_name,
                codec: videoStream?.codec_name || 'unknown',
                width: videoStream?.width || 0,
                height: videoStream?.height || 0,
            };
        } catch (error) {
            this.logError('get_video_metadata', error, { videoPath });
            return {
                duration: 0,
                format: 'unknown',
                codec: 'unknown',
                width: 0,
                height: 0,
            };
        }
    }

    private async generateThumbnails(
        videoPath: string,
        outputDir: string,
        count: number
    ): Promise<string[]> {
        try {
            const baseName = basename(videoPath, extname(videoPath));
            const thumbnailPattern = join(outputDir, `${baseName}_thumbnail_%03d.webp`);

            const command = `${this.ffmpegPath} -i "${videoPath}" -vf "fps=1/${count}" -q:v 2 "${thumbnailPattern}" -y`;

            await execAsync(command);

            // Find generated thumbnail files
            const fs = require('fs');
            const files = fs.readdirSync(outputDir);
            const thumbnails = files
                .filter((f: string) => f.startsWith(`${baseName}_thumbnail_`) && f.endsWith('.webp'))
                .map((f: string) => join(outputDir, f));

            return thumbnails;
        } catch (error) {
            this.logError('generate_thumbnails', error, { videoPath, outputDir, count });
            return [];
        }
    }

    private generateOutputFilename(inputPath: string, resolution: string, codec: string): string {
        const baseName = basename(inputPath, extname(inputPath));
        const extension = codec === 'h264' ? 'mp4' : codec === 'vp9' ? 'webm' : 'mp4';

        return `${baseName}_${resolution}_${codec}.${extension}`;
    }

    private buildHLSCommand(
        inputPath: string,
        playlistPath: string,
        segmentPattern: string,
        resolution: string,
        bitrate: string,
        segmentDuration: number
    ): string {
        const { width, height } = this.parseResolution(resolution);

        const parts = [
            this.ffmpegPath,
            '-i', `"${inputPath}"`,
            // Video settings
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-s', `${width}x${height}`,
            '-b:v', bitrate,
            '-maxrate', bitrate,
            '-bufsize', `${parseInt(bitrate.replace('k', '')) * 2}k`,
            // Audio settings
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ar', '44100',
            // HLS settings
            '-f', 'hls',
            '-hls_time', segmentDuration.toString(),
            '-hls_list_size', '0',
            '-hls_segment_filename', `"${segmentPattern}"`,
            // Force keyframe intervals for better streaming
            '-g', (segmentDuration * 30).toString(), // Assuming 30fps
            '-keyint_min', (segmentDuration * 30).toString(),
            '-sc_threshold', '0',
            // Output playlist
            `"${playlistPath}"`,
            // Overwrite files
            '-y'
        ];

        return parts.join(' ');
    }

    private getBitrateForResolution(resolution: string): string {
        const bitrateMap: { [key: string]: string } = {
            '240p': '500k',
            '360p': '1000k',
            '480p': '2000k',
            '720p': '2500k',
        };

        return bitrateMap[resolution] || '2500k';
    }

    private getSegmentFiles(resolutionDir: string): string[] {
        try {
            const fs = require('fs');
            const files = fs.readdirSync(resolutionDir);

            return files
                .filter((file: string) => file.endsWith('.ts'))
                .sort() // Ensure proper ordering
                .map((file: string) => join(resolutionDir, file));
        } catch (error) {
            this.logError('get_segment_files', error, { resolutionDir });
            return [];
        }
    }

    private async createMasterPlaylist(masterPlaylistPath: string, resolutionResults: any[]): Promise<void> {
        try {
            let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

            for (const result of resolutionResults) {
                const bandwidth = parseInt(result.bitrate.replace('k', '')) * 1000;
                const { width, height } = this.parseResolution(result.resolution);

                masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${height}\n`;
                masterPlaylist += `${result.resolution}/playlist.m3u8\n\n`;
            }

            const fs = require('fs');
            fs.writeFileSync(masterPlaylistPath, masterPlaylist);

            this.logOperation('master_playlist_created', { masterPlaylistPath });
        } catch (error) {
            this.logError('create_master_playlist', error, { masterPlaylistPath });
        }
    }

    private logOperation(operation: string, data: any): void {
        console.log(`[${this.serviceName}] ${operation}:`, data);
    }

    private logError(operation: string, error: any, context: any): void {
        console.error(`[${this.serviceName}] Error in ${operation}:`, error, context);
    }
}

// Initialize FFmpeg video processor
const videoProcessor = new FFmpegVideoProcessor();

// Course Video Processing Worker Processor - Creates individual video jobs
const courseVideoProcessingProcessor = async (job: Job<CourseVideoProcessingJobData>) => {
    const { courseId, processingOptions } = job.data;

    console.log(`🎬 Processing all videos for course ${courseId}`);
    console.log(`📋 Processing options:`, processingOptions);

    try {
        // Fetch all video content for the course
        const coursesRepository = new CoursesRepository();
        const contents = await coursesRepository.getContentsByCourseId(courseId);

        // Filter only video content
        const videoContents = contents.filter(content =>
            content.type === ContentType.VIDEO &&
            content.url &&
            content.is_active
        );

        if (videoContents.length === 0) {
            console.log(`⚠️ No active video content found for course ${courseId}`);
            return {
                success: true,
                courseId,
                videosProcessed: 0,
                message: 'No active video content found'
            };
        }

        console.log(`📹 Found ${videoContents.length} videos to process for course ${courseId}`);

        // Create individual video processing jobs in parallel
        const videoJobPromises = videoContents.map(async (videoContent) => {
            const videoJobData: VideoProcessingJobData = {
                courseId,
                videoId: videoContent.id,
                videoUrl: videoContent.url!,
                processingOptions,
                metadata: {
                    originalFileName: basename(videoContent.url!),
                    fileSize: 0, // Will be populated by the worker
                    duration: videoContent.duration || 0,
                    uploadedBy: 'system',
                    uploadedAt: videoContent.created_at.toISOString()
                }
            };

            // Add individual video processing job
            return await bullMQManager.addJob(
                QUEUE_NAMES.VIDEO_PROCESSING,
                JOB_TYPES.VIDEO_PROCESSING.PROCESS_VIDEO,
                videoJobData,
                {
                    priority: 1,
                    attempts: 3,
                    removeOnComplete: 10,
                    removeOnFail: 5
                }
            );
        });

        // Wait for all video jobs to be created
        const videoJobs = await Promise.all(videoJobPromises);

        console.log(`✅ Created ${videoJobs.length} individual video processing jobs for course ${courseId}`);

        return {
            success: true,
            courseId,
            videosProcessed: videoJobs.length,
            jobIds: videoJobs.map(job => job.id)
        };

    } catch (error) {
        console.error(`❌ Error processing course videos for course ${courseId}:`, error);
        throw error;
    }
};

// Individual Video Processing Worker Processor
const videoProcessingProcessor = async (job: Job<VideoProcessingJobData>) => {
    const { courseId, videoId, videoUrl, processingOptions, metadata } = job.data;

    console.log(`🎬 Processing video ${videoId} for course ${courseId}: ${videoUrl}`);

    const tempDir = join(tmpdir(), 'video-processing', `course-${courseId}-video-${videoId}-${Date.now()}`);
    let inputPath: string | null = null;
    let outputDir: string | null = null;

    try {
        // Create temporary directories
        mkdirSync(tempDir, { recursive: true });
        outputDir = join(tempDir, 'output');
        mkdirSync(outputDir, { recursive: true });

        // Download video from S3 raw-videos bucket
        console.log(`📥 Downloading video from S3: ${videoUrl}`);
        const videoBuffer = await downloadFile({
            bucket: 'RAW_VIDEOS',
            key: videoUrl
        });

        // Save video to temporary file
        const inputFileName = basename(videoUrl);
        inputPath = join(tempDir, inputFileName);
        require('fs').writeFileSync(inputPath, videoBuffer);

        console.log(`✅ Video downloaded to: ${inputPath}`);

        // Check if FFmpeg is available
        const isFFmpegAvailable = await videoProcessor.isAvailable();
        if (!isFFmpegAvailable) {
            throw new Error('FFmpeg is not available on this system');
        }

        // Process video to HLS format with multiple resolutions
        const resolutions = ['360p', '480p', '720p'];
        console.log(`🔄 Starting HLS transcoding for video ${videoId}...`);

        const result = await videoProcessor.transcodeToHLS(
            inputPath,
            outputDir,
            resolutions,
            10 // 10 second segments
        );

        if (!result.success) {
            throw new Error(result.error || 'HLS transcoding failed');
        }

        console.log(`✅ HLS transcoding completed successfully for video ${videoId}`);
        console.log(`📊 Resolutions processed: ${result.resolutions?.length || 0}`);

        // Upload processed video files to S3 in parallel
        const uploadPromises: Promise<void>[] = [];

        // Upload resolution directories and master playlist
        if (result.resolutions && result.resolutions.length > 0) {
            for (const resolutionResult of result.resolutions) {
                const resolutionDir = join(outputDir, resolutionResult.resolution);
                const uploadPromise = uploadResolutionDirectory(
                    resolutionDir,
                    courseId,
                    videoId,
                    resolutionResult.resolution,
                    resolutionResult.segmentFiles
                );
                uploadPromises.push(uploadPromise);
            }

            // Upload master playlist
            if (result.masterPlaylist) {
                const masterUploadPromise = uploadMasterPlaylist(
                    result.masterPlaylist,
                    courseId,
                    videoId
                );
                uploadPromises.push(masterUploadPromise);
            }
        }

        // Generate and upload thumbnail if requested
        if (processingOptions.thumbnailGeneration) {
            const thumbnailPromise = generateAndUploadThumbnail(
                inputPath,
                courseId,
                videoId,
                metadata
            );
            uploadPromises.push(thumbnailPromise);
        }

        // Wait for all uploads to complete in parallel
        await Promise.all(uploadPromises);

        // Update job progress
        await job.updateProgress(100);

        console.log(`🎉 Video processing completed successfully for video ${videoId} in course ${courseId}`);

        return {
            success: true,
            courseId,
            videoId,
            resolutionsProcessed: result.resolutions?.length || 0,
            metadata: result.metadata
        };

    } catch (error) {
        console.error(`❌ Error processing video ${videoId} for course ${courseId}:`, error);

        // Update job progress to indicate failure
        await job.updateProgress(0);

        throw error;
    } finally {
        // Clean up temporary files
        await cleanupTempFiles(inputPath, outputDir, tempDir, courseId, videoId);
    }
};

// Helper function to upload resolution directory
async function uploadResolutionDirectory(
    resolutionDir: string,
    courseId: number,
    videoId: number,
    resolution: string,
    segmentFiles: string[]
): Promise<void> {
    try {
        console.log(`📤 Uploading ${resolution} resolution files for video ${videoId}...`);

        // Upload playlist file
        const playlistPath = join(resolutionDir, 'playlist.m3u8');
        if (existsSync(playlistPath)) {
            const playlistBuffer = readFileSync(playlistPath);
            const playlistKey = `${courseId}/${videoId}/${resolution}/playlist.m3u8`;

            await uploadFile({
                bucket: 'PROCESSED_VIDEOS',
                key: playlistKey,
                body: playlistBuffer,
                contentType: 'application/vnd.apple.mpegurl',
                metadata: {
                    courseId: courseId.toString(),
                    videoId: videoId.toString(),
                    resolution,
                    fileType: 'playlist'
                }
            });
        }

        // Upload segment files
        for (const segmentFile of segmentFiles) {
            const segmentBuffer = readFileSync(segmentFile);
            const segmentFileName = basename(segmentFile);
            const segmentKey = `${courseId}/${videoId}/${resolution}/${segmentFileName}`;

            await uploadFile({
                bucket: 'PROCESSED_VIDEOS',
                key: segmentKey,
                body: segmentBuffer,
                contentType: 'video/mp2t',
                metadata: {
                    courseId: courseId.toString(),
                    videoId: videoId.toString(),
                    resolution,
                    fileType: 'segment'
                }
            });
        }

        console.log(`✅ ${resolution} resolution files uploaded for video ${videoId}`);
    } catch (error) {
        console.error(`❌ Error uploading ${resolution} resolution files:`, error);
        throw error;
    }
}

// Helper function to upload master playlist
async function uploadMasterPlaylist(
    masterPlaylistPath: string,
    courseId: number,
    videoId: number
): Promise<void> {
    try {
        console.log(`📤 Uploading master playlist for video ${videoId}...`);

        const playlistBuffer = readFileSync(masterPlaylistPath);
        const playlistKey = `${courseId}/${videoId}/master.m3u8`;

        await uploadFile({
            bucket: 'PROCESSED_VIDEOS',
            key: playlistKey,
            body: playlistBuffer,
            contentType: 'application/vnd.apple.mpegurl',
            metadata: {
                courseId: courseId.toString(),
                videoId: videoId.toString(),
                fileType: 'master_playlist'
            }
        });

        console.log(`✅ Master playlist uploaded for video ${videoId}`);
    } catch (error) {
        console.error(`❌ Error uploading master playlist:`, error);
        throw error;
    }
}

// Helper function to generate and upload thumbnail
async function generateAndUploadThumbnail(
    videoPath: string,
    courseId: number,
    videoId: number,
    metadata: any
): Promise<void> {
    try {
        console.log(`🖼️ Generating thumbnail for video ${videoId}...`);

        const tempDir = join(tmpdir(), 'thumbnails', `video-${videoId}`);
        mkdirSync(tempDir, { recursive: true });

        const thumbnailPath = join(tempDir, 'thumbnail.webp');
        const command = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${thumbnailPath}" -y`;

        await execAsync(command);

        if (existsSync(thumbnailPath)) {
            const thumbnailBuffer = readFileSync(thumbnailPath);
            const thumbnailKey = `${courseId}/${videoId}/Thumbnail.webp`;

            await uploadFile({
                bucket: 'PROCESSED_VIDEOS',
                key: thumbnailKey,
                body: thumbnailBuffer,
                contentType: 'image/webp',
                metadata: {
                    courseId: courseId.toString(),
                    videoId: videoId.toString(),
                    thumbnailType: 'video_thumbnail',
                    uploadedAt: new Date().toISOString()
                }
            });

            console.log(`✅ Thumbnail uploaded for video ${videoId}`);
        }

        // Clean up thumbnail temp directory
        const fs = require('fs');
        fs.rmdirSync(tempDir, { recursive: true });
    } catch (error) {
        console.error(`❌ Error generating/uploading thumbnail:`, error);
        throw error;
    }
}

// Helper function to clean up temporary files
async function cleanupTempFiles(
    inputPath: string | null,
    outputDir: string | null,
    tempDir: string | null,
    courseId: number,
    videoId: number
): Promise<void> {
    try {
        if (inputPath && existsSync(inputPath)) {
            unlinkSync(inputPath);
        }

        if (outputDir && existsSync(outputDir)) {
            const fs = require('fs');
            const files = fs.readdirSync(outputDir);
            for (const file of files) {
                const filePath = join(outputDir, file);
                if (existsSync(filePath)) {
                    if (fs.statSync(filePath).isDirectory()) {
                        fs.rmdirSync(filePath, { recursive: true });
                    } else {
                        unlinkSync(filePath);
                    }
                }
            }
            fs.rmdirSync(outputDir);
        }

        if (tempDir && existsSync(tempDir)) {
            const fs = require('fs');
            fs.rmdirSync(tempDir, { recursive: true });
        }

        console.log(`🧹 Cleaned up temporary files for video ${videoId} in course ${courseId}`);
    } catch (cleanupError) {
        console.error(`⚠️ Error cleaning up temporary files:`, cleanupError);
    }
}

// Initialize Video Processing Workers
export function initializeVideoProcessingWorker(): void {
    console.log('🎬 Initializing Video Processing workers...');

    // Create course video processing worker (creates individual video jobs)
    bullMQManager.createWorker(QUEUE_NAMES.VIDEO_PROCESSING, courseVideoProcessingProcessor, {
        concurrency: 2 // Lower concurrency for course-level processing
    });

    // Create individual video processing worker (processes individual videos)
    bullMQManager.createWorker(QUEUE_NAMES.VIDEO_PROCESSING, videoProcessingProcessor, {
        concurrency: 3 // Higher concurrency for individual video processing
    });

    console.log('✅ Video Processing workers initialized with parallel processing support');
}
