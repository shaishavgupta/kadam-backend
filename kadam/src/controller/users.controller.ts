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

// Helper to convert all Date values in objects/arrays to ISO strings
function serializeDates<T>(value: any): T {
    return JSON.parse(
        JSON.stringify(value, (_key, val) => (val instanceof Date ? val.toISOString() : val))
    );
}

// Helper to create error responses
function createErrorResponse(message: string, statusCode: number = 500) {
    return {
        success: false,
        message,
        statusCode
    };
}

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
        }, async (request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>, reply: FastifyReply): Promise<{ success: boolean; data: PaginatedUsersResponse; message: string }> => {
            try {
                const page = parseInt(request.query.page || '1');
                const limit = parseInt(request.query.limit || '10');

                const raw = await userService.getAllUsers(page, limit);
                const data: PaginatedUsersResponse = {
                    users: serializeDates<any[]>(raw?.users ?? (raw as any)?.data?.users ?? (raw as any)?.data ?? []),
                    total: (raw as any)?.total ?? (raw as any)?.pagination?.total ?? 0,
                    page: (raw as any)?.page ?? (raw as any)?.pagination?.page ?? page,
                    limit: (raw as any)?.limit ?? (raw as any)?.pagination?.limit ?? limit,
                    totalPages: (raw as any)?.totalPages ?? (raw as any)?.pagination?.totalPages ?? 0
                } as PaginatedUsersResponse;
                return {
                    success: true,
                    data,
                    message: "Users retrieved successfully"
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Internal server error";
                reply.status(500).send(createErrorResponse(errorMessage, 500));
                return {
                    success: false,
                    data: {
                        users: [],
                        total: 0,
                        page: 1,
                        limit: 10,
                        totalPages: 0
                    },
                    message: errorMessage
                };
            }
        });

        fastify.get('/:id', {
            preHandler: [authMiddleware, requireUser],
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
        }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: User; message: string }> => {
            try {
                const userId = parseInt((request.params as any).id);
                if (isNaN(userId)) {
                    reply.status(400).send(createErrorResponse("Invalid user ID", 400));
                    return {
                        success: false,
                        data: {
                            id: 0,
                            email: '',
                            name: '',
                            phone: '',
                            avatar_url: '',
                            preferred_language: Language.ENGLISH,
                            plan_type: PlanType.FREE,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            is_active: false,
                            last_active_at: undefined,
                            paid_at: undefined,
                            dob: undefined,
                            bio: '',
                            gender: Gender.OTHERS,
                            onboarding_completed: false,
                            whatsapp_allowed: false
                        },
                        message: "Invalid user ID"
                    };
                }

                const raw = await userService.getUserById(userId);
                const data = serializeDates<User>(raw);
                return {
                    success: true,
                    data,
                    message: "User retrieved successfully"
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Internal server error";
                reply.status(500).send(createErrorResponse(errorMessage, 500));
                return {
                    success: false,
                    data: {
                        id: 0,
                        email: '',
                        name: '',
                        phone: '',
                        avatar_url: '',
                        preferred_language: Language.ENGLISH,
                        plan_type: PlanType.FREE,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        is_active: false,
                        last_active_at: undefined,
                        paid_at: undefined,
                        dob: undefined,
                        bio: '',
                        gender: Gender.OTHERS,
                        onboarding_completed: false,
                        whatsapp_allowed: false
                    },
                    message: errorMessage
                };
            }
        });

        fastify.get('/phone/:phone', {
            preHandler: [authMiddleware, requireUser],
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
        }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: User; message: string }> => {
            try {
                const raw = await userService.getUserByPhone((request.params as any).phone);
                const data = serializeDates<User>(raw);
                return {
                    success: true,
                    data,
                    message: "User retrieved successfully"
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Internal server error";
                reply.status(500).send(createErrorResponse(errorMessage, 500));
                return {
                    success: false,
                    data: {
                        id: 0,
                        email: '',
                        name: '',
                        phone: '',
                        avatar_url: '',
                        preferred_language: Language.ENGLISH,
                        plan_type: PlanType.FREE,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        is_active: false,
                        last_active_at: undefined,
                        paid_at: undefined,
                        dob: undefined,
                        bio: '',
                        gender: Gender.OTHERS,
                        onboarding_completed: false,
                        whatsapp_allowed: false
                    },
                    message: errorMessage
                };
            }
        });

        fastify.get('/email/:email', {
            preHandler: [authMiddleware, requireUser],
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
        }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: User; message: string }> => {
            try {
                const raw = await userService.getUserByEmail((request.params as any).email);
                const data = serializeDates<User>(raw);
                return {
                    success: true,
                    data,
                    message: "User retrieved successfully"
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Internal server error";
                reply.status(500).send(createErrorResponse(errorMessage, 500));
                return {
                    success: false,
                    data: {
                        id: 0,
                        email: '',
                        name: '',
                        phone: '',
                        avatar_url: '',
                        preferred_language: Language.ENGLISH,
                        plan_type: PlanType.FREE,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        is_active: false,
                        last_active_at: undefined,
                        paid_at: undefined,
                        dob: undefined,
                        bio: '',
                        gender: Gender.OTHERS,
                        onboarding_completed: false,
                        whatsapp_allowed: false
                    },
                    message: errorMessage
                };
            }
        });

        fastify.patch('/:id', {
            preHandler: [authMiddleware, requireUser],
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
        }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: User; message: string }> => {
            try {
                const userId = parseInt((request.params as any).id);
                if (isNaN(userId)) {
                    reply.status(400).send(createErrorResponse("Invalid user ID", 400));
                    return {
                        success: false,
                        data: {
                            id: 0,
                            email: '',
                            name: '',
                            phone: '',
                            avatar_url: '',
                            preferred_language: Language.ENGLISH,
                            plan_type: PlanType.FREE,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            is_active: false,
                            last_active_at: undefined,
                            paid_at: undefined,
                            dob: undefined,
                            bio: '',
                            gender: Gender.OTHERS,
                            onboarding_completed: false,
                            whatsapp_allowed: false
                        },
                        message: "Invalid user ID"
                    };
                }

                const raw = await userService.updateUser(userId, request.body as UpdateUserRequest);
                const data = serializeDates<User>(raw);
                return {
                    success: true,
                    data,
                    message: "User updated successfully"
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Internal server error";
                reply.status(500).send(createErrorResponse(errorMessage, 500));
                return {
                    success: false,
                    data: {
                        id: 0,
                        email: '',
                        name: '',
                        phone: '',
                        avatar_url: '',
                        preferred_language: Language.ENGLISH,
                        plan_type: PlanType.FREE,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        is_active: false,
                        last_active_at: undefined,
                        paid_at: undefined,
                        dob: undefined,
                        bio: '',
                        gender: Gender.OTHERS,
                        onboarding_completed: false,
                        whatsapp_allowed: false
                    },
                    message: errorMessage
                };
            }
        });

        fastify.delete('/:id', {
            preHandler: [authMiddleware, requireAdmin],
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
                    reply.status(400).send(createErrorResponse("Invalid user ID", 400));
                    return {
                        success: false,
                        message: "Invalid user ID"
                    };
                }

                await userService.deleteUser(userId);
                return {
                    success: true,
                    message: "User deleted successfully"
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
    });
}
