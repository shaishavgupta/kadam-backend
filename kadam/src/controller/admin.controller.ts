import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminService } from '../service/admin.service';
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
        schema: {
            tags: ['Admin'],
            summary: 'Get dashboard data',
            description: 'Retrieve dashboard statistics and data for admin panel',
            response: {
                200: AdminDashboardResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<AdminDashboardResponse | void> => {
        try {
            const data = await adminService.getDashboardData();
            return {
                success: true,
                data,
                message: "Dashboard data retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
            return;
        }
    });

    // Get all users
    fastify.get('/users', {
        schema: {
            tags: ['Admin'],
            summary: 'Get all users',
            description: 'Retrieve a paginated list of all users for admin management',
            querystring: PaginationQuerySchema,
            response: {
                200: AdminUsersResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply): Promise<AdminUsersResponse | void> => {
        try {
            const page = request.query.page ? parseInt(request.query.page, 10) : 1;
            const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;
            const data = await adminService.getUsers(page, limit);
            return {
                success: true,
                data,
                message: "Users retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
            return;
        }
    });

    // Get all creators
    fastify.get('/creators', {
        schema: {
            tags: ['Admin'],
            summary: 'Get all creators',
            description: 'Retrieve a paginated list of all creators for admin management',
            querystring: PaginationQuerySchema,
            response: {
                200: AdminCreatorsResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply): Promise<AdminCreatorsResponse | void> => {
        try {
            const page = request.query.page ? parseInt(request.query.page, 10) : 1;
            const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;
            const data = await adminService.getCreators(page, limit);
            return {
                success: true,
                data,
                message: "Creators retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
            return;
        }
    });

    // Get all courses
    fastify.get('/courses', {
        schema: {
            tags: ['Admin'],
            summary: 'Get all courses',
            description: 'Retrieve a paginated list of all courses for admin management',
            querystring: PaginationQuerySchema,
            response: {
                200: AdminCoursesResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply): Promise<AdminCoursesResponse | void> => {
        try {
            const page = request.query.page ? parseInt(request.query.page, 10) : 1;
            const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;
            const data = await adminService.getCourses(page, limit);
            return {
                success: true,
                data,
                message: "Courses retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
            return;
        }
    });
}
