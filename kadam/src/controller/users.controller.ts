import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from "../service/users.service";
import { authMiddleware, AuthenticatedRequest, requireUser, requireAdmin } from "../shared/middleware/auth";
import {
    CreateUserRequestSchema,
    UpdateUserRequestSchema,
    UserSchema,
    PaginatedUsersResponseSchema,
    GetUsersQuerySchema,
    UserResponseSchema,
    PaginatedUsersResponseWrapperSchema,
    UserEnumsResponseSchema,
    UserIdParamSchema,
    UserPhoneParamSchema,
    UserEmailParamSchema,
    CreateUserRequest,
    UpdateUserRequest,
    User,
    PaginatedUsersResponse,
    UserEnumsResponse,
    UserIdParam,
    UserPhoneParam,
    UserEmailParam
} from '../schemas/user';
import { SuccessResponseSchema, SuccessResponse } from '../schemas/common';
import { Language, Gender, PlanType } from '../shared/enums';

const userService = new UserService();

export default async function userRoutes(fastify: FastifyInstance) {

    fastify.get('/enums', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Users'],
            summary: 'Get user enums',
            description: 'Get available enum values for user-related fields',
            security: [{ bearerAuth: [] }],
            response: {
                200: UserEnumsResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<UserEnumsResponse> => {
        return {
            success: true,
            data: {
                languages: Object.values(Language),
                genders: Object.values(Gender),
                planTypes: Object.values(PlanType)
            },
            message: "Enums retrieved successfully"
        };
    });

    // Register protected routes with auth middleware
    fastify.register(async function (fastify) {
        fastify.addHook('preHandler', authMiddleware);
        fastify.addHook('preHandler', requireAdmin);

        fastify.get('/', {
            schema: {
                tags: ['Users'],
                summary: 'Get all users',
                description: 'Retrieve a paginated list of all users',
                querystring: GetUsersQuerySchema,
                security: [{ bearerAuth: [] }],
                response: {
                    200: PaginatedUsersResponseWrapperSchema
                }
            }
        }, async (request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>, reply: FastifyReply) => {
            try {
                const page = parseInt(request.query.page || '1');
                const limit = parseInt(request.query.limit || '10');

                const data = await userService.getAllUsers(page, limit);
                return {
                    success: true,
                    data,
                    message: "Users retrieved successfully"
                };
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: "Internal server error"
                });
            }
        });

        fastify.get('/:id', {
            schema: {
                tags: ['Users'],
                summary: 'Get user by ID',
                description: 'Retrieve a specific user by their ID',
                params: UserIdParamSchema,
                security: [{ bearerAuth: [] }],
                response: {
                    200: UserResponseSchema
                }
            }
        }, async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = parseInt((request.params as any).id);
                if (isNaN(userId)) {
                    return reply.status(400).send({
                        success: false,
                        message: "Invalid user ID"
                    });
                }

                const data = await userService.getUserById(userId);
                return {
                    success: true,
                    data,
                    message: "User retrieved successfully"
                };
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: "Internal server error"
                });
            }
        });

        fastify.get('/phone/:phone', {
            schema: {
                tags: ['Users'],
                summary: 'Get user by phone number',
                description: 'Retrieve a specific user by their phone number',
                params: UserPhoneParamSchema,
                security: [{ bearerAuth: [] }],
                response: {
                    200: UserResponseSchema
                }
            }
        }, async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const data = await userService.getUserByPhone((request.params as any).phone);
                return {
                    success: true,
                    data,
                    message: "User retrieved successfully"
                };
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: "Internal server error"
                });
            }
        });

        fastify.get('/email/:email', {
            schema: {
                tags: ['Users'],
                summary: 'Get user by email',
                description: 'Retrieve a specific user by their email address',
                params: UserEmailParamSchema,
                security: [{ bearerAuth: [] }],
                response: {
                    200: UserResponseSchema
                }
            }
        }, async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const data = await userService.getUserByEmail((request.params as any).email);
                return {
                    success: true,
                    data,
                    message: "User retrieved successfully"
                };
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: "Internal server error"
                });
            }
        });

        fastify.patch('/:id', {
            schema: {
                tags: ['Users'],
                summary: 'Update user',
                description: 'Update a specific user by their ID',
                params: UserIdParamSchema,
                body: UpdateUserRequestSchema,
                security: [{ bearerAuth: [] }],
                response: {
                    200: UserResponseSchema
                }
            }
        }, async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = parseInt((request.params as any).id);
                if (isNaN(userId)) {
                    return reply.status(400).send({
                        success: false,
                        message: "Invalid user ID"
                    });
                }

                const data = await userService.updateUser(userId, request.body as any);
                return {
                    success: true,
                    data,
                    message: "User updated successfully"
                };
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: "Internal server error"
                });
            }
        });

        fastify.post('/', {
            schema: {
                tags: ['Users'],
                summary: 'Create user',
                description: 'Create a new user',
                body: CreateUserRequestSchema,
                security: [{ bearerAuth: [] }],
                response: {
                    200: UserResponseSchema
                }
            }
        }, async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const data = await userService.createUser(request.body as any);
                return {
                    success: true,
                    data,
                    message: "User created successfully"
                };
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: "Internal server error"
                });
            }
        });

        fastify.delete('/:id', {
            schema: {
                tags: ['Users'],
                summary: 'Delete user',
                description: 'Delete a specific user by their ID',
                params: UserIdParamSchema,
                security: [{ bearerAuth: [] }],
                response: {
                    200: SuccessResponseSchema
                }
            }
        }, async (request: FastifyRequest, reply: FastifyReply): Promise<SuccessResponse> => {
            try {
                const userId = parseInt((request.params as any).id);
                if (isNaN(userId)) {
                    return reply.status(400).send({
                        success: false,
                        message: "Invalid user ID"
                    });
                }

                await userService.deleteUser(userId);
                return {
                    success: true,
                    message: "User deleted successfully"
                };
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    });
}
