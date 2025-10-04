import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminService } from '../service/admin.service';
import { authMiddleware, AuthenticatedRequest, requireAdmin } from '../shared/middleware/auth';
import {
    DashboardData
} from '../shared/types/admin.types';
import {
    AdminDashboardResponse,
    AdminUsersResponse,
    AdminCreatorsResponse,
    AdminCoursesQuerySchema,
    AdminDashboardResponseSchema,
    AdminUsersResponseSchema,
    AdminCreatorsResponseSchema,
    AdminResponseSchema,
    AdminByIdResponseSchema,
    UnapprovedCoursesResponseSchema,
    CourseApprovalRequestSchema,
    CourseApprovalResponseSchema,
    ModuleApprovalResponseSchema,
    ContentApprovalResponseSchema,
    UnifiedRejectRequestSchema,
    UnifiedRejectResponseSchema,
    SaveVideoMetadataRequestSchema,
    SaveVideoMetadataResponseSchema,
    ReorderVideosRequestSchema,
    ReorderVideosResponseSchema,
    ReorderContentsRequestSchema,
    ReorderContentsResponseSchema,
    SoftDeleteVideoResponseSchema as DeleteVideoResponseSchema,
    DeleteCourseResponseSchema,
    CreateContentsRequestSchema,
    CreateContentsResponseSchema,
    CourseWithModulesAndContentResponseSchema,
    UnapprovedCoursesResponse,
    CourseApprovalRequest,
    CourseApprovalResponse,
    ModuleApprovalResponse,
    ContentApprovalResponse,
    UnifiedRejectRequest,
    UnifiedRejectResponse,
    SaveVideoMetadataRequest,
    SaveVideoMetadataResponse,
    ReorderVideosRequest,
    ReorderVideosResponse,
    ReorderContentsRequest,
    ReorderContentsResponse,
    SoftDeleteVideoResponse as DeleteVideoResponse,
    DeleteCourseResponse,
    CreateContentsRequest,
    CreateContentsResponse,
    CourseWithModulesAndContentResponse,
    AdminResponse,
    AdminByIdResponse
} from '../schemas/admin';
import { PaginationQuerySchema } from '../schemas/common';
import { Type } from '@sinclair/typebox';

// Helper to create error responses
function createErrorResponse(message: string, statusCode: number = 500) {
    return {
        success: false,
        message,
        statusCode
    };
}

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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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

    // Get admin by ID
    fastify.get('/:adminId', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin'],
            summary: 'Get admin by ID',
            description: 'Retrieve admin details by admin ID',
            params: Type.Object({
                adminId: Type.String({ pattern: '^[0-9]+$' })
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: AdminByIdResponseSchema,
                404: AdminByIdResponseSchema,
                500: AdminByIdResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<AdminByIdResponse> => {
        try {
            const adminId = parseInt((request.params as any).adminId, 10);

            const admin = await adminService.getAdminById(adminId);

            if (!admin) {
                reply.status(404);
                return {
                    success: false,
                    data: null as any,
                    message: 'Admin not found'
                };
            }

            return {
                success: true,
                data: {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    phone: admin.phone,
                    is_active: true, // Since we filter by is_active = true in repository
                    created_at: admin.created_at.toISOString(),
                    updated_at: admin.updated_at.toISOString(),
                    last_active_at: admin.last_active_at?.toISOString(),
                    profile_pic: admin.profile_pic
                },
                message: 'Admin retrieved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500);
            return {
                success: false,
                data: null as any,
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            description: 'Retrieve a paginated list of all courses for admin management with optional rejected courses filter',
            querystring: AdminCoursesQuerySchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    data: Type.Any(),
                    message: Type.String()
                })
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<any> => {
        try {
            const query = request.query as any;
            const page = query?.page ? parseInt(query.page, 10) : 1;
            const limit = query?.limit ? parseInt(query.limit, 10) : 10;
            const rejected = query?.rejected;
            const published = query?.published;

            const data = await adminService.getCourses(page, limit, rejected, published);
            return {
                success: true,
                data,
                message: "Courses retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            const adminId = parseInt(request.user?.userID || '0', 10);

            if (!adminId) {
                reply.status(401).send(createErrorResponse('Admin authentication required', 401));
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const success = await adminService.approveCourse(courseId, adminId);

            if (!success) {
                // Get detailed status to provide better error message
                const status = await adminService.getCourseStatus(courseId);

                if (!status.exists) {
                    reply.status(404);
                    return {
                        success: false,
                        message: 'Course not found'
                    };
                }

                if (!status.canBeApproved) {
                    reply.status(400);
                    return {
                        success: false,
                        message: status.reason || 'Course cannot be approved'
                    };
                }

                reply.status(500);
                return {
                    success: false,
                    message: 'Failed to approve course'
                };
            }

            return {
                success: true,
                data: {
                    courseId,
                    approvedAt: new Date().toISOString(),
                    approvedBy: adminId
                },
                message: 'Course approved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    // Get available courses for testing
    fastify.get('/courses/available', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Debug'],
            summary: 'Get available courses',
            description: 'Get a list of all courses with their IDs and status for testing purposes',
            security: [{ bearerAuth: [] }],
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    data: Type.Array(Type.Object({
                        id: Type.Number(),
                        name: Type.String(),
                        creator_published_at: Type.Optional(Type.String()),
                        approved_at: Type.Optional(Type.String()),
                        rejected_at: Type.Optional(Type.String())
                    })),
                    message: Type.String()
                })
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<any> => {
        try {
            const courses = await adminService.getAvailableCourses();
            return {
                success: true,
                data: courses,
                message: "Available courses retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Delete course
    fastify.delete('/courses/:courseId', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Course Management'],
            summary: 'Delete course',
            description: 'Soft delete a course and all its related data (modules, contents, enrollments)',
            params: Type.Object({
                courseId: Type.String({ pattern: '^[0-9]+$' })
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: DeleteCourseResponseSchema,
                404: DeleteCourseResponseSchema,
                500: DeleteCourseResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<DeleteCourseResponse> => {
        try {
            const courseId = parseInt((request.params as any).courseId, 10);
            const adminId = parseInt(request.user?.userID || '0', 10);

            if (!adminId) {
                reply.status(401).send(createErrorResponse('Admin authentication required', 401));
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const result = await adminService.deleteCourse(courseId, adminId);

            if (!result.success) {
                reply.status(404);
                return {
                    success: false,
                    message: result.message || 'Course not found or could not be deleted'
                };
            }

            return {
                success: true,
                data: {
                    courseId,
                    deletedAt: new Date().toISOString(),
                    cascadedDeletes: result.cascadedDeletes!
                },
                message: 'Course deleted successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    fastify.post('/reject', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Unified Management'],
            summary: 'Reject course, module, or content',
            description: 'Reject a course, module, or content with automatic cascading updates',
            body: UnifiedRejectRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: UnifiedRejectResponseSchema,
                400: Type.Object({
                    success: Type.Boolean(),
                    message: Type.String()
                }),
                404: Type.Object({
                    success: Type.Boolean(),
                    message: Type.String()
                }),
                500: Type.Object({
                    success: Type.Boolean(),
                    message: Type.String()
                })
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<UnifiedRejectResponse> => {
        try {
            const { type, id, reason } = request.body as UnifiedRejectRequest;
            const adminId = parseInt(request.user?.userID || '0', 10);

            if (!adminId) {
                reply.status(401).send(createErrorResponse('Admin authentication required', 401));
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const result = await adminService.rejectItem(type as 'course' | 'module' | 'content', id, adminId, reason || 'No reason provided');

            if (!result.success) {
                reply.status(404);
                return {
                    success: false,
                    message: result.message || `${type} not found or already processed`
                };
            }

            return {
                success: true,
                data: {
                    type,
                    id,
                    rejectedAt: new Date().toISOString(),
                    rejectedBy: adminId,
                    rejectionReason: reason || 'No reason provided',
                    cascadedUpdates: result.cascadedUpdates
                },
                message: result.message || `${type} rejected successfully`
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            const adminId = parseInt(request.user?.userID || '0', 10);

            if (!adminId) {
                reply.status(401).send(createErrorResponse('Admin authentication required', 401));
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const createdVideos = await adminService.saveVideoMetadata(courseId, videos, adminId);

            return {
                success: true,
                data: {
                    createdVideos
                },
                message: 'Video metadata saved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    // Reorder module contents
    fastify.patch('/modules/:moduleId/contents/reorder', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Content Management'],
            summary: 'Reorder module contents',
            description: 'Reorder contents within a module',
            params: Type.Object({
                moduleId: Type.String({ pattern: '^[0-9]+$' })
            }),
            body: ReorderContentsRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: ReorderContentsResponseSchema,
                500: ReorderContentsResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<ReorderContentsResponse> => {
        try {
            const moduleId = parseInt((request.params as any).moduleId, 10);
            const { contentIds } = request.body as ReorderContentsRequest;
            const adminId = parseInt(request.user?.userID || '0', 10);

            if (!adminId) {
                reply.status(401).send(createErrorResponse('Admin authentication required', 401));
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const updatedContents = await adminService.reorderContents(moduleId, contentIds, adminId);

            return {
                success: true,
                data: {
                    updatedContents
                },
                message: 'Contents reordered successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    // delete video
    fastify.delete('/videos/:videoId', {
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
                200: DeleteVideoResponseSchema,
                404: DeleteVideoResponseSchema,
                500: DeleteVideoResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<DeleteVideoResponse> => {
        try {
            const videoId = parseInt((request.params as any).videoId, 10);
            const adminId = parseInt(request.user?.userID || '0', 10);

            if (!adminId) {
                reply.status(401).send(createErrorResponse('Admin authentication required', 401));
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const success = await adminService.softDeleteVideo(videoId, adminId);

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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    // Get course with modules and content
    fastify.get('/courses/:courseId/full', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Course Management'],
            summary: 'Get complete course data',
            description: 'Get complete course data including modules and content',
            params: Type.Object({
                courseId: Type.String({ pattern: '^[0-9]+$' })
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: CourseWithModulesAndContentResponseSchema,
                404: Type.Object({
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
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<CourseWithModulesAndContentResponse> => {
        try {
            const courseId = parseInt((request.params as any).courseId, 10);

            return {
                success: true,
                data: await adminService.getCourseWithModulesAndContent(courseId),
                message: 'Course data retrieved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500);
            return {
                success: false,
                data: null as any,
                message: errorMessage
            };
        }
    });

    // Generate S3 URLs in new hierarchical structure
    fastify.post('/generate-s3-urls', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Content Management'],
            summary: 'Generate S3 URLs for new hierarchical structure',
            description: 'Generate S3 URLs for video and thumbnail files in the new hierarchical structure',
            body: Type.Object({
                courseId: Type.Number(),
                moduleId: Type.Number(),
                contentId: Type.Number(),
                fileName: Type.String()
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    data: Type.Object({
                        videoUrl: Type.String(),
                        thumbnailUrl: Type.String()
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
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<any> => {
        try {
            const { courseId, moduleId, contentId, fileName } = request.body as any;

            const urls = adminService.generateS3Urls(courseId, moduleId, contentId, fileName);

            return {
                success: true,
                data: urls,
                message: 'S3 URLs generated successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(400);
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Approve module
    fastify.post('/modules/:moduleId/approve', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Module Management'],
            summary: 'Approve module',
            description: 'Approve an individual module',
            params: Type.Object({
                moduleId: Type.String({ pattern: '^[0-9]+$' })
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: ModuleApprovalResponseSchema,
                404: ModuleApprovalResponseSchema,
                500: ModuleApprovalResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<ModuleApprovalResponse> => {
        try {
            const moduleId = parseInt((request.params as any).moduleId, 10);
            const adminId = parseInt(request.user?.userID || '0', 10);

            if (!adminId) {
                reply.status(401).send(createErrorResponse('Admin authentication required', 401));
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const success = await adminService.approveModule(moduleId, adminId);

            if (!success) {
                reply.status(404);
                return {
                    success: false,
                    message: 'Module not found or could not be approved'
                };
            }

            return {
                success: true,
                data: {
                    moduleId,
                    approvedAt: new Date().toISOString(),
                    approvedBy: adminId
                },
                message: 'Module approved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    // Approve content
    fastify.post('/contents/:contentId/approve', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Admin - Content Management'],
            summary: 'Approve content',
            description: 'Approve an individual content item',
            params: Type.Object({
                contentId: Type.String({ pattern: '^[0-9]+$' })
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: ContentApprovalResponseSchema,
                404: ContentApprovalResponseSchema,
                500: ContentApprovalResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<ContentApprovalResponse> => {
        try {
            const contentId = parseInt((request.params as any).contentId, 10);
            const adminId = parseInt(request.user?.userID || '0', 10);

            if (!adminId) {
                reply.status(401).send(createErrorResponse('Admin authentication required', 401));
                return {
                    success: false,
                    message: 'Admin authentication required'
                };
            }

            const success = await adminService.approveContent(contentId, adminId);

            if (!success) {
                reply.status(404);
                return {
                    success: false,
                    message: 'Content not found or could not be approved'
                };
            }

            return {
                success: true,
                data: {
                    contentId,
                    approvedAt: new Date().toISOString(),
                    approvedBy: adminId
                },
                message: 'Content approved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                message: errorMessage
            };
        }
    });
}
