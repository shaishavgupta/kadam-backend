import jwt from "jsonwebtoken";
import { cache } from '../infra';
import {
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
} from '../schemas/auth';
import { Language, UserType as UserTypeEnum } from "../shared/enums";
import { authConfig, authyoConfig } from '../config';
import { config } from '../config';
import { ApiClient, ExternalApiResponse } from '../shared/api';

const MASK_ID_REDIS_KEY = "maskId:{phone}";
const OTP_RATE_LIMIT_KEY = "otp_rate_limit:{phone}";
const AUTHYO_RESPONSE_CACHE_KEY = "authyo_response:{hash}";
const TOKEN_CACHE_KEY = "token:{userId}:{userType}:{language}";
const REFRESH_TOKEN_CACHE_KEY = "refresh_token:{tokenHash}";

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
     * Generate cache key with parameters
     */
    private generateCacheKey(template: string, params: Record<string, string | number>): string {
        let key = template;
        for (const [param, value] of Object.entries(params)) {
            key = key.replace(`{${param}}`, String(value));
        }
        return key;
    }

    /**
     * Generate hash for request caching
     */
    private generateRequestHash(request: any): string {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(JSON.stringify(request)).digest('hex');
    }

    /**
     * Send OTP to the provided phone number using Authyo service
     */
    async sendOtp(request: SendOtpRequest): Promise<SendOtpResponse> {
        try {
            const { phone } = request;

            // Rate limiting: Check if OTP was sent recently (1 minute cooldown)
            const rateLimitKey = this.generateCacheKey(OTP_RATE_LIMIT_KEY, { phone });
            const lastSent = await cache.get(rateLimitKey);
            if (lastSent) {
                throw new Error("OTP already sent recently. Please wait before requesting again.");
            }

            // For development/local environment, simulate OTP sending
            if (config.NODE_ENV === 'development' || config.NODE_ENV === 'local') {
                // Store a dummy maskId for development
                const maskIdKey = this.generateCacheKey(MASK_ID_REDIS_KEY, { phone });
                await cache.set(maskIdKey, "dev-mask-id", 10 * 60);

                // Set rate limit (1 minute)
                await cache.set(rateLimitKey, Date.now(), 60);

                return {
                    success: true,
                    message: "OTP sent successfully (development mode)"
                };
            }

            // For production, use Authyo service
            const authyoRequest: AuthyoSendOtpRequest = {
                to: `91${phone}`,
                expiry: 600, // 10 minutes
                otplength: 4,
                authway: 'SMS'
            };

            // Check cache for similar requests (cache for 30 seconds to avoid duplicate API calls)
            const requestHash = this.generateRequestHash(authyoRequest);
            const cacheKey = this.generateCacheKey(AUTHYO_RESPONSE_CACHE_KEY, { hash: requestHash });
            let authyoResponse = await cache.get(cacheKey);

            if (!authyoResponse) {
                authyoResponse = await this.sendOtpViaAuthyo(authyoRequest);
                // Cache the response for 30 seconds
                await cache.set(cacheKey, authyoResponse, 30);
            }

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
            const maskIdKey = this.generateCacheKey(MASK_ID_REDIS_KEY, { phone });
            await cache.set(maskIdKey, result.maskId, 10 * 60);

            // Set rate limit (1 minute)
            await cache.set(rateLimitKey, Date.now(), 60);

            return {
                success: true,
                message: "OTP sent successfully"
            };
        } catch (error) {
            console.error("Error sending OTP:", error);
            if (error instanceof Error) {
                throw error;
            }
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
                // Clear rate limit cache after successful verification
                const rateLimitKey = this.generateCacheKey(OTP_RATE_LIMIT_KEY, { phone });
                await cache.delete(rateLimitKey);
                return true;
            }

            // Get maskId from cache
            const maskIdKey = this.generateCacheKey(MASK_ID_REDIS_KEY, { phone });
            const maskId = await cache.get(maskIdKey);
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

            // Clear the maskId and rate limit from cache after successful verification
            await cache.delete(maskIdKey);
            const rateLimitKey = this.generateCacheKey(OTP_RATE_LIMIT_KEY, { phone });
            await cache.delete(rateLimitKey);

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
    async generateTokens(userId: number, userType: UserTypeEnum, language: Language): Promise<{ accessToken: string; refreshToken: string }> {
        // Check cache for existing tokens (cache for 1 hour to avoid regenerating same tokens)
        const tokenCacheKey = this.generateCacheKey(TOKEN_CACHE_KEY, { userId, userType, language });
        const cachedTokens = await cache.get(tokenCacheKey);

        if (cachedTokens) {
            return cachedTokens;
        }

        // Generate new tokens
        const token = jwt.sign(
            { sub: userId, userType: userType, language: language },
            authConfig.JWT_SECRET,
            { expiresIn: '24h' }
        );
        const refreshToken = jwt.sign(
            { sub: userId, userType: userType, language: language },
            authConfig.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const tokens = {
            accessToken: token,
            refreshToken: refreshToken
        };

        // Cache tokens for 1 hour (3600 seconds)
        await cache.set(tokenCacheKey, tokens, 3600);

        return tokens;
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken: string, userType: UserTypeEnum): Promise<{
        success: boolean;
        data?: {
            accessToken: string;
            refreshToken: string;
            user: {
                id: number;
                userType: UserTypeEnum;
            };
        };
        message: string;
    }> {
        try {
            // Check cache for refresh token validation (cache for 5 minutes)
            const tokenHash = this.generateRequestHash(refreshToken);
            const refreshTokenCacheKey = this.generateCacheKey(REFRESH_TOKEN_CACHE_KEY, { tokenHash });
            const cachedValidation = await cache.get(refreshTokenCacheKey);

            let decoded: any;
            if (cachedValidation) {
                decoded = cachedValidation;
            } else {
                // Verify the refresh token
                decoded = jwt.verify(refreshToken, authConfig.JWT_SECRET) as any;
                // Cache the decoded token for 5 minutes
                await cache.set(refreshTokenCacheKey, decoded, 300);
            }

            // Check if the user type matches
            if (decoded.userType !== userType) {
                return {
                    success: false,
                    message: 'Invalid user type for refresh token'
                };
            }

            const userId = decoded.sub;
            if (!userId) {
                return {
                    success: false,
                    message: 'Invalid refresh token'
                };
            }

            const language = decoded.language;
            if (!language) {
                return {
                    success: false,
                    message: 'Invalid language for refresh token'
                };
            }

            // Generate new tokens
            const newTokens = await this.generateTokens(userId, userType, language);

            return {
                success: true,
                data: {
                    accessToken: newTokens.accessToken,
                    refreshToken: newTokens.refreshToken,
                    user: {
                        id: userId,
                        userType: userType
                    }
                },
                message: 'Tokens refreshed successfully'
            };

        } catch (error) {
            console.error('Refresh token error:', error);

            if (error instanceof jwt.JsonWebTokenError) {
                return {
                    success: false,
                    message: 'Invalid or expired refresh token'
                };
            }

            return {
                success: false,
                message: 'Internal server error during token refresh'
            };
        }
    }
}
