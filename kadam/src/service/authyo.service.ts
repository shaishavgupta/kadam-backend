import { ApiClient, ExternalApiResponse } from '../shared/api';
import { authyoConfig } from '../config';

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
// baseURL?: string;
//         defaultHeaders?: Record<string, string>;
//         defaultTimeout?: number;
export class AuthyoService {
    private apiClient;

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
     * Send OTP using Authyo service
     */
    async sendOtp(request: AuthyoSendOtpRequest): Promise<AuthyoSendOtpResponse> {
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
    async verifyOtp(request: AuthyoVerifyOtpRequest): Promise<AuthyoVerifyOtpResponse> {
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
}
