import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
import { generatePresignedUrl, uploadCourseContent, uploadRawVideo, uploadProcessedVideo } from '../infra/aws/s3';
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
                let bucketType: 'RAW_VIDEOS';

                switch (fileType) {
                    case 'raw-video':
                        fileKey = `raw-videos/${courseId}/${fileName}`;
                        bucketType = 'RAW_VIDEOS';
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
                    bucket: bucketType,
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
                // 4. Uploading processed videos to S3 processed-videos bucket
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
}
