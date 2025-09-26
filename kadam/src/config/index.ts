/**
 * Centralized configuration for the Kadam backend application
 * All environment variables are loaded and validated here
 *
 * IMPORTANT: All values must be provided via environment variables
 * Use .env.example as a template for required variables
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface Config {
    // Application
    NODE_ENV: string;
    PORT: number;
    DOMAIN: string;
    LOG_LEVEL: string;

    // Database
    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_SSL: boolean;

    // Redis Cache
    REDIS_HOST: string;
    REDIS_PORT: number;
    REDIS_USERNAME?: string;
    REDIS_PASSWORD?: string;

    // JWT Authentication
    JWT_SECRET: string;

    // OpenTelemetry Tracing
    OTEL_SERVICE_NAME: string;
    OTEL_EXPORTER_OTLP_ENDPOINT: string;

    // AWS
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_REGION: string;
    AWS_S3_COURSES_BUCKET: string;

    // Authyo OTP Service
    AUTHYO_CLIENT_ID: string;
    AUTHYO_CLIENT_SECRET: string;
    AUTHYO_BASE_URL: string;

    // OpenAI API
    OPENAI_API_KEY: string;
    OPENAI_BASE_URL?: string;
}

/**
 * Load and validate configuration from environment variables
 * All values must be provided via environment variables - no defaults
 */
function loadConfig(): Config {
    const config: Config = {
        // Application
        NODE_ENV: process.env.NODE_ENV!,
        PORT: parseInt(process.env.PORT!, 10),
        DOMAIN: process.env.DOMAIN!,
        LOG_LEVEL: process.env.LOG_LEVEL!,

        // Database
        DB_HOST: process.env.DB_HOST!,
        DB_PORT: parseInt(process.env.DB_PORT!, 10),
        DB_NAME: process.env.DB_NAME!,
        DB_USER: process.env.DB_USER!,
        DB_PASSWORD: process.env.DB_PASSWORD!,
        DB_SSL: process.env.NODE_ENV === 'production' && process.env.DB_HOST !== 'postgres',

        // Redis Cache
        REDIS_HOST: process.env.REDIS_HOST!,
        REDIS_PORT: parseInt(process.env.REDIS_PORT!, 10),
        REDIS_USERNAME: process.env.REDIS_USERNAME,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,

        // JWT Authentication
        JWT_SECRET: process.env.JWT_SECRET!,

        // OpenTelemetry Tracing
        OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME!,
        OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT!,

        // AWS
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
        AWS_REGION: process.env.AWS_REGION!,
        AWS_S3_COURSES_BUCKET: process.env.AWS_S3_COURSES_BUCKET!,

        // Authyo OTP Service
        AUTHYO_CLIENT_ID: process.env.AUTHYO_CLIENT_ID!,
        AUTHYO_CLIENT_SECRET: process.env.AUTHYO_CLIENT_SECRET!,
        AUTHYO_BASE_URL: process.env.AUTHYO_BASE_URL!,

        // OpenAI API
        OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    };

    // Validate required configuration
    validateConfig(config);

    return config;
}

/**
 * Validate required configuration values
 * All environment variables are required - no fallbacks allowed
 */
function validateConfig(config: Config): void {
    const requiredFields: (keyof Config)[] = [
        // Application
        'NODE_ENV',
        'PORT',
        'DOMAIN',
        'LOG_LEVEL',

        // Database
        'DB_HOST',
        'DB_PORT',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',

        // Redis
        'REDIS_HOST',
        'REDIS_PORT',

        // JWT Authentication
        'JWT_SECRET',

        // OpenTelemetry
        'OTEL_SERVICE_NAME',
        'OTEL_EXPORTER_OTLP_ENDPOINT',

        // AWS
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'AWS_S3_COURSES_BUCKET',

        // Authyo OTP Service
        'AUTHYO_CLIENT_ID',
        'AUTHYO_CLIENT_SECRET',
        'AUTHYO_BASE_URL',

        // OpenAI API
        'OPENAI_API_KEY',
    ];

    const missingFields = requiredFields.filter(field => {
        const value = config[field];
        return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
        console.error('❌ Missing required environment variables:');
        missingFields.forEach(field => {
            console.error(`   - ${field}`);
        });
        console.error('\n💡 Please check your .env file and ensure all required variables are set.');
        console.error('   Use .env.example as a template.');
        throw new Error(`Missing required configuration: ${missingFields.join(', ')}`);
    }

    // Validate numeric fields
    if (isNaN(config.PORT) || config.PORT <= 0) {
        throw new Error('PORT must be a positive number');
    }

    if (isNaN(config.DB_PORT) || config.DB_PORT <= 0) {
        throw new Error('DB_PORT must be a positive number');
    }

    if (isNaN(config.REDIS_PORT) || config.REDIS_PORT <= 0) {
        throw new Error('REDIS_PORT must be a positive number');
    }

    // Validate environment
    const validEnvironments = ['local', 'development', 'production'];
    if (!validEnvironments.includes(config.NODE_ENV)) {
        throw new Error(`NODE_ENV must be one of: ${validEnvironments.join(', ')}`);
    }

    console.log('✅ All required environment variables are configured');
}

// Export the configuration instance
export const config = loadConfig();

// Export individual config sections for convenience
export const appConfig = {
    NODE_ENV: config.NODE_ENV,
    PORT: config.PORT,
    DOMAIN: config.DOMAIN,
    LOG_LEVEL: config.LOG_LEVEL,
};

export const dbConfig = {
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    ssl: config.DB_SSL ? { rejectUnauthorized: false } : false,
};

export const redisConfig = {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    username: config.REDIS_USERNAME,
    password: config.REDIS_PASSWORD,
};

export const authConfig = {
    JWT_SECRET: config.JWT_SECRET,
};

export const tracingConfig = {
    serviceName: config.OTEL_SERVICE_NAME,
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    environment: config.NODE_ENV,
};

export const awsConfig = {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    region: config.AWS_REGION,
    s3: {
        coursesBucket: config.AWS_S3_COURSES_BUCKET,
        // S3 prefixes (folders) within the courses bucket
        prefixes: {
            rawVideos: 'raw-videos',
            processedVideos: 'processed-videos',
        }
    },
};

export const authyoConfig = {
    clientId: config.AUTHYO_CLIENT_ID,
    clientSecret: config.AUTHYO_CLIENT_SECRET,
    baseUrl: config.AUTHYO_BASE_URL,
};

export const openaiConfig = {
    apiKey: config.OPENAI_API_KEY,
    baseUrl: config.OPENAI_BASE_URL || 'https://api.openai.com/v1',
};
