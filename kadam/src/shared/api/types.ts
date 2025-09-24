export interface ApiRequestConfig {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: any;
    params?: Record<string, string | number>;
    timeout?: number;
}

export interface ExternalApiResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
}

export interface ApiError {
    message: string;
    status?: number;
    statusText?: string;
    data?: any;
}

export interface HttpClient {
    request<T = any>(config: ApiRequestConfig): Promise<ExternalApiResponse<T>>;
    get<T = any>(url: string, config?: Partial<ApiRequestConfig>): Promise<ExternalApiResponse<T>>;
    post<T = any>(url: string, body?: any, config?: Partial<ApiRequestConfig>): Promise<ExternalApiResponse<T>>;
    put<T = any>(url: string, body?: any, config?: Partial<ApiRequestConfig>): Promise<ExternalApiResponse<T>>;
    patch<T = any>(url: string, body?: any, config?: Partial<ApiRequestConfig>): Promise<ExternalApiResponse<T>>;
    delete<T = any>(url: string, config?: Partial<ApiRequestConfig>): Promise<ExternalApiResponse<T>>;
}
