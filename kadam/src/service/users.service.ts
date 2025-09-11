import { UserRepository } from "../repository/users.repository";
import { User, CreateUserRequest, UpdateUserRequest, SendOtpRequest, VerifyOtpRequest, VerifyOtpResponse, PaginatedUsersResponse } from "../shared/types/users.types";
import { cache } from "../infra/cache";

export const MAX_OTP_ATTEMPTS = 3;
export const OTP_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes
export const OTP_LIMIT_RESET_TIME = 10 * 60 * 1000; // 10 minutes

export class UserService {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendOtp(request: SendOtpRequest): Promise<void> {
        try {
            const { phone } = request;

            const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
            if (!phoneRegex.test(phone)) {
                throw new Error("Invalid phone number format");
            }

            const otpKey = `otp:${phone}`;
            const existingOtpData = await cache.get(otpKey);

            if (existingOtpData && existingOtpData.attempts >= MAX_OTP_ATTEMPTS) {
                const timeSinceLastAttempt = Date.now() - new Date(existingOtpData.expiresAt).getTime();
                if (timeSinceLastAttempt < OTP_LIMIT_RESET_TIME) {
                    throw new Error("Too many OTP requests. Please try again in 10 mins.");
                } else {
                    await cache.delete(otpKey);
                }
            }

            const otp = this.generateOtp();
            const expiresAt = new Date(Date.now() + OTP_EXPIRATION_TIME);

            const attempts = existingOtpData ? existingOtpData.attempts + 1 : 1;
            const otpData = {
                otp,
                expiresAt: expiresAt.toISOString(),
                attempts
            };

            const ttlSeconds = Math.floor(OTP_EXPIRATION_TIME / 1000);
            await cache.set(otpKey, otpData, ttlSeconds);

            console.log(`OTP for ${phone}: ${otp}`);

        } catch (error) {
            console.error("Error sending OTP:", error);
            throw new Error("Failed to send OTP");
        }
    }

    async verifyOtpAndGetOrCreateUser(request: VerifyOtpRequest): Promise<VerifyOtpResponse> {
        try {
            const { phone, otp } = request;

            const otpKey = `otp:${phone}`;
            const storedOtpData = await cache.get(otpKey);
            if (!storedOtpData) {
                throw new Error("OTP not found. Please request a new OTP.");
            }

            if (new Date(storedOtpData.expiresAt) < new Date()) {
                await cache.delete(otpKey);
                throw new Error("OTP has expired. Please request a new OTP.");
            }

            if (storedOtpData.otp !== otp) {
                throw new Error("Invalid OTP. Please try again.");
            }

            await cache.delete(otpKey);

            const existingUser = await this.userRepository.findUserByPhone(phone);
            if (existingUser) {
                // Update last active and return existing user
                await this.userRepository.updateLastActive(existingUser.id);
                return {
                    accessToken: "", // Replace with actual token generation
                    refreshToken: "", // Replace with actual token generation
                    isNewUser: false,
                    userId: existingUser.id
                };
            }

            throw new Error("User registration required.");

        } catch (error) {
            console.error("Error verifying OTP:", error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Failed to verify OTP");
        }
    }

    async createUser(userData: CreateUserRequest): Promise<User> {
        try {
                        return this.userRepository.createUser(userData);
        } catch (error) {
            console.error("Error creating user:", error);
            throw error;
        }
    }

    async getUserById(id: number): Promise<User> {
        try {
                        const user = await this.userRepository.findUserById(id);
            if (user) {
                return user;
            }
            throw new Error("User not found");
        } catch (error) {
            console.error("Error getting user by ID:", error);
            throw error;
        }
    }

    async getUserByPhone(phone: string): Promise<User> {
        try {
                        const user = await this.userRepository.findUserByPhone(phone);
            if (user) {
                return user;
            }
            throw new Error("User not found");
        } catch (error) {
            console.error("Error getting user by phone:", error);
            throw error;
        }
    }

    async getUserByEmail(email: string): Promise<User> {
        try {
                        const user = await this.userRepository.findUserByEmail(email);
            if (user) {
                return user;
            }
            throw new Error("User not found");
        } catch (error) {
            console.error("Error getting user by email:", error);
            throw error;
        }
    }

    async updateUser(id: number, userData: UpdateUserRequest): Promise<User> {
        try {
                        return this.userRepository.updateUser(id, userData);
        } catch (error) {
            console.error("Error updating user:", error);
            throw error;
        }
    }

    async deleteUser(id: number): Promise<void> {
        try {
                        await this.userRepository.deleteUser(id);
        } catch (error) {
            console.error("Error deleting user:", error);
            throw error;
        }
    }

    async getAllUsers(page: number = 1, limit: number = 10): Promise<PaginatedUsersResponse> {
        try {
            return this.userRepository.getAllUsers(page, limit);
        } catch (error) {
            console.error("Error getting all users:", error);
            throw error;
        }
    }

    async cleanupExpiredOtps(): Promise<void> {
        console.log("Redis cache handles OTP expiration automatically via TTL");
    }
}
