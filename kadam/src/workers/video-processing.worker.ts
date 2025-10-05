import { Job } from 'bullmq';
import { bullMQManager, QUEUE_NAMES, VideoProcessingJobData, CourseVideoProcessingJobData, JOB_TYPES } from '../infra';
import { downloadFile, generateMasterPlaylistKey, uploadFile } from '../infra/aws/s3';
import { existsSync, mkdirSync, readFileSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CoursesService } from '../service/courses.service';
import { ContentWithModule } from '../schemas/course';
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


            const processingTime = Date.now() - startTime;
            const totalOutputSize = this.calculateTotalSize(outputFiles.map(f => f.path));

            const result: TranscodingResult = {
                success: true,
                outputFiles,
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
            '144p': { width: 256, height: 144 },
            '240p': { width: 426, height: 240 },
            '360p': { width: 640, height: 360 },
            '480p': { width: 854, height: 480 },
            '720p': { width: 1280, height: 720 },
            '1080p': { width: 1920, height: 1080 },
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

        // Resolution with aspect ratio preservation for portrait videos
        const { height } = this.parseResolution(format.resolution);
        parts.push('-vf', `"scale=-2:${height}"`); // Height-based scaling for portrait videos (9:16)

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
        segmentDuration: number,
        fps: number = 30 // default to 30fps if not provided
    ): string {
        const { height } = this.parseResolution(resolution);

        // Calculate bufsize as twice the bitrate
        const numericBitrate = parseInt(bitrate.replace('k', ''));
        const bufsize = `${numericBitrate * 2}k`;

        const parts = [
            this.ffmpegPath,
            '-i', `"${inputPath}"`,

            // Video settings
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',

            // Scale preserving aspect ratio, width divisible by 2
            '-vf', `"scale=trunc(oh*a/2)*2:${height}"`,
            '-pix_fmt', 'yuv420p',

            // Bitrate settings
            '-b:v', bitrate,
            '-maxrate', bitrate,
            '-bufsize', bufsize,

            // Audio settings
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ar', '44100',

            // HLS settings
            '-f', 'hls',
            '-hls_time', segmentDuration.toString(),
            '-hls_list_size', '0',
            '-hls_segment_filename', `"${segmentPattern}"`,

            // Keyframe interval matching segment duration
            '-g', (segmentDuration * fps).toString(),
            '-keyint_min', (segmentDuration * fps).toString(),
            '-sc_threshold', '0',

            // Output playlist
            `"${playlistPath}"`,

            // Overwrite existing files
            '-y'
        ];

        return parts.join(' ');
    }


    private getBitrateForResolution(resolution: string): string {
        const bitrateMap: { [key: string]: string } = {
            '144p': '300k',
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

// Course Video Processing Worker Processor - Processes single content
const courseVideoProcessingProcessor = async (job: Job<CourseVideoProcessingJobData>) => {
    const { courseId, moduleId, contentId, processingOptions } = job.data;

    console.log(`🎬 Processing single content ${contentId} for course ${courseId}`);

    try {
        const coursesService = new CoursesService();

        // Get the specific content to process
        const content = await coursesService.getContentById(contentId);
        if (!content) {
            console.log(`⚠️ Content ${contentId} not found`);
            return {
                success: false,
                courseId,
                contentId,
                videosProcessed: 0,
                message: 'Content not found'
            };
        }

        // Verify content belongs to the specified module and course
        if (content.module_id !== moduleId || content.course_id !== courseId) {
            console.log(`⚠️ Content ${contentId} does not belong to module ${moduleId} or course ${courseId}`);
            return {
                success: false,
                courseId,
                contentId,
                videosProcessed: 0,
                message: 'Content does not belong to specified module/course'
            };
        }

        // Get all contents for the course to find the specific content with full details
        const contents = await coursesService.getContentsByCourseId(courseId);
        const targetContent = contents.find(c => c.id === contentId);

        if (!targetContent) {
            console.log(`⚠️ Content ${contentId} not found in course contents`);
            return {
                success: false,
                courseId,
                contentId,
                videosProcessed: 0,
                message: 'Content not found in course'
            };
        }

        // Check if it's a video content
        if (targetContent.type !== ContentType.VIDEO || !targetContent.is_active) {
            console.log(`⚠️ Content ${contentId} is not an active video`);
            return {
                success: false,
                courseId,
                contentId,
                videosProcessed: 0,
                message: 'Content is not an active video'
            };
        }

        console.log(`📹 Processing video content ${contentId}: ${targetContent.name}`);

        // Create video processing job for the single content
        const videoJobData: VideoProcessingJobData = {
            courseId,
            videoId: targetContent.id,
            videoUrl: targetContent.url!,
            moduleId: targetContent.module_id!,
            processingOptions,
            metadata: {
                originalFileName: basename(targetContent.url!),
                fileSize: 0, // Will be populated by the worker
                duration: targetContent.duration || 0,
                uploadedBy: 'system',
                uploadedAt: targetContent.created_at
            }
        };

        // Add individual video processing job
        const videoJob = await bullMQManager.addJob(
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

        console.log(`✅ Created video processing job ${videoJob.id} for content ${contentId}`);

        return {
            success: true,
            courseId,
            contentId,
            videosProcessed: 1,
            jobId: videoJob.id
        };

    } catch (error) {
        console.error(`❌ Error processing content ${contentId} for course ${courseId}:`, error);
        throw error;
    }
};

// Individual Video Processing Worker Processor
const videoProcessingProcessor = async (job: Job<VideoProcessingJobData>) => {
    const { courseId, videoId, videoUrl, processingOptions, moduleId } = job.data;

    console.log(`🎬 Processing video ${videoId} for course ${courseId}: ${videoUrl} moduleId: ${moduleId}`);

    // Use current directory for temporary files instead of system temp
    const tempDir = join(process.cwd(), 'temp-video-processing', `course-${courseId}-video-${videoId}-${Date.now()}`);
    let inputPath: string | null = null;
    let outputDir: string | null = null;
    let actualDuration: number = 0; // Store the actual duration from FFprobe

    try {
        // Create temporary directories
        mkdirSync(tempDir, { recursive: true });
        outputDir = join(tempDir, 'output');
        mkdirSync(outputDir, { recursive: true });

        // Download video from S3 using logical path construction
        console.log(`📥 Downloading video from S3: ${videoUrl}`);

        // Construct S3 key using logical pattern: courseId/moduleId/contentId/video.mp4
        // First, we need to get the moduleId and contentId from the database
        const coursesService = new CoursesService();
        const content = await coursesService.getContentById(videoId);

        if (!content) {
            throw new Error(`Content with ID ${videoId} not found`);
        }

        const videoBuffer = await downloadFile({
            key: videoUrl
        });

        // Validate the downloaded buffer
        if (!videoBuffer || videoBuffer.length === 0) {
            throw new Error('Downloaded video buffer is empty or invalid');
        }

        console.log(`📊 Downloaded buffer size: ${videoBuffer.length} bytes`);

        // Save video to temporary file with proper extension
        const fileName = `video-${videoId}.mp4`;
        inputPath = join(tempDir, fileName);

        // Write file with proper error handling
        const fs = require('fs');
        fs.writeFileSync(inputPath, videoBuffer);

        // Validate the written file
        const stats = fs.statSync(inputPath);
        if (stats.size === 0) {
            throw new Error('Written video file is empty');
        }

        console.log(`✅ Video downloaded to: ${inputPath} (${stats.size} bytes)`);

        // Validate video file integrity with FFprobe
        try {
            console.log(`🔍 Validating video file integrity...`);
            const probeCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${inputPath}"`;
            const probeResult = await execAsync(probeCommand);
            const probeData = JSON.parse(probeResult.stdout);

            if (!probeData.format || !probeData.streams || probeData.streams.length === 0) {
                throw new Error('Video file appears to be corrupted or invalid');
            }

            // Store the actual duration from FFprobe
            actualDuration = parseFloat(probeData.format.duration) || 0;

            console.log(`✅ Video file validation passed - Duration: ${actualDuration}s, Format: ${probeData.format.format_name}`);
        } catch (probeError) {
            console.error(`❌ Video file validation failed:`, probeError);
            const errorMessage = probeError instanceof Error ? probeError.message : 'Unknown validation error';
            throw new Error(`Invalid video file: ${errorMessage}`);
        }

        // Check if FFmpeg is available
        const isFFmpegAvailable = await videoProcessor.isAvailable();
        if (!isFFmpegAvailable) {
            throw new Error('FFmpeg is not available on this system');
        }

        // Process video to HLS format with multiple resolutions
        const defaultResolutions = ['144p', '240p', '360p', '480p', '720p'];
        const resolutions = processingOptions?.resolutions || defaultResolutions;
        console.log(`🔄 Starting HLS transcoding for video ${videoId} with resolutions: ${resolutions.join(', ')}...`);

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
                    moduleId,
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
                    moduleId,
                    videoId
                );
                uploadPromises.push(masterUploadPromise);
            }
        }


        // Wait for all uploads to complete in parallel
        await Promise.all(uploadPromises);

        // Update job progress
        await job.updateProgress(100);

        console.log(`🎉 Video processing completed successfully for video ${videoId} in course ${courseId}`);

        // Update content with the master playlist URL and actual duration
        await coursesService.updateContent(videoId, {
            abs_url: generateMasterPlaylistKey(courseId, moduleId, videoId),
            duration: parseInt(actualDuration.toString())
        });

        console.log(`✅ Updated content ${videoId} with master playlist URL and duration: ${actualDuration}s`);
        return {
            success: true,
            courseId,
            videoId,
            duration: parseInt(actualDuration.toString()),
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
    moduleId: number,
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
            const contentId = videoId;
            const playlistKey = `${courseId}/${moduleId}/${contentId}/${resolution}/playlist.m3u8`;

            await uploadFile({
                prefix: 'processedVideos',
                key: playlistKey,
                body: playlistBuffer,
                contentType: 'application/vnd.apple.mpegurl',
                metadata: {
                    courseId: courseId.toString(),
                    moduleId: moduleId.toString(),
                    contentId: contentId.toString(),
                    resolution,
                    fileType: 'playlist'
                }
            });
        }

        // Upload segment files
        for (const segmentFile of segmentFiles) {
            const segmentBuffer = readFileSync(segmentFile);
            const segmentFileName = basename(segmentFile);
            const contentId = videoId;
            const segmentKey = `${courseId}/${moduleId}/${contentId}/${resolution}/${segmentFileName}`;

            await uploadFile({
                prefix: 'processedVideos',
                key: segmentKey,
                body: segmentBuffer,
                contentType: 'video/mp2t',
                metadata: {
                    courseId: courseId.toString(),
                    moduleId: moduleId.toString(),
                    contentId: contentId.toString(),
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
    moduleId: number,
    videoId: number
): Promise<void> {
    try {
        console.log(`📤 Uploading master playlist for video ${videoId}...`);

        const playlistBuffer = readFileSync(masterPlaylistPath);
        const contentId = videoId;
        const playlistKey = generateMasterPlaylistKey(courseId, moduleId, videoId);

        await uploadFile({
            prefix: 'processedVideos',
            key: playlistKey,
            body: playlistBuffer,
            contentType: 'application/vnd.apple.mpegurl',
            metadata: {
                courseId: courseId.toString(),
                moduleId: moduleId.toString(),
                contentId: contentId.toString(),
                fileType: 'master_playlist'
            }
        });

        console.log(`✅ Master playlist uploaded for video ${videoId}`);
    } catch (error) {
        console.error(`❌ Error uploading master playlist:`, error);
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
        const fs = require('fs');

        // Clean up input file
        if (inputPath && fs.existsSync(inputPath)) {
            try {
                fs.unlinkSync(inputPath);
                console.log(`🗑️ Cleaned up input file: ${inputPath}`);
            } catch (error) {
                console.warn(`⚠️ Could not delete input file ${inputPath}:`, error);
            }
        }

        // Clean up output directory
        if (outputDir && fs.existsSync(outputDir)) {
            try {
                const files = fs.readdirSync(outputDir);
                for (const file of files) {
                    const filePath = join(outputDir, file);
                    if (fs.existsSync(filePath)) {
                        const stat = fs.statSync(filePath);
                        if (stat.isDirectory()) {
                            fs.rmSync(filePath, { recursive: true, force: true });
                        } else {
                            fs.unlinkSync(filePath);
                        }
                    }
                }
                fs.rmdirSync(outputDir);
                console.log(`🗑️ Cleaned up output directory: ${outputDir}`);
            } catch (error) {
                console.warn(`⚠️ Could not clean output directory ${outputDir}:`, error);
            }
        }

        // Clean up temp directory
        if (tempDir && fs.existsSync(tempDir)) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
                console.log(`🗑️ Cleaned up temp directory: ${tempDir}`);
            } catch (error) {
                console.warn(`⚠️ Could not clean temp directory ${tempDir}:`, error);
            }
        }

        console.log(`🧹 Cleaned up temporary files for video ${videoId} in course ${courseId}`);
    } catch (cleanupError) {
        console.error(`⚠️ Error cleaning up temporary files:`, cleanupError);
    }
}

// Initialize Video Processing Workers
export function initializeVideoProcessingWorker(): void {
    console.log('🎬 Initializing Video Processing workers...');

    // Create worker that handles both course-level and individual video processing
    // Job processor will route based on job type
    const videoWorkerProcessor = async (job: Job<VideoProcessingJobData | CourseVideoProcessingJobData>) => {
        if (job.name === JOB_TYPES.VIDEO_PROCESSING.PROCESS_COURSE_VIDEOS) {
            return courseVideoProcessingProcessor(job as Job<CourseVideoProcessingJobData>);
        } else if (job.name === JOB_TYPES.VIDEO_PROCESSING.PROCESS_VIDEO) {
            return videoProcessingProcessor(job as Job<VideoProcessingJobData>);
        } else {
            throw new Error(`Unknown video processing job type: ${job.name}`);
        }
    };

    bullMQManager.createWorker(QUEUE_NAMES.VIDEO_PROCESSING, videoWorkerProcessor, {
        concurrency: 3 // Balanced concurrency for video processing
    });

    console.log('✅ Video Processing worker initialized with parallel processing support');
}
