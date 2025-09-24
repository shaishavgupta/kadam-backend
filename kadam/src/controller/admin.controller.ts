import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminService } from '../service/admin.service';
import { authMiddleware, AuthenticatedRequest, requireAdmin } from '../shared/middleware/auth';
import {
    DashboardData,
    AdminDashboardResponse,
    AdminUsersResponse,
    AdminCreatorsResponse,
    AdminCoursesResponse,
    AdminDashboardResponseSchema,
    AdminUsersResponseSchema,
    AdminCreatorsResponseSchema,
    AdminCoursesResponseSchema,
    UnapprovedCoursesResponseSchema,
    CourseApprovalRequestSchema,
    CourseApprovalResponseSchema,
    SaveVideoMetadataRequestSchema,
    SaveVideoMetadataResponseSchema,
    ReorderVideosRequestSchema,
    ReorderVideosResponseSchema,
    SoftDeleteVideoResponseSchema,
    RejectedVideosResponseSchema,
    UnapprovedCoursesResponse,
    CourseApprovalRequest,
    CourseApprovalResponse,
    SaveVideoMetadataRequest,
    SaveVideoMetadataResponse,
    ReorderVideosRequest,
    ReorderVideosResponse,
    SoftDeleteVideoResponse,
    RejectedVideosResponse
} from '../schemas/admin';
import { PaginationQuerySchema } from '../schemas/common';
import { Type } from '@sinclair/typebox';

export default async function adminRoutes(fastify: FastifyInstance) {
    const adminService = new AdminService();
    // Dashboard endpoint
    fastify.get('/dashboard', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin'],
            summary: 'Get dashboard data',
            description: 'Retrieve dashboard statistics and data for admin panel',
            security: [{ bearerAuth: [] }],
            response: {
                200: AdminDashboardResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<AdminDashboardResponse> => {
        try {
            const data = await adminService.getDashboardData();
            return {
                success: true,
                data,
                message: "Dashboard data retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: {
                    totalUsers: 0,
                    totalCreators: 0,
                    totalCourses: 0,
                    totalRevenue: 0
                },
                message: errorMessage
            };
        }
    });

    // Get all users
    fastify.get('/users', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin'],
            summary: 'Get all users',
            description: 'Retrieve a paginated list of all users for admin management',
            querystring: PaginationQuerySchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: AdminUsersResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<AdminUsersResponse> => {
        try {
            const page = (request.query as any)?.page ? parseInt((request.query as any).page, 10) : 1;
            const limit = (request.query as any)?.limit ? parseInt((request.query as any).limit, 10) : 10;
            const data = await adminService.getUsers(page, limit);
            return {
                success: true,
                data,
                message: "Users retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: {
                    users: [],
                    pagination: {
                        page: 1,
                        limit: 10,
                        total: 0,
                        totalPages: 0
                    }
                },
                message: errorMessage
            };
        }
    });

    // Get all creators
    fastify.get('/creators', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin'],
            summary: 'Get all creators',
            description: 'Retrieve a paginated list of all creators for admin management',
            querystring: PaginationQuerySchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: AdminCreatorsResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<AdminCreatorsResponse> => {
        try {
            const page = (request.query as any)?.page ? parseInt((request.query as any).page, 10) : 1;
            const limit = (request.query as any)?.limit ? parseInt((request.query as any).limit, 10) : 10;
            const data = await adminService.getCreators(page, limit);
            return {
                success: true,
                data,
                message: "Creators retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: {
                    creators: [],
                    pagination: {
                        page: 1,
                        limit: 10,
                        total: 0,
                        totalPages: 0
                    }
                },
                message: errorMessage
            };
        }
    });

    // Get all courses
    fastify.get('/courses', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin'],
            summary: 'Get all courses',
            description: 'Retrieve a paginated list of all courses for admin management',
            querystring: PaginationQuerySchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: AdminCoursesResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<AdminCoursesResponse> => {
        try {
            const page = (request.query as any)?.page ? parseInt((request.query as any).page, 10) : 1;
            const limit = (request.query as any)?.limit ? parseInt((request.query as any).limit, 10) : 10;
            const data = await adminService.getCourses(page, limit);
            return {
                success: true,
                data,
                message: "Courses retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: {
                    courses: [],
                    pagination: {
                        page: 1,
                        limit: 10,
                        total: 0,
                        totalPages: 0
                    }
                },
                message: errorMessage
            };
        }
    });

    // Get unapproved courses
    fastify.get('/courses/unapproved', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Course Management'],
            summary: 'Get unapproved courses',
            description: 'Retrieve a paginated list of courses awaiting admin approval',
            querystring: PaginationQuerySchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: UnapprovedCoursesResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<any> => {
        try {
            const page = (request.query as any)?.page ? parseInt((request.query as any).page, 10) : 1;
            const limit = (request.query as any)?.limit ? parseInt((request.query as any).limit, 10) : 10;

            const data = await adminService.getUnapprovedCourses(page, limit);

            return {
                success: true,
                data,
                message: "Unapproved courses retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: {
                    courses: [],
                    total: 0,
                    page: 1,
                    limit: 10,
                    totalPages: 0
                },
                message: errorMessage
            };
        }
    });

    // Approve course
    fastify.post('/courses/:courseId/approve', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Course Management'],
            summary: 'Approve course',
            description: 'Approve a course for publication',
            params: Type.Object({
                courseId: Type.String({ pattern: '^[0-9]+$' })
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: CourseApprovalResponseSchema,
                404: CourseApprovalResponseSchema,
                500: CourseApprovalResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<CourseApprovalResponse> => {
        try {
            const courseId = parseInt((request.params as any).courseId, 10);
            const adminEmail = request.user?.userID; // Assuming this contains admin email

            if (!adminEmail) {
                reply.status(401);
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const success = await adminService.approveCourse(courseId, adminEmail);

            if (!success) {
                reply.status(404);
                return {
                    success: false,
                    message: 'Course not found or already processed'
                };
            }

            return {
                success: true,
                data: {
                    courseId,
                    approvedAt: new Date().toISOString(),
                    approvedBy: 1 // TODO: Get actual admin ID
                },
                message: 'Course approved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    // Reject course
    fastify.post('/courses/:courseId/reject', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Course Management'],
            summary: 'Reject course',
            description: 'Reject a course with reason',
            params: Type.Object({
                courseId: Type.String({ pattern: '^[0-9]+$' })
            }),
            body: CourseApprovalRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CourseApprovalResponseSchema,
                404: CourseApprovalResponseSchema,
                500: CourseApprovalResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<CourseApprovalResponse> => {
        try {
            const courseId = parseInt((request.params as any).courseId, 10);
            const { reason } = request.body as CourseApprovalRequest;
            const adminEmail = request.user?.userID;

            if (!adminEmail) {
                reply.status(401);
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const success = await adminService.rejectCourse(courseId, adminEmail, reason || 'No reason provided');

            if (!success) {
                reply.status(404);
                return {
                    success: false,
                    message: 'Course not found or already processed'
                };
            }

            return {
                success: true,
                data: {
                    courseId,
                    rejectedAt: new Date().toISOString(),
                    rejectedBy: 1, // TODO: Get actual admin ID
                    rejectionReason: reason || 'No reason provided'
                },
                message: 'Course rejected successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    // Save video metadata
    fastify.post('/courses/:courseId/videos', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Video Management'],
            summary: 'Save video metadata',
            description: 'Save or update video metadata for a course',
            params: Type.Object({
                courseId: Type.String({ pattern: '^[0-9]+$' })
            }),
            body: SaveVideoMetadataRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: SaveVideoMetadataResponseSchema,
                500: SaveVideoMetadataResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<SaveVideoMetadataResponse> => {
        try {
            const courseId = parseInt((request.params as any).courseId, 10);
            const { videos } = request.body as SaveVideoMetadataRequest;
            const adminEmail = request.user?.userID;

            if (!adminEmail) {
                reply.status(401);
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const createdVideos = await adminService.saveVideoMetadata(courseId, videos, adminEmail);

            return {
                success: true,
                data: {
                    createdVideos
                },
                message: 'Video metadata saved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    // Reorder videos
    fastify.patch('/courses/:courseId/videos/reorder', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Video Management'],
            summary: 'Reorder videos',
            description: 'Reorder videos in a course',
            params: Type.Object({
                courseId: Type.String({ pattern: '^[0-9]+$' })
            }),
            body: ReorderVideosRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: ReorderVideosResponseSchema,
                500: ReorderVideosResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<ReorderVideosResponse> => {
        try {
            const courseId = parseInt((request.params as any).courseId, 10);
            const { videoIds } = request.body as ReorderVideosRequest;
            const adminEmail = request.user?.userID;

            if (!adminEmail) {
                reply.status(401);
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const updatedVideos = await adminService.reorderVideos(courseId, videoIds, adminEmail);

            return {
                success: true,
                data: {
                    updatedVideos
                },
                message: 'Videos reordered successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    // Soft delete video
    fastify.delete('/videos/:videoId/soft-delete', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Video Management'],
            summary: 'Soft delete video',
            description: 'Soft delete a video (mark as inactive)',
            params: Type.Object({
                videoId: Type.String({ pattern: '^[0-9]+$' })
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: SoftDeleteVideoResponseSchema,
                404: SoftDeleteVideoResponseSchema,
                500: SoftDeleteVideoResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<SoftDeleteVideoResponse> => {
        try {
            const videoId = parseInt((request.params as any).videoId, 10);
            const adminEmail = request.user?.userID;

            if (!adminEmail) {
                reply.status(401);
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const success = await adminService.softDeleteVideo(videoId, adminEmail);

            if (!success) {
                reply.status(404);
                return {
                    success: false,
                    message: 'Video not found'
                };
            }

            return {
                success: true,
                data: {
                    videoId,
                    deletedAt: new Date().toISOString()
                },
                message: 'Video soft deleted successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    // Get rejected videos
    fastify.get('/videos/rejected', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Video Management'],
            summary: 'Get rejected videos',
            description: 'Retrieve a paginated list of rejected videos',
            querystring: PaginationQuerySchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: RejectedVideosResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<any> => {
        try {
            const page = (request.query as any)?.page ? parseInt((request.query as any).page, 10) : 1;
            const limit = (request.query as any)?.limit ? parseInt((request.query as any).limit, 10) : 10;

            const data = await adminService.getRejectedVideos(page, limit);

            return {
                success: true,
                data,
                message: "Rejected videos retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: {
                    videos: [],
                    total: 0,
                    page: 1,
                    limit: 10,
                    totalPages: 0
                },
                message: errorMessage
            };
        }
    });
}
