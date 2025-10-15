/**
 * AWS S3 Configuration and Functions
 *
 * This module provides S3 connection settings and utility functions
 * for file uploads, downloads, and management operations.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config, awsConfig } from '../../config';
import { FileType, S3Operation } from '../../shared/enums';

// S3 Client Configuration
const s3Client = new S3Client({
    region: config.AWS_REGION,
    credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    },
});

// S3 Bucket and Prefixes
export const S3_CONFIG = {
    BUCKET: awsConfig.s3.coursesBucket,
    PREFIXES: awsConfig.s3.prefixes,
} as const;

// Helper functions for generating S3 keys based on hierarchical structure
// Enforces: raw-videos/{courseId}/Thumbnail.webp | {moduleId}/Thumbnail.webp | {contentId}/Video.mp4 | {contentId}/Thumbnail.webp

export function generateCourseThumbnailKey(courseId: number): string {
    return `${courseId}/Thumbnail.webp`;
}

export function generateModuleThumbnailKey(courseId: number, moduleId: number): string {
    return `${courseId}/${moduleId}/Thumbnail.webp`;
}

export function generateContentVideoKey(courseId: number, moduleId: number, contentId: number): string {
    return `${courseId}/${moduleId}/${contentId}/Video.mp4`;
}

export function generateContentThumbnailKey(courseId: number, moduleId: number, contentId: number): string {
    return `${courseId}/${moduleId}/${contentId}/Thumbnail.webp`;
}

export function generateProcessedVideoKey(courseId: number, moduleId: number, contentId: number, resolution: string, fileName: string): string {
    return `${courseId}/${moduleId}/${contentId}/${resolution}/${fileName}`;
}

export function generateMasterPlaylistKey(courseId: number, moduleId: number, contentId: number): string {
    return `${courseId}/${moduleId}/${contentId}/master.m3u8`;
}

// File Upload Types
export interface UploadFileParams {
    prefix: keyof typeof S3_CONFIG.PREFIXES;
    key: string;
    body: Buffer | Uint8Array | string;
    contentType?: string;
    metadata?: Record<string, string>;
}

// File Download Types
export interface DownloadFileParams {
    prefix?: keyof typeof S3_CONFIG.PREFIXES;
    key: string;
}

// Presigned URL Types
export interface PresignedUrlParams {
    prefix: keyof typeof S3_CONFIG.PREFIXES;
    key: string;
    expiresIn?: number; // seconds
    operation?: S3Operation;
}

/**
 * Upload a file to S3
 */
export async function uploadFile(params: UploadFileParams): Promise<string> {
    try {
        const bucketName = S3_CONFIG.BUCKET;
        const prefix = S3_CONFIG.PREFIXES[params.prefix];
        const fullKey = `${prefix}/${params.key}`;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fullKey,
            Body: params.body,
            ContentType: params.contentType || 'application/octet-stream',
            Metadata: params.metadata || {},
        });

        await s3Client.send(command);

        const fileUrl = `https://${bucketName}.s3.${config.AWS_REGION}.amazonaws.com/${fullKey}`;
        console.log(`✅ File uploaded successfully: ${fileUrl}`);

        return fileUrl;
    } catch (error) {
        console.error('❌ Error uploading file to S3:', error);
        throw error;
    }
}

/**
 * Download a file from S3
 */
export async function downloadFile(params: DownloadFileParams): Promise<Buffer> {
    try {
        const bucketName = S3_CONFIG.BUCKET;
        let fullKey = '';
        if (params.prefix) {
            const prefix = S3_CONFIG.PREFIXES[params.prefix];
            fullKey = `${prefix}/${params.key}`;
        } else {
            fullKey = params.key;
        }

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fullKey,
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
            throw new Error('No file content received from S3');
        }

        const chunks: Uint8Array[] = [];
        const stream = response.Body as any;

        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);
        console.log(`✅ File downloaded successfully: ${fullKey}`);

        return buffer;
    } catch (error) {
        console.error('❌ Error downloading file from S3:', error);
        throw error;
    }
}

/**
 * Delete a file from S3
 */
export async function deleteFile(params: DownloadFileParams): Promise<void> {
    try {
        const bucketName = S3_CONFIG.BUCKET;
        let fullKey = '';
        if (params.prefix) {
            const prefix = S3_CONFIG.PREFIXES[params.prefix];
            fullKey = `${prefix}/${params.key}`;
        } else {
            fullKey = params.key;
        }

        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: fullKey,
        });

        await s3Client.send(command);
        console.log(`✅ File deleted successfully: ${fullKey}`);
    } catch (error) {
        console.error('❌ Error deleting file from S3:', error);
        throw error;
    }
}

/**
 * Generate a presigned URL for file access
 */
export async function generatePresignedUrl(params: PresignedUrlParams): Promise<string> {
    try {
        const bucketName = S3_CONFIG.BUCKET;
        const prefix = S3_CONFIG.PREFIXES[params.prefix];
        const fullKey = `${prefix}/${params.key}`;
        const expiresIn = params.expiresIn || 3600; // Default 1 hour

        const command = params.operation === S3Operation.PUT_OBJECT
            ? new PutObjectCommand({
                Bucket: bucketName,
                Key: fullKey,
                ContentType: 'video/mp4',
            })
            : new GetObjectCommand({
                Bucket: bucketName,
                Key: fullKey,
                ResponseContentType: 'video/mp4',
            });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        console.log(`✅ Presigned URL generated: ${fullKey}`);

        return presignedUrl;
    } catch (error) {
        console.error('❌ Error generating presigned URL:', error);
        throw error;
    }
}

/**
 * Unified presigned URL generation with hierarchical folder structure enforcement
 *
 * @param courseId - Required: Course ID
 * @param moduleId - Optional: Module ID (for module-level or content-level files)
 * @param contentId - Optional: Content ID (for content-level files)
 * @param fileType - Required: FileType.THUMBNAIL or FileType.VIDEO
 * @param operation - Required: S3Operation.PUT_OBJECT (upload) or S3Operation.GET_OBJECT (download)
 * @param expiresIn - Optional: URL expiration time in seconds (default: 3600)
 *
 * @returns Object containing presignedUrl and s3Key
 *
 * Folder structure enforced:
 * - Course thumbnail: raw-videos/{courseId}/Thumbnail.webp
 * - Module thumbnail: raw-videos/{courseId}/{moduleId}/Thumbnail.webp
 * - Content video: raw-videos/{courseId}/{moduleId}/{contentId}/Video.mp4
 * - Content thumbnail: raw-videos/{courseId}/{moduleId}/{contentId}/Thumbnail.webp
 */
export async function generateHierarchicalPresignedUrl(
    courseId: number,
    moduleId: number | undefined,
    contentId: number | undefined,
    fileType: FileType,
    operation: S3Operation,
    expiresIn: number = 3600
): Promise<{ presignedUrl: string; s3Key: string }> {
    try {
        // Input validation
        if (!courseId || courseId <= 0) {
            throw new Error('courseId is required and must be a positive number');
        }

        if (fileType !== FileType.THUMBNAIL && fileType !== FileType.VIDEO) {
            throw new Error(`fileType must be either "${FileType.THUMBNAIL}" or "${FileType.VIDEO}"`);
        }

        if (operation !== S3Operation.PUT_OBJECT && operation !== S3Operation.GET_OBJECT) {
            throw new Error(`operation must be either "${S3Operation.PUT_OBJECT}" or "${S3Operation.GET_OBJECT}"`);
        }

        // Validate hierarchical requirements
        if (fileType === FileType.VIDEO && (!moduleId)) {
            throw new Error('moduleId are required for video uploads');
        }

        if (moduleId && (!moduleId || moduleId <= 0)) {
            throw new Error('moduleId must be a positive number when provided');
        }

        // Generate S3 key based on hierarchy
        let s3Key: string;
        let contentType: string;

        if (contentId && moduleId) {
            // Content level: {courseId}/{moduleId}/{contentId}/Video.mp4 or Thumbnail.webp
            if (fileType === FileType.VIDEO) {
                s3Key = generateContentVideoKey(courseId, moduleId, contentId);
                contentType = 'video/mp4';
            } else {
                s3Key = generateContentThumbnailKey(courseId, moduleId, contentId);
                contentType = 'image/webp';
            }
        } else if (moduleId) {
            // Module level: {courseId}/{moduleId}/Thumbnail.webp
            if (fileType === FileType.VIDEO) {
                throw new Error('Video files are only allowed at content level (requires contentId)');
            }
            s3Key = generateModuleThumbnailKey(courseId, moduleId);
            contentType = 'image/webp';
        } else {
            // Course level: {courseId}/Thumbnail.webp
            if (fileType === FileType.VIDEO) {
                throw new Error('Video files are only allowed at content level (requires moduleId and contentId)');
            }
            s3Key = generateCourseThumbnailKey(courseId);
            contentType = 'image/webp';
        }

        // Generate presigned URL
        const bucketName = S3_CONFIG.BUCKET;
        const prefix = S3_CONFIG.PREFIXES.rawVideos;
        const fullKey = `${prefix}/${s3Key}`;

        const command = operation === S3Operation.PUT_OBJECT
            ? new PutObjectCommand({
                Bucket: bucketName,
                Key: fullKey,
                ContentType: contentType,
            })
            : new GetObjectCommand({
                Bucket: bucketName,
                Key: fullKey,
                ResponseContentType: contentType,
            });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });

        console.log(`✅ Hierarchical presigned URL generated: ${fullKey} (${operation})`);

        return {
            presignedUrl,
            s3Key: fullKey
        };
    } catch (error) {
        console.error('❌ Error generating hierarchical presigned URL:', error);
        throw error;
    }
}

/**
 * List files in a bucket with optional prefix
 */
export async function listFiles(prefix: keyof typeof S3_CONFIG.PREFIXES, subPrefix?: string): Promise<string[]> {
    try {
        const bucketName = S3_CONFIG.BUCKET;
        const basePrefix = S3_CONFIG.PREFIXES[prefix];
        const fullPrefix = subPrefix ? `${basePrefix}/${subPrefix}` : basePrefix;

        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: fullPrefix,
        });

        const response = await s3Client.send(command);

        const files = response.Contents?.map((obj: any) => obj.Key || '') || [];
        console.log(`✅ Listed ${files.length} files from prefix: ${fullPrefix}`);

        return files;
    } catch (error) {
        console.error('❌ Error listing files from S3:', error);
        throw error;
    }
}

/**
 * Upload raw video file
 */
export async function uploadRawVideo(
    courseId: number,
    moduleId: number,
    contentId: number,
    videoBuffer: Buffer
): Promise<string> {
    const key = generateContentVideoKey(courseId, moduleId, contentId);

    return uploadFile({
        prefix: 'rawVideos',
        key,
        body: videoBuffer,
        contentType: 'video/mp4',
        metadata: {
            courseId: courseId.toString(),
            moduleId: moduleId.toString(),
            contentId: contentId.toString(),
            uploadedAt: new Date().toISOString(),
            status: 'raw',
        },
    });
}

/**
 * Upload processed video file
 */
export async function uploadProcessedVideo(
    courseId: number,
    moduleId: number,
    contentId: number,
    fileName: string,
    videoBuffer: Buffer,
    resolution: string
): Promise<string> {
    const key = generateProcessedVideoKey(courseId, moduleId, contentId, resolution, fileName);

    return uploadFile({
        prefix: 'processedVideos',
        key,
        body: videoBuffer,
        contentType: 'video/mp4',
        metadata: {
            courseId: courseId.toString(),
            moduleId: moduleId.toString(),
            contentId: contentId.toString(),
            resolution,
            uploadedAt: new Date().toISOString(),
            status: 'processed',
        },
    });
}

/**
 * Generate presigned URL for video upload
 */
export async function generateVideoUploadUrl(
    courseId: number,
    moduleId: number,
    contentId: number,
    expiresIn: number = 3600
): Promise<string> {
    const key = generateContentVideoKey(courseId, moduleId, contentId);

    return generatePresignedUrl({
        prefix: 'rawVideos',
        key,
        expiresIn,
        operation: S3Operation.PUT_OBJECT,
    });
}

/**
 * Generate presigned URL for thumbnail upload
 */
export async function generateThumbnailUploadUrl(
    courseId: number,
    moduleId: number | null,
    contentId: number | null,
    expiresIn: number = 3600
): Promise<string> {
    let key: string;
    if (contentId && moduleId) {
        key = generateContentThumbnailKey(courseId, moduleId, contentId);
    } else if (moduleId) {
        key = generateModuleThumbnailKey(courseId, moduleId);
    } else {
        key = generateCourseThumbnailKey(courseId);
    }

    return generatePresignedUrl({
        prefix: 'rawVideos',
        key,
        expiresIn,
        operation: S3Operation.PUT_OBJECT,
    });
}

/**
 * Check if S3 is properly configured
 */
export function isS3Configured(): boolean {
    return !!(
        config.AWS_ACCESS_KEY_ID &&
        config.AWS_SECRET_ACCESS_KEY &&
        config.AWS_REGION &&
        config.AWS_S3_COURSES_BUCKET
    );
}

/**
 * Get S3 configuration status
 */
export function getS3Status() {
    return {
        configured: isS3Configured(),
        region: config.AWS_REGION,
        bucket: config.AWS_S3_COURSES_BUCKET,
        prefixes: S3_CONFIG.PREFIXES,
    };
}

// Export the S3 client for advanced usage
export { s3Client };
