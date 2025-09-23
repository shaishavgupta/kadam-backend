/**
 * AWS S3 Configuration and Functions
 *
 * This module provides S3 connection settings and utility functions
 * for file uploads, downloads, and management operations.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../config';

// S3 Client Configuration
const s3Client = new S3Client({
    region: config.AWS_REGION,
    credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    },
});

// S3 Bucket Names
export const S3_BUCKETS = {
    COURSES: config.AWS_S3_COURSES_BUCKET,
    RAW_VIDEOS: config.AWS_S3_RAW_VIDEOS_BUCKET,
    PROCESSED_VIDEOS: config.AWS_S3_PROCESSED_VIDEOS_BUCKET,
} as const;

// File Upload Types
export interface UploadFileParams {
    bucket: keyof typeof S3_BUCKETS;
    key: string;
    body: Buffer | Uint8Array | string;
    contentType?: string;
    metadata?: Record<string, string>;
}

// File Download Types
export interface DownloadFileParams {
    bucket: keyof typeof S3_BUCKETS;
    key: string;
}

// Presigned URL Types
export interface PresignedUrlParams {
    bucket: keyof typeof S3_BUCKETS;
    key: string;
    expiresIn?: number; // seconds
    operation?: 'getObject' | 'putObject';
}

/**
 * Upload a file to S3
 */
export async function uploadFile(params: UploadFileParams): Promise<string> {
    try {
        const bucketName = S3_BUCKETS[params.bucket];

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: params.key,
            Body: params.body,
            ContentType: params.contentType || 'application/octet-stream',
            Metadata: params.metadata || {},
        });

        await s3Client.send(command);

        const fileUrl = `https://${bucketName}.s3.${config.AWS_REGION}.amazonaws.com/${params.key}`;
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
        const bucketName = S3_BUCKETS[params.bucket];

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: params.key,
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
        console.log(`✅ File downloaded successfully: ${params.key}`);

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
        const bucketName = S3_BUCKETS[params.bucket];

        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: params.key,
        });

        await s3Client.send(command);
        console.log(`✅ File deleted successfully: ${params.key}`);
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
        const bucketName = S3_BUCKETS[params.bucket];
        const expiresIn = params.expiresIn || 3600; // Default 1 hour

        const command = params.operation === 'putObject'
            ? new PutObjectCommand({
                Bucket: bucketName,
                Key: params.key,
            })
            : new GetObjectCommand({
                Bucket: bucketName,
                Key: params.key,
            });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        console.log(`✅ Presigned URL generated: ${params.key}`);

        return presignedUrl;
    } catch (error) {
        console.error('❌ Error generating presigned URL:', error);
        throw error;
    }
}

/**
 * List files in a bucket with optional prefix
 */
export async function listFiles(bucket: keyof typeof S3_BUCKETS, prefix?: string): Promise<string[]> {
    try {
        const bucketName = S3_BUCKETS[bucket];

        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
        });

        const response = await s3Client.send(command);

        const files = response.Contents?.map((obj: any) => obj.Key || '') || [];
        console.log(`✅ Listed ${files.length} files from bucket: ${bucketName}`);

        return files;
    } catch (error) {
        console.error('❌ Error listing files from S3:', error);
        throw error;
    }
}

/**
 * Upload course content (images, documents, etc.)
 */
export async function uploadCourseContent(
    courseId: number,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string
): Promise<string> {
    const key = `courses/${courseId}/${fileName}`;

    return uploadFile({
        bucket: 'COURSES',
        key,
        body: fileBuffer,
        contentType,
        metadata: {
            courseId: courseId.toString(),
            uploadedAt: new Date().toISOString(),
        },
    });
}

/**
 * Upload raw video file
 */
export async function uploadRawVideo(
    courseId: number,
    fileName: string,
    videoBuffer: Buffer
): Promise<string> {
    const key = `raw-videos/${courseId}/${fileName}`;

    return uploadFile({
        bucket: 'RAW_VIDEOS',
        key,
        body: videoBuffer,
        contentType: 'video/mp4',
        metadata: {
            courseId: courseId.toString(),
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
    fileName: string,
    videoBuffer: Buffer
): Promise<string> {
    const key = `processed-videos/${courseId}/${fileName}`;

    return uploadFile({
        bucket: 'PROCESSED_VIDEOS',
        key,
        body: videoBuffer,
        contentType: 'video/mp4',
        metadata: {
            courseId: courseId.toString(),
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
    fileName: string,
    expiresIn: number = 3600
): Promise<string> {
    const key = `raw-videos/${courseId}/${fileName}`;

    return generatePresignedUrl({
        bucket: 'RAW_VIDEOS',
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
    fileName: string,
    expiresIn: number = 3600
): Promise<string> {
    const key = `processed-videos/${courseId}/${fileName}`;

    return generatePresignedUrl({
        bucket: 'PROCESSED_VIDEOS',
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
        config.AWS_S3_COURSES_BUCKET &&
        config.AWS_S3_RAW_VIDEOS_BUCKET &&
        config.AWS_S3_PROCESSED_VIDEOS_BUCKET
    );
}

/**
 * Get S3 configuration status
 */
export function getS3Status() {
    return {
        configured: isS3Configured(),
        region: config.AWS_REGION,
        buckets: {
            courses: config.AWS_S3_COURSES_BUCKET,
            rawVideos: config.AWS_S3_RAW_VIDEOS_BUCKET,
            processedVideos: config.AWS_S3_PROCESSED_VIDEOS_BUCKET,
        },
    };
}

// Export the S3 client for advanced usage
export { s3Client };
