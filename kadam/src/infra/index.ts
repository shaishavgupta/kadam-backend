/**
 * Centralized Infrastructure Management
 *
 * This module provides centralized functions to connect and manage
 * all infrastructure components including database, Redis, tracing, and AWS S3.
 */

// Infrastructure Exports
export * from './bullmq';
export * from '../workers/workers';
export * from './db';
export * from './cache';
export * from './tracing';
export * from './aws/s3';

// Import infrastructure components
import { db } from './db';
import pool from './db';
import { redis } from './cache';
import { startTelemetry } from './tracing';
import { getS3Status } from './aws/s3';
import { config } from '../config';

/**
 * Infrastructure Connection Status
 */
export interface InfrastructureStatus {
    database: boolean;
    redis: boolean;
    tracing: boolean;
    s3: boolean;
    overall: boolean;
}

/**
 * Infrastructure Connection Options
 */
export interface InfrastructureOptions {
    enableTracing?: boolean;
    enableS3?: boolean;
    enableDatabase?: boolean;
    enableRedis?: boolean;
}

/**
 * Connect to all infrastructure components
 *
 * @param options - Configuration options for which services to initialize
 * @returns Promise<InfrastructureStatus> - Status of all infrastructure connections
 */
export async function connectInfrastructure(options: InfrastructureOptions = {}): Promise<InfrastructureStatus> {
    const {
        enableTracing = true,
        enableS3 = true,
        enableDatabase = true,
        enableRedis = true
    } = options;

    console.log('🔄 Connecting to infrastructure components...');

    const status: InfrastructureStatus = {
        database: false,
        redis: false,
        tracing: false,
        s3: false,
        overall: false
    };

    try {
        // Connect to Database
        if (enableDatabase) {
            try {
                await db.query('SELECT 1');
                status.database = true;
                console.log('✅ Database connected successfully');
            } catch (error) {
                console.error('❌ Database connection failed:', error);
            }
        }

        // Connect to Redis
        if (enableRedis) {
            try {
                await redis.ping();
                status.redis = true;
                console.log('✅ Redis connected successfully');
            } catch (error) {
                console.error('❌ Redis connection failed:', error);
            }
        }

        // Initialize Tracing
        if (enableTracing) {
            try {
                await startTelemetry();
                status.tracing = true;
                console.log('✅ Tracing initialized successfully');
            } catch (error) {
                console.error('❌ Tracing initialization failed:', error);
            }
        }

        // Check S3 Configuration
        if (enableS3) {
            try {
                const s3Status = getS3Status();
                status.s3 = s3Status.configured;
                if (status.s3) {
                    console.log('✅ S3 configuration verified successfully');
                } else {
                    console.warn('⚠️  S3 not configured - AWS credentials or bucket names missing');
                }
            } catch (error) {
                console.error('❌ S3 configuration check failed:', error);
            }
        }

        // Determine overall status
        const enabledServices = [
            enableDatabase ? status.database : true,
            enableRedis ? status.redis : true,
            enableTracing ? status.tracing : true,
            enableS3 ? status.s3 : true
        ];

        status.overall = enabledServices.every(serviceStatus => serviceStatus === true);

        if (status.overall) {
            console.log('✅ All infrastructure components connected successfully');
        } else {
            console.warn('⚠️  Some infrastructure components failed to connect');
        }

        return status;

    } catch (error) {
        console.error('❌ Infrastructure connection failed:', error);
        status.overall = false;
        return status;
    }
}

/**
 * Check infrastructure health
 *
 * @returns Promise<InfrastructureStatus> - Current health status of all infrastructure
 */
export async function checkInfrastructureHealth(): Promise<InfrastructureStatus> {
    console.log('🔍 Checking infrastructure health...');

    const status: InfrastructureStatus = {
        database: false,
        redis: false,
        tracing: false,
        s3: false,
        overall: false
    };

    try {
        // Check Database
        try {
            await db.query('SELECT 1');
            status.database = true;
        } catch (error) {
            console.error('❌ Database health check failed:', error);
        }

        // Check Redis
        try {
            await redis.ping();
            status.redis = true;
        } catch (error) {
            console.error('❌ Redis health check failed:', error);
        }

        // Check Tracing (assume OK if no errors)
        status.tracing = true;

        // Check S3
        try {
            const s3Status = getS3Status();
            status.s3 = s3Status.configured;
        } catch (error) {
            console.error('❌ S3 health check failed:', error);
        }

        // Determine overall status
        status.overall = status.database && status.redis && status.tracing && status.s3;

        return status;

    } catch (error) {
        console.error('❌ Infrastructure health check failed:', error);
        status.overall = false;
        return status;
    }
}

/**
 * Disconnect from all infrastructure components
 *
 * @returns Promise<void>
 */
export async function disconnectInfrastructure(): Promise<void> {
    console.log('🔄 Disconnecting from infrastructure components...');

    try {
        // Close Redis connection
        try {
            await redis.disconnect();
            console.log('✅ Redis disconnected successfully');
        } catch (error) {
            console.error('❌ Redis disconnection failed:', error);
        }

        // Close Database connection
        try {
            await pool.end();
            console.log('✅ Database disconnected successfully');
        } catch (error) {
            console.error('❌ Database disconnection failed:', error);
        }

        console.log('✅ Infrastructure disconnection completed');

    } catch (error) {
        console.error('❌ Infrastructure disconnection failed:', error);
        throw error;
    }
}

/**
 * Get infrastructure configuration summary
 *
 * @returns Object containing configuration details
 */
export function getInfrastructureConfig() {
    return {
        database: {
            host: config.DB_HOST,
            port: config.DB_PORT,
            name: config.DB_NAME,
            ssl: config.DB_SSL
        },
        redis: {
            host: config.REDIS_HOST,
            port: config.REDIS_PORT,
            username: config.REDIS_USERNAME ? 'configured' : 'not configured',
            password: config.REDIS_PASSWORD ? 'configured' : 'not configured'
        },
        tracing: {
            serviceName: config.OTEL_SERVICE_NAME,
            endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT
        },
        s3: {
            region: config.AWS_REGION,
            buckets: {
                courses: config.AWS_S3_COURSES_BUCKET,
            }
        }
    };
}
