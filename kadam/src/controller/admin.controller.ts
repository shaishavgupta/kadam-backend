import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminService } from '../service/admin.service';
import { authMiddleware, AuthenticatedRequest, requireAdmin } from '../shared/middleware/auth';
import {
    DashboardData,
    PaginatedUsersResponse,
    PaginatedCreatorsResponse,
    PaginatedCoursesResponse,
    PaginationQuery,
    AdminDashboardResponse,
    AdminUsersResponse,
    AdminCreatorsResponse,
    AdminCoursesResponse,
    AdminDashboardResponseSchema,
    AdminUsersResponseSchema,
    AdminCreatorsResponseSchema,
    AdminCoursesResponseSchema,
    PaginationQuerySchema
} from '../schemas';

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
}
