import * as constants from "./constants";
import { UserRepository } from "./repository";
import { User, CreateUserRequest, UpdateUserRequest, SendOtpRequest, VerifyOtpRequest } from "./types";
import log from "encore.dev/log";
import { cache } from "./cache";

export class UserService {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendOtp(request: SendOtpRequest): Promise<{ success: boolean; message: string; error?: string }> {
        try {
            const { phone } = request;

            // Validate phone number format
            const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
            if (!phoneRegex.test(phone)) {
                return { success: false, message: "Invalid phone number format", error: "INVALID_PHONE" };
            }

            // Check rate limiting - max 3 attempts per phone per hour
            const otpKey = `otp:${phone}`;
            const existingOtpData = await cache.get(otpKey);

            if (existingOtpData && existingOtpData.attempts >= constants.MAX_OTP_ATTEMPTS) {
                const timeSinceLastAttempt = Date.now() - new Date(existingOtpData.expiresAt).getTime();
                if (timeSinceLastAttempt < constants.OTP_LIMIT_RESET_TIME) { // 10 minutes
                    return {
                        success: false,
                        message: "Too many OTP requests. Please try again in 10 mins.",
                        error: "RATE_LIMITED"
                    };
                } else {
                    // Reset attempts after 10 minutes
                    await cache.delete(otpKey);
                }
            }

            // Generate new OTP
            const otp = this.generateOtp();
            const expiresAt = new Date(Date.now() + constants.OTP_EXPIRATION_TIME); // 10 minutes

            // Store OTP in Redis cache
            const attempts = existingOtpData ? existingOtpData.attempts + 1 : 1;
            const otpData = {
                otp,
                expiresAt: expiresAt.toISOString(),
                attempts
            };

            // Store with TTL (expiration time in seconds)
            const ttlSeconds = Math.floor(constants.OTP_EXPIRATION_TIME / 1000);
            await cache.set(otpKey, otpData, ttlSeconds);

            // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
            // For development, log the OTP
            console.log(`OTP for ${phone}: ${otp}`);

            // In production, you would send SMS here
            // await this.smsService.sendOtp(phone, otp);

            return {
                success: true,
                message: "OTP sent successfully"
            };
        } catch (error) {
            console.error("Error sending OTP:", error);
            return {
                success: false,
                message: "Failed to send OTP",
                error: "SEND_OTP_FAILED"
            };
        }
    }

    async verifyOtpAndGetOrCreateUser(request: VerifyOtpRequest): Promise<{
        success: boolean;
        user?: User;
        isNewUser?: boolean;
        message: string;
        error?: string
    }> {
        try {
            const { phone, otp } = request;

            // Get OTP data from Redis cache
            const otpKey = `otp:${phone}`;
            const storedOtpData = await cache.get(otpKey);
            if (!storedOtpData) {
                return {
                    success: false,
                    message: "OTP not found. Please request a new OTP.",
                    error: "OTP_NOT_FOUND"
                };
            }

            // Check if OTP is expired
            if (new Date(storedOtpData.expiresAt) < new Date()) {
                await cache.delete(otpKey);
                return {
                    success: false,
                    message: "OTP has expired. Please request a new OTP.",
                    error: "OTP_EXPIRED"
                };
            }

            // Verify OTP
            if (storedOtpData.otp !== otp) {
                return {
                    success: false,
                    message: "Invalid OTP. Please try again.",
                    error: "INVALID_OTP"
                };
            }

            // OTP is valid, remove it from cache
            await cache.delete(otpKey);

            // Check if user already exists
            const existingUser = await this.userRepository.findUserByPhone(phone);
            if (existingUser.user) {
                // Update last active and return existing user
                await this.userRepository.updateLastActive(existingUser.user.id);
                return {
                    success: true,
                    user: existingUser.user,
                    isNewUser: false,
                    message: "OTP verified successfully"
                };
            }

            // OTP verified but no user data provided and user doesn't exist
            return {
                success: true,
                isNewUser: false,
                message: "OTP verified successfully. User registration required."
            };

        } catch (error) {
            console.error("Error verifying OTP:", error);
            return {
                success: false,
                isNewUser: false,
                message: "Failed to verify OTP",
                error: "VERIFY_OTP_FAILED"
            };
        }
    }

    async createUser(userData: CreateUserRequest): Promise<{ user?: User; error?: string }> {
        try {
            return await this.userRepository.createUser(userData);
        } catch (error) {
            console.error("Error creating user:", error);
            return { error: "Failed to create user" };
        }
    }

    async getUserById(id: number): Promise<{ user?: User; error?: string }> {
        try {
            return await this.userRepository.findUserById(id);
        } catch (error) {
            console.error("Error getting user by ID:", error);
            return { error: "Failed to get user" };
        }
    }

    async getUserByPhone(phone: string): Promise<{ user?: User; error?: string }> {
        try {
            return await this.userRepository.findUserByPhone(phone);
        } catch (error) {
            console.error("Error getting user by phone:", error);
            return { error: "Failed to get user" };
        }
    }

    async getUserByEmail(email: string): Promise<{ user?: User; error?: string }> {
        try {
            return await this.userRepository.findUserByEmail(email);
        } catch (error) {
            console.error("Error getting user by email:", error);
            return { error: "Failed to get user" };
        }
    }

    async updateUser(id: number, userData: UpdateUserRequest): Promise<{ user?: User; error?: string }> {
        try {
            return await this.userRepository.updateUser(id, userData);
        } catch (error) {
            console.error("Error updating user:", error);
            return { error: "Failed to update user" };
        }
    }

    async deleteUser(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            return await this.userRepository.deleteUser(id);
        } catch (error) {
            console.error("Error deleting user:", error);
            return { success: false, error: "Failed to delete user" };
        }
    }

    async getAllUsers(page: number = 1, limit: number = 10): Promise<{
        users: User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        error?: string
    }> {
        try {
            const result = await this.userRepository.getAllUsers(page, limit);
            const totalPages = Math.ceil(result.total / limit);

            return {
                users: result.users,
                total: result.total,
                page,
                limit,
                totalPages,
                error: result.error
            };
        } catch (error) {
            console.error("Error getting all users:", error);
            return {
                users: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
                error: "Failed to get users"
            };
        }
    }

    // Clean up expired OTPs periodically (should be called by a cron job)
    // Note: Redis automatically handles TTL expiration, so this method is mainly for logging
    async cleanupExpiredOtps(): Promise<void> {
        // Redis automatically handles TTL expiration, so no manual cleanup needed
        // This method is kept for compatibility but Redis handles expiration automatically
        log.info("Redis cache handles OTP expiration automatically via TTL");
    }
}
