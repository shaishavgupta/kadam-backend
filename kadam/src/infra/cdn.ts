/**
 * CDN Cache Invalidation Service
 *
 * This module provides CDN cache invalidation functionality for CloudFront
 * to ensure that updated media files (thumbnails, videos) are served fresh
 * to users immediately after updates.
 */

import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { config } from '../config';

// CloudFront Client Configuration
const cloudFrontClient = new CloudFrontClient({
    region: config.AWS_REGION,
    credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    },
});

// CloudFront Distribution ID from environment
const DISTRIBUTION_ID = config.AWS_CLOUDFRONT_DISTRIBUTION_ID;

export interface CDNInvalidationParams {
    paths: string[];
    callerReference?: string;
}

export interface CDNInvalidationResult {
    invalidationId: string;
    status: string;
    paths: string[];
}

/**
 * Invalidate CDN cache for specific paths
 *
 * @param params - Invalidation parameters
 * @returns Promise with invalidation result
 */
export async function invalidateCDNCache(params: CDNInvalidationParams): Promise<CDNInvalidationResult> {
    try {
        if (!DISTRIBUTION_ID) {
            console.warn('⚠️ CloudFront Distribution ID not configured, skipping CDN invalidation');
            return {
                invalidationId: 'no-distribution',
                status: 'skipped',
                paths: params.paths
            };
        }

        const callerReference = params.callerReference || `invalidation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const command = new CreateInvalidationCommand({
            DistributionId: DISTRIBUTION_ID,
            InvalidationBatch: {
                CallerReference: callerReference,
                Paths: {
                    Quantity: params.paths.length,
                    Items: params.paths
                }
            }
        });

        const response = await cloudFrontClient.send(command);

        console.log(`✅ CDN cache invalidation initiated:`, {
            invalidationId: response.Invalidation?.Id,
            paths: params.paths,
            callerReference
        });

        return {
            invalidationId: response.Invalidation?.Id || 'unknown',
            status: response.Invalidation?.Status || 'unknown',
            paths: params.paths
        };
    } catch (error) {
        console.error('❌ Error invalidating CDN cache:', error);
        throw error;
    }
}

/**
 * Generate CDN paths for course-related media files
 *
 * @param courseId - Course ID
 * @param moduleId - Optional module ID
 * @param contentId - Optional content ID
 * @param fileType - Type of file (thumbnail or video)
 * @returns Array of CDN paths to invalidate
 */
export function generateCDNPaths(
    courseId: number,
    moduleId?: number,
    contentId?: number,
    fileType?: 'thumbnail' | 'video'
): string[] {
    const paths: string[] = [];
    const baseUrl = config.AWS_S3_CDN_BASE_URL;

    if (!baseUrl) {
        console.warn('⚠️ CDN Base URL not configured');
        return paths;
    }

    // Remove protocol and domain to get just the path
    const cdnPath = baseUrl.replace(/^https?:\/\/[^\/]+/, '');

    if (contentId && moduleId) {
        // Content level files
        if (fileType === 'video') {
            paths.push(`${cdnPath}/raw-videos/${courseId}/${moduleId}/${contentId}/Video.mp4`);
        } else if (fileType === 'thumbnail') {
            paths.push(`${cdnPath}/raw-videos/${courseId}/${moduleId}/${contentId}/Thumbnail.webp`);
        } else {
            // Both video and thumbnail
            paths.push(`${cdnPath}/raw-videos/${courseId}/${moduleId}/${contentId}/Video.mp4`);
            paths.push(`${cdnPath}/raw-videos/${courseId}/${moduleId}/${contentId}/Thumbnail.webp`);
        }
    } else if (moduleId) {
        // Module level thumbnail
        paths.push(`${cdnPath}/raw-videos/${courseId}/${moduleId}/Thumbnail.webp`);
    } else {
        // Course level thumbnail
        paths.push(`${cdnPath}/raw-videos/${courseId}/Thumbnail.webp`);
    }

    return paths;
}

/**
 * Invalidate CDN cache for course media files
 *
 * @param courseId - Course ID
 * @param moduleId - Optional module ID
 * @param contentId - Optional content ID
 * @param fileType - Type of file to invalidate
 * @returns Promise with invalidation result
 */
export async function invalidateCourseMediaCache(
    courseId: number,
    moduleId?: number,
    contentId?: number,
    fileType?: 'thumbnail' | 'video'
): Promise<CDNInvalidationResult> {
    const paths = generateCDNPaths(courseId, moduleId, contentId, fileType);

    if (paths.length === 0) {
        console.warn('⚠️ No CDN paths generated for invalidation');
        return {
            invalidationId: 'no-paths',
            status: 'skipped',
            paths: []
        };
    }

    return await invalidateCDNCache({
        paths,
        callerReference: `course-media-${courseId}-${moduleId || 'course'}-${contentId || 'module'}-${Date.now()}`
    });
}

/**
 * Invalidate CDN cache for multiple media files
 *
 * @param mediaFiles - Array of media file information
 * @returns Promise with invalidation result
 */
export async function invalidateMultipleMediaCache(
    mediaFiles: Array<{
        courseId: number;
        moduleId?: number;
        contentId?: number;
        fileType?: 'thumbnail' | 'video';
    }>
): Promise<CDNInvalidationResult> {
    const allPaths: string[] = [];

    for (const mediaFile of mediaFiles) {
        const paths = generateCDNPaths(
            mediaFile.courseId,
            mediaFile.moduleId,
            mediaFile.contentId,
            mediaFile.fileType
        );
        allPaths.push(...paths);
    }

    // Remove duplicates
    const uniquePaths = [...new Set(allPaths)];

    if (uniquePaths.length === 0) {
        console.warn('⚠️ No CDN paths generated for batch invalidation');
        return {
            invalidationId: 'no-paths',
            status: 'skipped',
            paths: []
        };
    }

    return await invalidateCDNCache({
        paths: uniquePaths,
        callerReference: `batch-media-${Date.now()}`
    });
}
