import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { AdminService } from '../service/admin.service';
import {
    LoginPageContentResponseSchema,
    HomePageContentResponseSchema,
    LoginPageContentResponse,
    HomePageContentResponse,
    Banners,
    Categories,
    PresignedUrlRequestSchema,
    PresignedUrlResponseSchema,
    PresignedUrlRequest,
    PresignedUrlResponse,
    VideoProcessingRequestSchema,
    VideoProcessingResponseSchema,
    VideoProcessingRequest,
    VideoProcessingResponse
} from '../schemas/media';
import { AdminConfigurations } from '../shared/types';
import { CoursesService } from '../service/courses.service';
import { authMiddleware, AuthenticatedRequest, requireAdmin, requireUser } from '../shared/middleware/auth';
import {
    generatePresignedUrl,
    uploadRawVideo,
    uploadProcessedVideo,
    S3_CONFIG,
    generateVideoUploadUrl,
    generateVideoDownloadUrl,
    generateThumbnailUploadUrl,
    generateThumbnailDownloadUrl
} from '../infra/aws/s3';
import { bullMQManager, QUEUE_NAMES, JOB_TYPES, CourseVideoProcessingJobData } from '../infra/bullmq';

const adminService = new AdminService();
const coursesService = new CoursesService();

export default async function mediaRoutes(fastify: FastifyInstance) {

    fastify.get('/login-page-content', {
        schema: {
            tags: ['Media'],
            summary: 'Get login page content',
            description: 'Get background images and other content for the login page',
            response: {
                200: LoginPageContentResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<LoginPageContentResponse> => {
        try {
            const background = await adminService.getConfiguration(AdminConfigurations.loginPageBackground)

            return {
                success: true,
                data: {
                    background: background?.value || []
                },
                message: "Login page content retrieved successfully"
            };
        } catch (error) {
            return reply.status(500).send({
                success: false,
                message: "Internal server error"
            });
        }
    });

    // Register protected routes with auth middleware
    fastify.register(async function (fastify) {
        fastify.get('/home-page-content', {
            preHandler: [authMiddleware, requireUser],
            schema: {
                tags: ['Media'],
                summary: 'Get home page content',
                description: 'Get banners and other content for the home page',
                security: [{ bearerAuth: [] }],
                response: {
                    200: HomePageContentResponseSchema
                }
            }
        }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<HomePageContentResponse> => {
            try {
                const banners = await adminService.getConfiguration(AdminConfigurations.homePageBanners)
                const categories = await adminService.getConfiguration(AdminConfigurations.homePagePopularCategories)

                return {
                    success: true,
                    data: {
                        banners: (banners?.value as Banners[]) || [],
                        categories: (categories?.value as Categories[]) || [],
                    },
                    message: "Home page content retrieved successfully"
                };
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: "Internal server error"
                });
            }
        });

        // Generate presigned URL for S3 uploads
        fastify.post('/presigned-url', {
            preHandler: [authMiddleware, requireAdmin],
            schema: {
                tags: ['Media', 'Admin'],
                summary: 'Generate presigned URL for S3 upload',
                description: 'Generate a presigned URL for uploading files to S3 (Admin only)',
                security: [{ bearerAuth: [] }],
                body: PresignedUrlRequestSchema,
                response: {
                    200: PresignedUrlResponseSchema,
                    400: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    },
                    403: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    },
                    500: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    }
                }
            }
        }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<PresignedUrlResponse> => {
            try {
                const { fileName, contentType, courseId, fileType } = request.body as PresignedUrlRequest;

                // Validate course exists
                const course = await coursesService.getCourseById(courseId);
                if (!course) {
                    reply.status(400).send({
                        success: false,
                        message: 'Course not found'
                    });
                    return {
                        success: false,
                        data: {
                            presignedUrl: '',
                            fileKey: '',
                            expiresIn: 0
                        },
                        message: 'Course not found'
                    };
                }

                // Generate file key based on file type
                let fileKey: string;
                let prefix: keyof typeof S3_CONFIG.PREFIXES;

                switch (fileType) {
                    case 'raw-video':
                        fileKey = `${courseId}/${fileName}`;
                        prefix = 'rawVideos';
                        break;
                    case 'processed-video':
                        fileKey = `${courseId}/${fileName}`;
                        prefix = 'processedVideos';
                        break;
                    case 'thumbnail':
                        fileKey = `${courseId}/${fileName}`;
                        prefix = 'thumbnails';
                        break;
                    case 'certificate':
                        fileKey = `${courseId}/${fileName}`;
                        prefix = 'certificates';
                        break;
                    case 'course-material':
                        fileKey = `${courseId}/${fileName}`;
                        prefix = 'courseMaterials';
                        break;
                    default:
                        reply.status(400).send({
                            success: false,
                            message: 'Invalid file type'
                        });
                        return {
                            success: false,
                            data: {
                                presignedUrl: '',
                                fileKey: '',
                                expiresIn: 0
                            },
                            message: 'Invalid file type'
                        };
                }

                // Generate presigned URL (expires in 1 hour)
                const presignedUrl = await generatePresignedUrl({
                    prefix: prefix,
                    key: fileKey,
                    expiresIn: 3600,
                    operation: 'putObject'
                });

                return {
                    success: true,
                    data: {
                        presignedUrl,
                        fileKey,
                        expiresIn: 3600
                    },
                    message: 'Presigned URL generated successfully'
                };
            } catch (error) {
                console.error('Error generating presigned URL:', error);
                reply.status(500).send({
                    success: false,
                    message: 'Internal server error'
                });
                return {
                    success: false,
                    data: {
                        presignedUrl: '',
                        fileKey: '',
                        expiresIn: 0
                    },
                    message: 'Internal server error'
                };
            }
        });

        // Queue video processing job
        fastify.post('/video-processing', {
            preHandler: [authMiddleware, requireAdmin],
            schema: {
                tags: ['Media', 'Admin'],
                summary: 'Queue video processing job',
                description: 'Add a video processing job to the queue. The job will handle downloading from S3, processing, and uploading results back to S3 (Admin only)',
                security: [{ bearerAuth: [] }],
                body: VideoProcessingRequestSchema,
                response: {
                    200: VideoProcessingResponseSchema,
                    400: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    },
                    403: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    },
                    500: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    }
                }
            }
        }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<VideoProcessingResponse> => {
            try {
                const { courseId, processingOptions } = request.body as VideoProcessingRequest;

                // Validate course exists
                const course = await coursesService.getCourseById(courseId);
                if (!course) {
                    reply.status(400).send({
                        success: false,
                        message: 'Course not found'
                    });
                    return {
                        success: false,
                        data: {
                            videoJobId: '',
                            vectorJobId: '',
                            contentVectorJobId: '',
                            status: 'failed',
                            message: 'Course not found'
                        },
                        message: 'Course not found'
                    };
                }

                // Prepare job data for course video processing
                const jobData: CourseVideoProcessingJobData = {
                    courseId,
                    processingOptions
                };

                // Add job to video processing queue
                // The worker will handle:
                // 1. Fetching all video URLs from the repository for the course
                // 2. Creating individual video processing jobs for each video
                // 3. Processing each video to HLS format with multiple resolutions
                // 4. Uploading processed videos to S3 processed-videos prefix
                // 5. Generating and uploading thumbnails
                // 6. Cleaning up temporary files
                const videoJob = await bullMQManager.addJob(
                    QUEUE_NAMES.VIDEO_PROCESSING,
                    JOB_TYPES.VIDEO_PROCESSING.PROCESS_COURSE_VIDEOS,
                    jobData,
                    {
                        priority: 1,
                        attempts: 3,
                        removeOnComplete: 10,
                        removeOnFail: 5
                    }
                );

                // Add parallel job to vector embedding queue
                // The worker will handle:
                // 1. Fetching course name and description
                // 2. Fetching all content names from the course
                // 3. Generating vector embeddings for semantic search
                // 4. Storing embeddings in the vectors table
                const vectorJob = await bullMQManager.addJob(
                    QUEUE_NAMES.VECTOR_EMBEDDING,
                    JOB_TYPES.VECTOR_EMBEDDING.GENERATE_COURSE_EMBEDDINGS,
                    {
                        courseId: courseId,
                        source: 'courses' as const
                    },
                    {
                        priority: 2,
                        attempts: 3,
                        removeOnComplete: 10,
                        removeOnFail: 5
                    }
                );

                // Add parallel job for content embeddings
                const contentVectorJob = await bullMQManager.addJob(
                    QUEUE_NAMES.VECTOR_EMBEDDING,
                    JOB_TYPES.VECTOR_EMBEDDING.GENERATE_CONTENT_EMBEDDINGS,
                    {
                        courseId: courseId,
                        source: 'contents' as const
                    },
                    {
                        priority: 2,
                        attempts: 3,
                        removeOnComplete: 10,
                        removeOnFail: 5
                    }
                );

                return {
                    success: true,
                    data: {
                        videoJobId: videoJob.id,
                        vectorJobId: vectorJob.id,
                        contentVectorJobId: contentVectorJob.id,
                        status: 'queued',
                        message: 'Jobs added to processing queues'
                    },
                    message: 'Video processing and vector embedding jobs queued successfully. Workers will handle all processing operations in parallel.'
                };
            } catch (error) {
                console.error('Error queuing video processing job:', error);
                reply.status(500).send({
                    success: false,
                    message: 'Internal server error'
                });
                return {
                    success: false,
                    data: {
                        videoJobId: '',
                        vectorJobId: '',
                        contentVectorJobId: '',
                        status: 'failed',
                        message: 'Internal server error'
                    },
                    message: 'Internal server error'
                };
            }
        });
    });

    // New hierarchical structure endpoints
    // POST /media/video-upload-url
    fastify.post('/video-upload-url', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Media - Hierarchical Structure'],
            summary: 'Generate presigned URL for video upload',
            description: 'Generate presigned URL for uploading video files in the new hierarchical structure',
            body: Type.Object({
                courseId: Type.Number(),
                moduleId: Type.Number(),
                contentId: Type.Number(),
                fileName: Type.String(),
                expiresIn: Type.Optional(Type.Number({ minimum: 60, maximum: 3600 }))
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    data: Type.Object({
                        uploadUrl: Type.String(),
                        fileKey: Type.String(),
                        expiresIn: Type.Number()
                    }),
                    message: Type.String()
                }),
                400: Type.Object({
                    success: Type.Boolean(),
                    data: Type.Null(),
                    message: Type.String()
                })
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        try {
            const { courseId, moduleId, contentId, fileName, expiresIn = 3600 } = request.body as any;

            const uploadUrl = await generateVideoUploadUrl(courseId, moduleId, contentId, fileName, expiresIn);
            const fileKey = `${S3_CONFIG.PREFIXES.rawVideos}/${courseId}/${moduleId}/${contentId}/Video.${fileName.split('.').pop()}`;

            return {
                success: true,
                data: {
                    uploadUrl,
                    fileKey,
                    expiresIn
                },
                message: 'Video upload URL generated successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Internal server error';
            reply.status(400);
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // POST /media/thumbnail-upload-url
    fastify.post('/thumbnail-upload-url', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Media - Hierarchical Structure'],
            summary: 'Generate presigned URL for thumbnail upload',
            description: 'Generate presigned URL for uploading thumbnail files in the new hierarchical structure',
            body: Type.Object({
                courseId: Type.Number(),
                moduleId: Type.Optional(Type.Number()),
                contentId: Type.Optional(Type.Number()),
                fileName: Type.String(),
                expiresIn: Type.Optional(Type.Number({ minimum: 60, maximum: 3600 }))
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    data: Type.Object({
                        uploadUrl: Type.String(),
                        fileKey: Type.String(),
                        expiresIn: Type.Number()
                    }),
                    message: Type.String()
                }),
                400: Type.Object({
                    success: Type.Boolean(),
                    data: Type.Null(),
                    message: Type.String()
                })
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        try {
            const { courseId, moduleId, contentId, fileName, expiresIn = 3600 } = request.body as any;

            const uploadUrl = await generateThumbnailUploadUrl(courseId, moduleId, contentId, fileName, expiresIn);

            let fileKey: string;
            if (contentId && moduleId) {
                fileKey = `${S3_CONFIG.PREFIXES.rawVideos}/${courseId}/${moduleId}/${contentId}/Thumbnail.${fileName.split('.').pop()}`;
            } else if (moduleId) {
                fileKey = `${S3_CONFIG.PREFIXES.rawVideos}/${courseId}/${moduleId}/Thumbnail.${fileName.split('.').pop()}`;
            } else {
                fileKey = `${S3_CONFIG.PREFIXES.rawVideos}/${courseId}/Thumbnail.${fileName.split('.').pop()}`;
            }

            return {
                success: true,
                data: {
                    uploadUrl,
                    fileKey,
                    expiresIn
                },
                message: 'Thumbnail upload URL generated successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Internal server error';
            reply.status(400);
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // POST /media/video-download-url
    fastify.post('/video-download-url', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Media - Hierarchical Structure'],
            summary: 'Generate presigned URL for video download',
            description: 'Generate presigned URL for downloading processed video files',
            body: Type.Object({
                courseId: Type.Number(),
                moduleId: Type.Number(),
                contentId: Type.Number(),
                fileName: Type.String(),
                expiresIn: Type.Optional(Type.Number({ minimum: 60, maximum: 3600 }))
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    data: Type.Object({
                        downloadUrl: Type.String(),
                        fileKey: Type.String(),
                        expiresIn: Type.Number()
                    }),
                    message: Type.String()
                }),
                400: Type.Object({
                    success: Type.Boolean(),
                    data: Type.Null(),
                    message: Type.String()
                })
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        try {
            const { courseId, moduleId, contentId, fileName, expiresIn = 3600 } = request.body as any;

            const downloadUrl = await generateVideoDownloadUrl(courseId, moduleId, contentId, fileName, expiresIn);
            const fileKey = `${S3_CONFIG.PREFIXES.processedVideos}/${courseId}/${moduleId}/${contentId}/master/${fileName}`;

            return {
                success: true,
                data: {
                    downloadUrl,
                    fileKey,
                    expiresIn
                },
                message: 'Video download URL generated successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Internal server error';
            reply.status(400);
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });
}
