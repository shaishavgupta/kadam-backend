export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message: string;
    error?: string;
}

export interface TraceContext {
    traceId: string;
    spanId: string;
}

export interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    method?: string;
    url?: string;
    statusCode?: number;
    duration?: string;
    traceId?: string;
    spanId?: string;
    userAgent?: string;
    ip?: string;
    requestId?: string;
    data?: Record<string, any>;
}
