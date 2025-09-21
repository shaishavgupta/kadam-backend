import { FastifyRequest, FastifyReply } from 'fastify';
import { appConfig } from '../../config';

export interface ApiError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = async (error: ApiError, request: FastifyRequest, reply: FastifyReply) => {
    let errorResponse = { ...error };
    errorResponse.message = error.message;

    console.error('Error:', error);

    if (!error.statusCode) {
        errorResponse = new AppError('Internal Server Error', 500);
    }

    return reply.status(errorResponse.statusCode || 500).send({
        success: false,
        message: errorResponse.message || 'Internal Server Error',
        ...(appConfig.NODE_ENV === 'development' && { stack: error.stack })
    });
};
