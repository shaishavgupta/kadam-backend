import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../service/auth.service';
import { UserService } from '../service/users.service';
import { AdminService } from '../service/admin.service';
import { CreatorService } from '../service/creators.service';
import { User } from '../shared/types/users.types';
import { Admin } from '../shared/types/admin.types';
import { Creator } from '../shared/types/creators.types';
import { authMiddleware, AuthenticatedRequest } from '../shared/middleware/auth';
import { UserType as UserTypeEnum } from '../shared/enums';
import {
    SendOtpRequestSchema,
    SendOtpResponseSchema,
    VerifyOtpRequestSchema,
    VerifyOtpResponseSchema,
    CreateUserWithAuthRequestSchema,
    CreateAdminRequestSchema,
    CreateCreatorWithUserRequestSchema,
    RefreshTokenRequestSchema,
    RefreshTokenResponseSchema,
    UserWithAuthResponseSchema,
    AdminResponseSchema,
    CreatorWithUserResponseSchema,
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
    CreateUserWithAuthRequest,
    CreateAdminRequest,
    CreateCreatorWithUserRequest,
    RefreshTokenRequest,
    RefreshTokenResponse
} from '../schemas/auth';
import {
    AdminLoginRequestSchema,
    AdminLoginResponseSchema,
    AdminLoginRequest,
    AdminLoginResponse
} from '../schemas/admin';

const authService = new AuthService();
const userService = new UserService();
const adminService = new AdminService();
const creatorService = new CreatorService();

export default async function authRoutes(fastify: FastifyInstance) {

    // Public routes (no authentication required)
    fastify.post('/send-otp', {
        schema: {
            tags: ['Authentication'],
            summary: 'Send OTP',
            description: 'Send OTP to the provided phone number',
            body: SendOtpRequestSchema,
            response: {
                200: SendOtpResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Body: SendOtpRequest }>, reply: FastifyReply): Promise<SendOtpResponse> => {
        try {
            const data = await authService.sendOtp(request.body);
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500).send({
                success: false,
                message: errorMessage
            });
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    fastify.post('/verify-otp', {
        schema: {
            tags: ['Authentication'],
            summary: 'Verify OTP',
            description: 'Verify OTP and authenticate user',
            body: VerifyOtpRequestSchema,
            response: {
                200: VerifyOtpResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Body: VerifyOtpRequest }>, reply: FastifyReply): Promise<VerifyOtpResponse> => {
        try {
            const { phone, otp, language, userType } = request.body;

            // Verify OTP
            const isValid = await authService.verifyOtp(request.body);

            if (!isValid) {
                reply.status(400).send({
                    accessToken: "",
                    refreshToken: "",
                    isNewUser: false,
                    userId: 0
                });
                return {
                    accessToken: "",
                    refreshToken: "",
                    isNewUser: false,
                    userId: 0
                };
            }

            let newEntity: boolean;
            let entity: User | Admin | Creator;

            switch (userType) {
                case UserTypeEnum.USER:
                    const userResult = await userService.getOrCreateUser({
                        phone: phone,
                        preferred_language: language
                    });
                    newEntity = userResult.newEntity;
                    entity = userResult.entity;
                    break;
                case UserTypeEnum.ADMIN:
                    const adminResult = await adminService.getOrCreateAdmin({
                        email: '', // Will be set later
                        name: '', // Will be set later
                        phone: phone,
                        role: 'admin',
                        permissions: []
                    });
                    newEntity = adminResult.newEntity;
                    entity = adminResult.entity;
                    break;
                case UserTypeEnum.CREATOR:
                    const creatorResult = await creatorService.getOrCreateCreator({
                        email: '', // Will be set later
                        name: '', // Will be set later
                        phone: phone,
                        bio: '',
                        avatar_url: ''
                    });
                    newEntity = creatorResult.newEntity;
                    entity = creatorResult.entity;
                    break;
                default:
                    throw new Error("Invalid user type");
            }

            // Generate tokens
            const tokens = await authService.generateTokens(entity.id, userType);

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                isNewUser: true,
                userId: entity.id
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(400).send({
                accessToken: "",
                refreshToken: "",
                isNewUser: false,
                userId: 0
            });
            return {
                accessToken: "",
                refreshToken: "",
                isNewUser: false,
                userId: 0
            };
        }
    });

    // Admin Login endpoint
    fastify.post('/admin/login', {
        schema: {
            tags: ['Admin Authentication'],
            summary: 'Admin Login',
            description: 'Authenticate admin user with email and password',
            body: AdminLoginRequestSchema,
            response: {
                200: AdminLoginResponseSchema,
                401: AdminLoginResponseSchema,
                500: AdminLoginResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Body: AdminLoginRequest }>, reply: FastifyReply): Promise<AdminLoginResponse> => {
        try {
            const { email, password } = request.body;

            // Authenticate admin using email and password
            const authResult = await adminService.authenticateAdmin(email, password);

            if (!authResult) {
                reply.status(401);
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }

            return {
                success: true,
                data: {
                    token: authResult.jwtToken,
                    user: {
                        id: authResult.admin.id,
                        email: authResult.admin.email,
                        name: authResult.admin.name
                    }
                },
                message: 'Admin authenticated successfully'
            };
        } catch (error) {
            console.error('Admin login error:', error);
            reply.status(500);
            return {
                success: false,
                message: 'Internal server error during admin authentication'
            };
        }
    });

    // Refresh token endpoint
    fastify.post('/refresh-token', {
        schema: {
            tags: ['Authentication'],
            summary: 'Refresh Access Token',
            description: 'Generate new access token using refresh token for users, admins, and creators',
            body: RefreshTokenRequestSchema,
            response: {
                200: RefreshTokenResponseSchema,
                401: RefreshTokenResponseSchema,
                500: RefreshTokenResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Body: RefreshTokenRequest }>, reply: FastifyReply): Promise<RefreshTokenResponse> => {
        try {
            const { refreshToken, userType } = request.body;

            // Use auth service to refresh the token
            const result = await authService.refreshToken(refreshToken, userType);

            if (!result.success) {
                reply.status(401);
                return {
                    success: false,
                    message: result.message
                };
            }

            return {
                success: true,
                data: result.data,
                message: result.message
            };

        } catch (error) {
            console.error('Refresh token error:', error);
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            reply.status(500);
            return {
                success: false,
                message: errorMessage
            };
        }
    });
}
