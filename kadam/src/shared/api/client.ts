import { HttpClient, ApiRequestConfig, ExternalApiResponse, ApiError } from './types';

export class HttpError extends Error implements ApiError {
    public status?: number;
    public statusText?: string;
    public data?: any;

    constructor(message: string, status?: number, statusText?: string, data?: any) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.statusText = statusText;
        this.data = data;
    }
}

export class ApiClient implements HttpClient {
    private baseURL?: string;
    private defaultHeaders: Record<string, string>;
    private defaultTimeout: number;

    constructor(config?: {
        baseURL?: string;
        defaultHeaders?: Record<string, string>;
        defaultTimeout?: number;
    }) {
        this.baseURL = config?.baseURL;
        this.defaultHeaders = config?.defaultHeaders || {};
        this.defaultTimeout = config?.defaultTimeout || 30000; // 30 seconds
    }

    async request<T = any>(config: ApiRequestConfig): Promise<ExternalApiResponse<T>> {
        const {
            method,
            url,
            headers = {},
            body,
            params,
            timeout = this.defaultTimeout
        } = config;

        // Build full URL
        let fullUrl = url;
        if (this.baseURL && !url.startsWith('http')) {
            fullUrl = `${this.baseURL}${url.startsWith('/') ? url : `/${url}`}`;
        }

        // Add query parameters
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                searchParams.append(key, String(value));
            });
            fullUrl += `?${searchParams.toString()}`;
        }

        // Merge headers
        const mergedHeaders = {
            'Content-Type': 'application/json',
            ...this.defaultHeaders,
            ...headers
        };

        // Prepare request options
        const requestOptions: RequestInit = {
            method,
            headers: mergedHeaders,
            signal: AbortSignal.timeout(timeout)
        };

        // Add body for non-GET requests
        if (body && method !== 'GET') {
            if (typeof body === 'object') {
                requestOptions.body = JSON.stringify(body);
            } else {
                requestOptions.body = body;
            }
        }

        try {
            const response = await fetch(fullUrl, requestOptions);

            // Parse response headers
            const responseHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            // Parse response body
            let data: T;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text() as unknown as T;
            }

            if (!response.ok) {
                throw new HttpError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    response.statusText,
                    data
                );
            }

            return {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders
            };
        } catch (error) {
            if (error instanceof HttpError) {
                throw error;
            }

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new HttpError('Request timeout', 408, 'Request Timeout');
                }
                throw new HttpError(`Request failed: ${error.message}`);
            }

            throw new HttpError('Unknown error occurred');
        }
    }

    async get<T = any>(url: string, config?: Partial<ApiRequestConfig>): Promise<ExternalApiResponse<T>> {
        return this.request<T>({
            method: 'GET',
            url,
            ...config
        });
    }

    async post<T = any>(url: string, body?: any, config?: Partial<ApiRequestConfig>): Promise<ExternalApiResponse<T>> {
        return this.request<T>({
            method: 'POST',
            url,
            body,
            ...config
        });
    }

    async put<T = any>(url: string, body?: any, config?: Partial<ApiRequestConfig>): Promise<ExternalApiResponse<T>> {
        return this.request<T>({
            method: 'PUT',
            url,
            body,
            ...config
        });
    }

    async patch<T = any>(url: string, body?: any, config?: Partial<ApiRequestConfig>): Promise<ExternalApiResponse<T>> {
        return this.request<T>({
            method: 'PATCH',
            url,
            body,
            ...config
        });
    }

    async delete<T = any>(url: string, config?: Partial<ApiRequestConfig>): Promise<ExternalApiResponse<T>> {
        return this.request<T>({
            method: 'DELETE',
            url,
            ...config
        });
    }
}
