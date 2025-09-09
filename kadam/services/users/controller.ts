import { api } from "encore.dev/api";
import { admin } from "~encore/clients";
import { ApiResponse } from "../shared/types/common";
import jwt from "jsonwebtoken";
import { UserService } from "./service";
import { CreateUserRequest, UpdateUserRequest, User, Language, Gender, PlanType, SendOtpRequest, VerifyOtpRequest, VerifyOtpResponse, Banner } from "./types";
import { AdminConfigurations } from "../shared/types/admin_types";
import { secret } from "encore.dev/config";
import { APIError, ErrCode } from "encore.dev/api";

const userService = new UserService();
export const jwtSecret = secret("JWTSecret");
export const refreshSecret = secret("RefreshTokenSecret");

/**
 * Send OTP to user's phone number
 */
export const sendOtp = api(
    { expose: true, method: "POST", path: "/users/send-otp" },
    async (req: SendOtpRequest): Promise<ApiResponse> => {
        try {
            const result = await userService.sendOtp(req);

            if (!result.success) {
                throw new APIError(ErrCode.InvalidArgument, result.message || "Failed to send OTP");
            }

            return {
                success: true,
                message: result.message,
                data: null
            };
        } catch (error) {
            console.error("Send OTP API error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

/**
 * Verify OTP and create user
 */
export const verifyOtpAndGetOrCreateUser = api(
    { expose: true, method: "POST", path: "/users/verify-otp" },
    async (req: VerifyOtpRequest): Promise<ApiResponse<VerifyOtpResponse>> => {
        try {
            const result = await userService.verifyOtpAndGetOrCreateUser(req);

            if (!result.success) {
                throw new APIError(ErrCode.InvalidArgument, result.message || "Failed to verify OTP");
            }

            const accessToken = jwt.sign({ userID: result.user?.id, userType: 'user' }, jwtSecret(), { expiresIn: '15m' });
            const refreshToken = jwt.sign({ userID: result.user?.id, userType: 'user' }, refreshSecret(), { expiresIn: '7d' });

            return {
                success: true,
                data: {
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    isNewUser: result.isNewUser || false,
                    userId: result.user?.id || 0
                },
                message: result.message
            };
        } catch (error) {
            console.error("Verify OTP API error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

/**
 * Get user by ID
 */
export const getUserById = api(
    { expose: true, auth: true, method: "GET", path: "/users/:id" },
    async ({ id }: { id: string }): Promise<ApiResponse<User>> => {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new APIError(ErrCode.InvalidArgument, "Invalid user ID");
            }

            const result = await userService.getUserById(userId);

            if (result.error) {
                throw new APIError(ErrCode.NotFound, result.error);
            }

            return {
                success: true,
                data: result.user,
                message: "User retrieved successfully"
            };
        } catch (error) {
            console.error("Get user by ID API error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

/**
 * Get user by phone number
 */
export const getUserByPhone = api(
    { expose: true, auth: true, method: "GET", path: "/users/phone/:phone" },
    async ({ phone }: { phone: string }): Promise<ApiResponse<User>> => {
        try {
            const result = await userService.getUserByPhone(phone);

            if (result.error) {
                throw new APIError(ErrCode.NotFound, result.error);
            }

            return {
                success: true,
                data: result.user,
                message: "User retrieved successfully"
            };
        } catch (error) {
            console.error("Get user by phone API error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

/**
 * Get user by email
 */
export const getUserByEmail = api(
    { expose: true, auth: true, method: "GET", path: "/users/email/:email" },
    async ({ email }: { email: string }): Promise<ApiResponse<User>> => {
        try {
            const result = await userService.getUserByEmail(email);

            if (result.error) {
                throw new APIError(ErrCode.NotFound, result.error);
            }

            return {
                success: true,
                data: result.user,
                message: "User retrieved successfully"
            };
        } catch (error) {
            console.error("Get user by email API error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

/**
 * Update user details
 */
export const updateUser = api(
    { expose: true, auth: true, method: "PATCH", path: "/users/:id" },
    async ({ id, ...userData }: { id: string } & UpdateUserRequest): Promise<ApiResponse<User>> => {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new APIError(ErrCode.InvalidArgument, "Invalid user ID");
            }

            const result = await userService.updateUser(userId, userData);

            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }

            return {
                success: true,
                data: result.user,
                message: "User updated successfully"
            };
        } catch (error) {
            console.error("Update user API error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

/**
 * Get all users with pagination
 */
export const getAllUsers = api(
    { expose: true, auth: true, method: "GET", path: "/users" },
    async ({ page = "1", limit = "10" }: { page?: string; limit?: string }): Promise<ApiResponse<{
        users: User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>> => {
        try {
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);

            if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
                throw new APIError(ErrCode.InvalidArgument, "Invalid pagination parameters");
            }

            const result = await userService.getAllUsers(pageNum, limitNum);

            if (result.error) {
                return {
                    success: false,
                    message: result.error,
                    error: "FETCH_FAILED"
                };
            }

            return {
                success: true,
                data: {
                    users: result.users,
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages
                },
                message: "Users retrieved successfully"
            };
        } catch (error) {
            console.error("Get all users API error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

/**
 * Create new user (admin function)
 */
export const createUser = api(
    { expose: true, auth: true, method: "POST", path: "/users" },
    async (req: CreateUserRequest): Promise<ApiResponse<User>> => {
        try {
            const result = await userService.createUser(req);

            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }

            return {
                success: true,
                data: result.user,
                message: "User created successfully"
            };
        } catch (error) {
            console.error("Create user API error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

/**
 * Delete user (soft delete)
 */
export const deleteUser = api(
    { expose: true, auth: true, method: "DELETE", path: "/users/:id" },
    async ({ id }: { id: string }): Promise<ApiResponse> => {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new APIError(ErrCode.InvalidArgument, "Invalid user ID");
            }

            const result = await userService.deleteUser(userId);

            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }

            return {
                success: true,
                message: "User deleted successfully"
            };
        } catch (error) {
            console.error("Delete user API error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

/**
 * Health check endpoint
 */
export const healthCheck = api(
    { expose: true, auth: true, method: "GET", path: "/users/health" },
    async (): Promise<ApiResponse> => {
        return {
            success: true,
            message: "User service is healthy"
        };
    }
);

/**
 * Get enum values for frontend
 */
export const getEnums = api(
    { expose: true, auth: true, method: "GET", path: "/users/enums" },
    async (): Promise<ApiResponse<{
        languages: typeof Language;
        genders: typeof Gender;
        planTypes: typeof PlanType;
    }>> => {
        return {
            success: true,
            data: {
                languages: Language,
                genders: Gender,
                planTypes: PlanType
            },
            message: "Enums retrieved successfully"
        };
    }
);

/**
 * Clean up expired OTPs (admin endpoint)
 */
export const cleanupExpiredOtps = api(
    { expose: true, auth: true, method: "POST", path: "/users/admin/cleanup-otps" },
    async (): Promise<ApiResponse> => {
        try {
            await userService.cleanupExpiredOtps();

            return {
                success: true,
                message: "OTP cleanup completed successfully"
            };
        } catch (error) {
            console.error("OTP cleanup API error:", error);
            return {
                success: false,
                message: "Internal server error",
                error: "INTERNAL_ERROR"
            };
        }
    }
);

/**
 * Get Login Page Content
 * banners: [ [{}], [{}], [{}] ]
*/
export const getLoginPageContent = api(
    { expose: true, auth: false, method: "GET", path: "/users/login-page-content" },
    async (): Promise<ApiResponse<{
        background: { image_url: string }[][];
    }>> => {
        const background = await admin.getAdminConfgurations({ key: AdminConfigurations.loginPageBackground })
        return {
            success: true,
            data: {
                background: background?.data ?? null
            },
            message: "Login page content retrieved successfully"
        };
    }
);

/**
 * Get Home Page Content
*/
export const getHomePageContent = api(
    { expose: true, auth: true, method: "GET", path: "/users/home-page-content" },
    async (): Promise<ApiResponse<{
        banners: Banner[];
    }>> => {
        const bannersRes = await admin.getAdminConfgurations({
            key: AdminConfigurations.homePageBanners,
        });

        const banners: Banner[] = bannersRes.data ?? [];

        return {
            success: true,
            data: {
                banners: banners,
            },
            message: "Home page content retrieved successfully"
        };
    }
);
