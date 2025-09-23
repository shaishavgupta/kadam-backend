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
}
