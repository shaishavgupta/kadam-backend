import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../service/auth.service';
import { AuthyoService } from '../service/authyo.service';
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
    UserWithAuthResponseSchema,
    AdminResponseSchema,
    CreatorWithUserResponseSchema,
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
    CreateUserWithAuthRequest,
    CreateAdminRequest,
    CreateCreatorWithUserRequest
} from '../schemas/auth';
import {
    AdminLoginRequestSchema,
    AdminLoginResponseSchema,
    AdminLoginRequest,
    AdminLoginResponse
} from '../schemas/admin';

const authService = new AuthService();
const authyoService = new AuthyoService();
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
            const { phone } = request.body;

            // For development/local environment, use AuthService directly
            if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local') {
                const data = await authService.sendOtp(request.body);
                return data;
            }

            // For production, coordinate with AuthyoService
            const authyoRequest = {
                to: `91${phone}`,
                expiry: 600, // 10 minutes
                otplength: 6,
                authway: 'SMS' as const
            };

            const authyoResponse = await authyoService.sendOtp(authyoRequest);

            // Check if OTP was sent successfully
            if (!authyoResponse.success || !authyoResponse.data.results.length) {
                throw new Error('Failed to send OTP via Authyo');
            }

            // Get the first result (should be the only one for single phone number)
            const result = authyoResponse.data.results[0];

            if (!result.success) {
                throw new Error(result.message || 'Failed to send OTP');
            }

            // Store maskId in cache for verification (10 minutes)
            const { cache } = await import('../infra');
            await cache.set(`maskId:${phone}`, result.maskId, 10 * 60);

            return {
                success: true,
                message: "OTP sent successfully"
            };
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

            let isValid = false;

            // For development/local environment, use AuthService directly
            if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local') {
                isValid = await authService.verifyOtp(request.body);
            } else {
                // For production, coordinate with AuthyoService
                const { cache } = await import('../infra');
                const maskId = await cache.get(`maskId:${phone}`);

                if (!maskId) {
                    throw new Error("OTP session expired or invalid");
                }

                const authyoResponse = await authyoService.verifyOtp({
                    maskId: maskId,
                    otp: otp
                });

                if (!authyoResponse.success) {
                    throw new Error(authyoResponse.error || 'Invalid OTP');
                }

                // Clear the maskId from cache after successful verification
                await cache.delete(`maskId:${phone}`);
                isValid = true;
            }

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
            description: 'Authenticate admin user with token and generate JWT',
            body: AdminLoginRequestSchema,
            response: {
                200: AdminLoginResponseSchema,
                401: AdminLoginResponseSchema,
                500: AdminLoginResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Body: AdminLoginRequest }>, reply: FastifyReply): Promise<AdminLoginResponse> => {
        try {
            const { email, token } = request.body;

            // Authenticate admin using the token
            const authResult = await adminService.authenticateAdmin(token);

            if (!authResult) {
                reply.status(401);
                return {
                    success: false,
                    message: 'Invalid admin token or credentials'
                };
            }

            // Verify email matches (optional additional check)
            if (authResult.admin.email !== email) {
                reply.status(401);
                return {
                    success: false,
                    message: 'Email does not match admin token'
                };
            }

            return {
                success: true,
                data: {
                    token: authResult.jwtToken,
                    user: {
                        id: authResult.admin.id,
                        email: authResult.admin.email,
                        role: authResult.admin.role
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
}
