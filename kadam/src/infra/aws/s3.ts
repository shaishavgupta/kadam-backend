/**
 * AWS S3 Configuration and Functions
 *
 * This module provides S3 connection settings and utility functions
 * for file uploads, downloads, and management operations.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config, awsConfig } from '../../config';

console.log('AWS Region:', config.AWS_REGION);
console.log('AWS Access Key ID:', config.AWS_ACCESS_KEY_ID);
console.log('AWS Secret Access Key:', config.AWS_SECRET_ACCESS_KEY);
console.log('AWS S3 Courses Bucket:', awsConfig.s3.coursesBucket);
console.log('AWS S3 Prefixes:', awsConfig.s3.prefixes);

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

// Helper functions for generating S3 keys based on new hierarchical structure
export function generateCourseThumbnailKey(courseId: number, fileName: string): string {
    return `${S3_CONFIG.PREFIXES.rawVideos}/${courseId}/Thumbnail.${fileName.split('.').pop()}`;
}

export function generateModuleThumbnailKey(courseId: number, moduleId: number, fileName: string): string {
    return `${S3_CONFIG.PREFIXES.rawVideos}/${courseId}/${moduleId}/Thumbnail.${fileName.split('.').pop()}`;
}

export function generateContentVideoKey(courseId: number, moduleId: number, contentId: number, fileName: string): string {
    return `${S3_CONFIG.PREFIXES.rawVideos}/${courseId}/${moduleId}/${contentId}/Video.${fileName.split('.').pop()}`;
}

export function generateContentThumbnailKey(courseId: number, moduleId: number, contentId: number, fileName: string): string {
    return `${S3_CONFIG.PREFIXES.rawVideos}/${courseId}/${moduleId}/${contentId}/Thumbnail.${fileName.split('.').pop()}`;
}

export function generateProcessedVideoKey(courseId: number, moduleId: number, contentId: number, resolution: string, fileName: string): string {
    return `${S3_CONFIG.PREFIXES.processedVideos}/${courseId}/${moduleId}/${contentId}/${resolution}/${fileName}`;
}

export function generateMasterPlaylistKey(courseId: number, moduleId: number, contentId: number): string {
    return `${S3_CONFIG.PREFIXES.processedVideos}/${courseId}/${moduleId}/${contentId}/master.m3u8`;
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
    prefix: keyof typeof S3_CONFIG.PREFIXES;
    key: string;
}

// Presigned URL Types
export interface PresignedUrlParams {
    prefix: keyof typeof S3_CONFIG.PREFIXES;
    key: string;
    expiresIn?: number; // seconds
    operation?: 'getObject' | 'putObject';
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
        const prefix = S3_CONFIG.PREFIXES[params.prefix];
        const fullKey = `${prefix}/${params.key}`;

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
        const prefix = S3_CONFIG.PREFIXES[params.prefix];
        const fullKey = `${prefix}/${params.key}`;

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

        const command = params.operation === 'putObject'
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
    fileName: string,
    videoBuffer: Buffer
): Promise<string> {
    const key = generateContentVideoKey(courseId, moduleId, contentId, fileName);

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
    fileName: string,
    expiresIn: number = 3600
): Promise<string> {
    const key = generateContentVideoKey(courseId, moduleId, contentId, fileName);

    return generatePresignedUrl({
        prefix: 'rawVideos',
        key,
        expiresIn,
        operation: 'putObject',
    });
}

/**
 * Generate presigned URL for video download
 */
export async function generateVideoDownloadUrl(
    courseId: number,
    moduleId: number,
    contentId: number,
    fileName: string,
    expiresIn: number = 3600
): Promise<string> {
    const key = generateProcessedVideoKey(courseId, moduleId, contentId, 'master', fileName);

    return generatePresignedUrl({
        prefix: 'processedVideos',
        key,
        expiresIn,
        operation: 'getObject',
    });
}

/**
 * Generate presigned URL for thumbnail upload
 */
export async function generateThumbnailUploadUrl(
    courseId: number,
    moduleId: number | null,
    contentId: number | null,
    fileName: string,
    expiresIn: number = 3600
): Promise<string> {
    let key: string;
    if (contentId && moduleId) {
        key = generateContentThumbnailKey(courseId, moduleId, contentId, fileName);
    } else if (moduleId) {
        key = generateModuleThumbnailKey(courseId, moduleId, fileName);
    } else {
        key = generateCourseThumbnailKey(courseId, fileName);
    }

    return generatePresignedUrl({
        prefix: 'rawVideos',
        key,
        expiresIn,
        operation: 'putObject',
    });
}

/**
 * Generate presigned URL for thumbnail download
 */
export async function generateThumbnailDownloadUrl(
    courseId: number,
    moduleId: number | null,
    contentId: number | null,
    fileName: string,
    expiresIn: number = 3600
): Promise<string> {
    let key: string;
    if (contentId && moduleId) {
        key = generateContentThumbnailKey(courseId, moduleId, contentId, fileName);
    } else if (moduleId) {
        key = generateModuleThumbnailKey(courseId, moduleId, fileName);
    } else {
        key = generateCourseThumbnailKey(courseId, fileName);
    }

    return generatePresignedUrl({
        prefix: 'rawVideos',
        key,
        expiresIn,
        operation: 'getObject',
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
