import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../service/auth.service';
import { UserService } from '../service/users.service';
import { AdminService } from '../service/admin.service';
import { CreatorService } from '../service/creators.service';
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
            return reply.status(500).send({
                success: false,
                message: error instanceof Error ? error.message : "Internal server error"
            });
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
            const otpResult = await authService.verifyOtp(request.body);

            if (!otpResult.isValid) {
                return reply.status(400).send({
                    accessToken: "",
                    refreshToken: "",
                    isNewUser: false,
                    userId: 0
                });
            }

            // // Check if user exists
            // let existingUser;
            // try {
            //     existingUser = await userService.getUserByPhone(phone);
            // } catch (error) {
            //     // User doesn't exist, we'll create a new one
            //     existingUser = null;
            // }

            // if (existingUser) {
            //     // Update last active and language preference
            //     await userService.updateUser(existingUser.id, {
            //         preferred_language: language
            //     });

            let newUser;
            let isNewUser = true;

            switch (userType) {
                case UserTypeEnum.USER:
                    newUser = await userService.getOrCreateUser({
                        phone: phone,
                        preferred_language: language
                    });
                    break;
                case UserTypeEnum.ADMIN:
                    newUser = await adminService.getOrCreateAdmin({
                        email: '', // Will be set later
                        name: '', // Will be set later
                        phone: phone,
                        role: 'admin',
                        permissions: []
                    });
                    break;
                case UserTypeEnum.CREATOR:
                    const creatorResult = await creatorService.getOrCreateCreator({
                        email: '', // Will be set later
                        name: '', // Will be set later
                        phone: phone,
                        bio: '',
                        avatar_url: ''
                    });
                    if (creatorResult.error) {
                        throw new Error(creatorResult.error);
                    }
                    newUser = creatorResult.user;
                    break;
                default:
                    throw new Error("Invalid user type");
            }

            // Generate tokens
            const tokens = await authService.generateTokens(newUser.id, userType);

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                isNewUser: true,
                userId: newUser.id
            };
        } catch (error) {
            return reply.status(400).send({
                accessToken: "",
                refreshToken: "",
                isNewUser: false,
                userId: 0
            });
        }
    });
}
