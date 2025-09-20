import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from "jsonwebtoken";
import { UserService } from "../service/users.service";
import { authMiddleware, AuthenticatedRequest } from "../shared/middleware/auth";
import {
    SendOtpRequestSchema,
    SendOtpResponseSchema,
    VerifyOtpRequestSchema,
    VerifyOtpResponseSchema,
    CreateUserRequestSchema,
    UpdateUserRequestSchema,
    UserSchema,
    PaginatedUsersResponseSchema,
    GetUsersQuerySchema,
    UserResponseSchema,
    PaginatedUsersResponseWrapperSchema,
    UserEnumsResponseSchema,
    LoginPageContentResponseSchema,
    HomePageContentResponseSchema,
    CleanupOtpsResponseSchema,
    UserIdParamSchema,
    UserPhoneParamSchema,
    UserEmailParamSchema,
    SendOtpRequest,
    VerifyOtpRequest,
    VerifyOtpResponse,
    CreateUserRequest,
    UpdateUserRequest,
    User,
    PaginatedUsersResponse,
    UserEnumsResponse,
    LoginPageContentResponse,
    HomePageContentResponse,
    CleanupOtpsResponse,
    UserIdParam,
    UserPhoneParam,
    UserEmailParam,
    SendOtpResponse
} from '../schemas/user';
import { SuccessResponseSchema, SuccessResponse } from '../schemas/common';
import { Language, Gender, PlanType } from '../shared/enums';

const userService = new UserService();

export default async function userRoutes(fastify: FastifyInstance) {

    fastify.get('/enums', {
        schema: {
            tags: ['Users'],
            summary: 'Get user enums',
            description: 'Get available enum values for user-related fields',
            security: [{ bearerAuth: [] }],
            response: {
                200: UserEnumsResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<UserEnumsResponse> => {
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

    fastify.post('/send-otp', {
        schema: {
            tags: ['Users'],
            summary: 'Send OTP to user',
            description: 'Send a one-time password to the user\'s phone number',
            body: SendOtpRequestSchema,
            response: {
                200: SendOtpResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Body: SendOtpRequest }>, reply: FastifyReply): Promise<SendOtpResponse | void> => {
        try {
            console.log("Sending OTP to user", request.body);
            await userService.sendOtp(request.body);
            return {
                success: true,
                message: "OTP sent successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
            return;
        }
    });

    fastify.post('/verify-otp', {
        schema: {
            tags: ['Users'],
            summary: 'Verify OTP',
            description: 'Verify the OTP sent to user\'s phone number',
            body: VerifyOtpRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: VerifyOtpResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Body: VerifyOtpRequest }>, reply: FastifyReply): Promise<VerifyOtpResponse | void> => {
        try {
            const result = await userService.verifyOtpAndGetOrCreateUser(request.body);

            const token = jwt.sign(
                { sub: result.userId, userType: 'user' },
                process.env.JWT_SECRET || 'fallback-secret',
                { expiresIn: '24h' }
            );
            const refreshToken = jwt.sign(
                { sub: result.userId, userType: 'user' },
                process.env.JWT_SECRET || 'fallback-secret',
                { expiresIn: '7d' }
            );
            reply.send({
                accessToken: token,
                refreshToken: refreshToken,
                isNewUser: result.isNewUser,
                userId: result.userId
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    fastify.get('/login-page-content', {
        schema: {
            tags: ['Users'],
            summary: 'Get login page content',
            description: 'Get background images and other content for the login page',
            response: {
                200: LoginPageContentResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<LoginPageContentResponse> => {
        try {
            // TODO: Implement admin service call
            const background: { image_url: string }[][] = []; // await admin.getAdminConfgurations({ key: AdminConfigurations.loginPageBackground })

            return {
                success: true,
                data: {
                    background: background
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
        fastify.addHook('preHandler', authMiddleware);

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
        }, async (request: FastifyRequest<{ Params: UserIdParam }>, reply: FastifyReply) => {
            try {
                const userId = parseInt(request.params.id);
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
        }, async (request: FastifyRequest<{ Params: UserPhoneParam }>, reply: FastifyReply) => {
            try {
                const data = await userService.getUserByPhone(request.params.phone);
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
        }, async (request: FastifyRequest<{ Params: UserEmailParam }>, reply: FastifyReply) => {
            try {
                const data = await userService.getUserByEmail(request.params.email);
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
        }, async (request: FastifyRequest<{ Params: UserIdParam; Body: UpdateUserRequest }>, reply: FastifyReply) => {
            try {
                const userId = parseInt(request.params.id);
                if (isNaN(userId)) {
                    return reply.status(400).send({
                        success: false,
                        message: "Invalid user ID"
                    });
                }

                const data = await userService.updateUser(userId, request.body);
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
        }, async (request: FastifyRequest<{ Body: CreateUserRequest }>, reply: FastifyReply) => {
            try {
                const data = await userService.createUser(request.body);
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
        }, async (request: FastifyRequest<{ Params: UserIdParam }>, reply: FastifyReply): Promise<SuccessResponse> => {
            try {
                const userId = parseInt(request.params.id);
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

        fastify.get('/home-page-content', {
            schema: {
                tags: ['Users'],
                summary: 'Get home page content',
                description: 'Get banners and other content for the home page',
                security: [{ bearerAuth: [] }],
                response: {
                    200: HomePageContentResponseSchema
                }
            }
        }, async (request: FastifyRequest, reply: FastifyReply): Promise<HomePageContentResponse> => {
            try {
                // TODO: Implement admin service call
                const banners: any[] = []; // await admin.getAdminConfgurations({ key: AdminConfigurations.homePageBanners })

                return {
                    success: true,
                    data: {
                        banners: banners,
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
    });
}
