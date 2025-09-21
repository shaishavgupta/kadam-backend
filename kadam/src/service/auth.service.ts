import jwt from "jsonwebtoken";
import {
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    VerifyOtpResponse
} from '../schemas/auth';
import { UserType as UserTypeEnum } from "../shared/enums";
import { authConfig } from '../config';

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
            await this.storeOtp(phone, otp);

            // Send OTP via SMS (implement actual SMS service)
            await this.sendSms(phone, otp);

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
    async verifyOtp(request: VerifyOtpRequest): Promise<{ isValid: boolean; phone: string; language: any; userType: string }> {
        try {
            const { phone, otp, language, userType } = request;

            // Verify OTP
            const isValidOtp = await this.verifyStoredOtp(phone, otp);
            if (!isValidOtp) {
                throw new Error("Invalid OTP");
            }

            return {
                isValid: true,
                phone,
                language,
                userType
            };
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
     * Store OTP in cache/database with expiration
     */
    private async storeOtp(phone: string, otp: string): Promise<void> {
        // TODO: Implement actual OTP storage (Redis/cache)
        // For now, just log it
        console.log(`Storing OTP for ${phone}: ${otp}`);
    }

    /**
     * Send SMS with OTP
     */
    private async sendSms(phone: string, otp: string): Promise<void> {
        // TODO: Implement actual SMS service (Twilio, AWS SNS, etc.)
        // For now, just log it
        console.log(`Sending SMS to ${phone}: Your OTP is ${otp}`);
    }

    /**
     * Verify stored OTP
     */
    private async verifyStoredOtp(phone: string, otp: string): Promise<boolean> {
        // TODO: Implement actual OTP verification from cache/database
        // For now, accept any 6-digit OTP for testing
        return otp.length === 6 && /^\d+$/.test(otp);
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
