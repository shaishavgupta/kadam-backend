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
    UnifiedPresignedUrlRequestSchema,
    PresignedUrlResponseSchema,
    UnifiedPresignedUrlRequest,
    PresignedUrlResponse,
    VideoProcessingRequestSchema,
    VideoProcessingResponseSchema,
    VideoProcessingRequest,
    VideoProcessingResponse,
    VideoUploadRequestSchema,
    VideoUploadResponseSchema,
    VideoUploadRequest,
    VideoUploadResponse
} from '../schemas/media';
import { AdminConfigurations } from '../shared/types';
import { CoursesService } from '../service/courses.service';
import { authMiddleware, AuthenticatedRequest, requireAdmin, requireUser } from '../shared/middleware/auth';
import {
    generateHierarchicalPresignedUrl,
    S3_CONFIG
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
                const categoryIds = await adminService.getConfiguration(AdminConfigurations.homePagePopularCategories);
                const categories = await coursesService.getCategoriesByIds(categoryIds?.value as number[]);

                return {
                    success: true,
                    data: {
                        banners: (banners?.value as Banners[]) || [],
                        categories: categories as Categories[] || [],
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

        // Simplified presigned URL endpoint for hierarchical uploads only
        fastify.post('/presigned-url', {
            preHandler: [authMiddleware, requireUser],
            schema: {
                tags: ['Media'],
                summary: 'Generate presigned URL for file uploads',
                description: 'Generate presigned URL for uploading files in hierarchical structure',
                security: [{ bearerAuth: [] }],
                body: UnifiedPresignedUrlRequestSchema,
                response: {
                    200: PresignedUrlResponseSchema,
                    400: Type.Object({
                        success: Type.Boolean(),
                        data: Type.Null(),
                        message: Type.String()
                    }),
                    500: Type.Object({
                        success: Type.Boolean(),
                        data: Type.Null(),
                        message: Type.String()
                    })
                }
            }
        }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<PresignedUrlResponse> => {
            try {
                const { courseId, moduleId, contentId, fileType, operation, expiresIn = 3600 } = request.body as UnifiedPresignedUrlRequest;

                // Validate course exists
                const course = await coursesService.getCourseById(courseId);
                if (!course) {
                    reply.status(400);
                    return {
                        success: false,
                        data: {
                            presignedUrl: '',
                            s3Key: '',
                            expiresIn: 0
                        },
                        message: 'Course not found'
                    };
                }

                // Generate hierarchical presigned URL
                const result = await generateHierarchicalPresignedUrl(
                    courseId,
                    moduleId,
                    contentId,
                    fileType,
                    operation,
                    expiresIn
                );

                return {
                    success: true,
                    data: {
                        presignedUrl: result.presignedUrl,
                        s3Key: result.s3Key,
                        expiresIn
                    },
                    message: 'Presigned URL generated successfully'
                };
            } catch (error) {
                console.error('Error generating presigned URL:', error);
                const errorMessage = error instanceof Error ? error.message : 'Internal server error';
                reply.status(500);
                return {
                    success: false,
                    data: {
                        presignedUrl: '',
                        s3Key: '',
                        expiresIn: 0
                    },
                    message: errorMessage
                };
            }
        });

        // Queue video upload and processing job
        fastify.post('/upload', {
            preHandler: [authMiddleware, requireAdmin],
            schema: {
                tags: ['Media', 'Admin'],
                summary: 'Upload and process videos',
                description: 'Upload videos and add processing jobs to the queue. The job will handle downloading from S3, processing, and uploading results back to S3 (Admin only)',
                security: [{ bearerAuth: [] }],
                body: VideoUploadRequestSchema,
                response: {
                    200: VideoUploadResponseSchema,
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
        }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<VideoUploadResponse> => {
            try {
                const { courseId, moduleId, contentId, processingOptions } = request.body as VideoUploadRequest;

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

                // Validate content belongs to given module and module belongs to given course
                const content = await coursesService.getContentById(contentId);
                if (!content) {
                    reply.status(400).send({
                        success: false,
                        message: 'Content not found'
                    });
                    return {
                        success: false,
                        data: {
                            videoJobId: '',
                            vectorJobId: '',
                            contentVectorJobId: '',
                            status: 'failed',
                            message: 'Content not found'
                        },
                        message: 'Content not found'
                    };
                }

                // Check if content belongs to the specified module
                if (content.module_id != moduleId) {
                    reply.status(400).send({
                        success: false,
                        message: 'Content does not belong to the specified module'
                    });
                    return {
                        success: false,
                        data: {
                            videoJobId: '',
                            vectorJobId: '',
                            contentVectorJobId: '',
                            status: 'failed',
                            message: 'Content does not belong to the specified module'
                        },
                        message: 'Content does not belong to the specified module'
                    };
                }

                // Check if module belongs to the specified course
                if (content.course_id != courseId) {
                    reply.status(400).send({
                        success: false,
                        message: 'Module does not belong to the specified course'
                    });
                    return {
                        success: false,
                        data: {
                            videoJobId: '',
                            vectorJobId: '',
                            contentVectorJobId: '',
                            status: 'failed',
                            message: 'Module does not belong to the specified course'
                        },
                        message: 'Module does not belong to the specified course'
                    };
                }

                // Default processing options if not provided
                const defaultResolutions = ['144p', '240p', '360p', '480p', '720p'];
                const finalProcessingOptions = {
                    resolutions: processingOptions?.resolutions || defaultResolutions,
                    format: processingOptions?.format || 'mp4'
                };

                // Prepare job data for course video processing
                const jobData: CourseVideoProcessingJobData = {
                    courseId,
                    moduleId,
                    contentId,
                    processingOptions: finalProcessingOptions
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
                    message: 'Video upload and processing jobs queued successfully. Workers will handle all processing operations in parallel.'
                };
            } catch (error) {
                console.error('Error queuing video upload job:', error);
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
}
