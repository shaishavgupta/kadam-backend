import jwt from "jsonwebtoken";
import { cache } from '../infra';
import {
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
} from '../schemas/auth';
import { UserType as UserTypeEnum } from "../shared/enums";
import { authConfig, authyoConfig } from '../config';
import { config } from '../config';
import { ApiClient, ExternalApiResponse } from '../shared/api';

const MASK_ID_REDIS_KEY = "maskId:{phone}";

// Authyo API interfaces
export interface AuthyoSendOtpRequest {
    to: string;
    expiry: number;
    otplength: number;
    authway: 'SMS' | 'WhatsApp';
}

export interface AuthyoSendOtpResult {
    success: boolean;
    message: string;
    to: string;
    authType: string;
    maskId: string;
    createdTime: number;
    expireTime: number;
    charge: string;
    currency: string;
}

export interface AuthyoSendOtpResponse {
    success: boolean;
    message: string;
    data: {
        isTried: number;
        isSent: number;
        results: AuthyoSendOtpResult[];
    };
}

export interface AuthyoVerifyOtpRequest {
    maskId: string;
    otp: string;
}

export interface AuthyoVerifyOtpResponse {
    success: boolean;
    message: string;
    error?: string;
}

export class AuthService {
    private apiClient: ApiClient;

    constructor() {
        this.apiClient = new ApiClient({
            baseURL: authyoConfig.baseUrl,
            defaultHeaders: {
                'clientId': authyoConfig.clientId,
                'clientSecret': authyoConfig.clientSecret,
                'Content-Type': 'application/json'
            },
            defaultTimeout: 30000
        });
    }

    /**
     * Send OTP to the provided phone number using Authyo service
     */
    async sendOtp(request: SendOtpRequest): Promise<SendOtpResponse> {
        try {
            const { phone } = request;

            // For development/local environment, simulate OTP sending
            if (config.NODE_ENV === 'development' || config.NODE_ENV === 'local') {
                // Store a dummy maskId for development
                await cache.set(MASK_ID_REDIS_KEY.replace("{phone}", phone), "dev-mask-id", 10 * 60);
                return {
                    success: true,
                    message: "OTP sent successfully (development mode)"
                };
            }

            // For production, use Authyo service
            const authyoRequest: AuthyoSendOtpRequest = {
                to: `91${phone}`,
                expiry: 600, // 10 minutes
                otplength: 6,
                authway: 'SMS'
            };

            const authyoResponse = await this.sendOtpViaAuthyo(authyoRequest);

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
            await cache.set(MASK_ID_REDIS_KEY.replace("{phone}", phone), result.maskId, 10 * 60);

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
     * Verify OTP using Authyo service
     */
    async verifyOtp(request: VerifyOtpRequest): Promise<boolean> {
        try {
            const { phone, otp } = request;

            // For development/local environment, skip OTP verification
            if (config.NODE_ENV === 'development' || config.NODE_ENV === 'local') {
                return true;
            }

            // Get maskId from cache
            const maskId = await cache.get(MASK_ID_REDIS_KEY.replace("{phone}", phone));
            if (!maskId) {
                throw new Error("OTP session expired or invalid");
            }

            // Verify OTP using Authyo service
            const authyoResponse = await this.verifyOtpViaAuthyo({
                maskId: maskId,
                otp: otp
            });

            if (!authyoResponse.success) {
                throw new Error(authyoResponse.error || 'Invalid OTP');
            }

            // Clear the maskId from cache after successful verification
            await cache.delete(MASK_ID_REDIS_KEY.replace("{phone}", phone));

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
     * Send OTP using Authyo service
     */
    private async sendOtpViaAuthyo(request: AuthyoSendOtpRequest): Promise<AuthyoSendOtpResponse> {
        try {
            const response: ExternalApiResponse<AuthyoSendOtpResponse> = await this.apiClient.post(
                '/api/v1/auth/sendotp',
                request
            );

            return response.data;
        } catch (error) {
            console.error('Authyo send OTP error:', error);
            return {
                success: false,
                message: 'Failed to send OTP',
                data: {
                    isTried: 0,
                    isSent: 0,
                    results: []
                }
            };
        }
    }

    /**
     * Verify OTP using Authyo service
     */
    private async verifyOtpViaAuthyo(request: AuthyoVerifyOtpRequest): Promise<AuthyoVerifyOtpResponse> {
        try {
            const response: ExternalApiResponse<AuthyoVerifyOtpResponse> = await this.apiClient.get(
                '/api/v1/auth/verifyotp',
                {
                    params: {
                        maskId: request.maskId,
                        otp: request.otp
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Authyo verify OTP error:', error);
            return {
                success: false,
                message: 'Failed to verify OTP',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
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
