import jwt from "jsonwebtoken";
import { cache } from '../infra';
import {
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
} from '../schemas/auth';
import { UserType as UserTypeEnum } from "../shared/enums";
import { authConfig } from '../config';
import { QueueService } from "./queue.service";
import { config } from '../config';

const OTP_REDIS_KEY = "otp:{phone}";
export class AuthService {
    constructor() {
        // No service dependencies
    }

    /**
     * Send OTP to the provided phone number
     */
    async sendOtp(request: SendOtpRequest): Promise<SendOtpResponse> {
        try {
            const { phone } = request;

            // Generate a 6-digit OTP
            const otp = this.generateOtp();

            // Store OTP in cache/database with expiration (5 minutes)
            await cache.set(OTP_REDIS_KEY.replace("{phone}", phone), otp, 5 * 60);

            // Send OTP via SMS (implement actual SMS service)
            await QueueService.sendOtpNotification("OTP Verification", "Your OTP is {otp}", phone, { otp: otp });

            return {
                success: true,
                message: "OTP sent successfully"
            };
        } catch (error) {
            console.error("Error sending OTP:", error);
            throw new Error("Failed to send OTP");
        }
    }

    /**
     * Verify OTP and return authentication response
     * Note: User creation logic is handled by the controller based on userType
     */
    async verifyOtp(request: VerifyOtpRequest): Promise<boolean> {
        try {
            const { phone, otp } = request;

            if (config.NODE_ENV === 'development') {
                return true;
            }

            // Verify OTP
            const isValidOtp = await cache.get(OTP_REDIS_KEY.replace("{phone}", phone));
            if (!isValidOtp || isValidOtp !== otp) {
                throw new Error("Invalid OTP");
            }

            return true;
        } catch (error) {
            console.error("Error verifying OTP:", error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Failed to verify OTP");
        }
    }

    /**
     * Generate a 6-digit OTP
     */
    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Generate JWT tokens
     */
    async generateTokens(userId: number, userType: UserTypeEnum): Promise<{ accessToken: string; refreshToken: string }> {
        // TODO: Implement actual JWT token generation
        // For now, return placeholder tokens
        const token = jwt.sign(
            { sub: userId, userType: userType },
            authConfig.JWT_SECRET,
            { expiresIn: '24h' }
        );
        const refreshToken = jwt.sign(
            { sub: userId, userType: userType },
            authConfig.JWT_SECRET,
            { expiresIn: '7d' }
        );
        return {
            accessToken: token,
            refreshToken: refreshToken
        };
    }
}
