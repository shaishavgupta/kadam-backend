/**
 * Centralized configuration for the Kadam backend application
 * All environment variables are loaded and validated here
 */

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
}

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): Config {
    const config: Config = {
        // Application
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: parseInt(process.env.PORT || '3001', 10),
        DOMAIN: process.env.DOMAIN || 'http://localhost',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',

        // Database
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
        DB_NAME: process.env.DB_NAME || 'kadam_db',
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'password',
        DB_SSL: process.env.NODE_ENV === 'production' && process.env.DB_HOST !== 'postgres',

        // Redis Cache
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
        REDIS_USERNAME: process.env.REDIS_USERNAME,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,

        // JWT Authentication
        JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret',

        // OpenTelemetry Tracing
        OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME || 'kadam-backend',
        OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    };

    // Validate required configuration
    validateConfig(config);

    return config;
}

/**
 * Validate required configuration values
 */
function validateConfig(config: Config): void {
    const requiredFields: (keyof Config)[] = [
        'JWT_SECRET',
    ];

    const missingFields = requiredFields.filter(field => !config[field]);

    if (missingFields.length > 0) {
        throw new Error(`Missing required configuration: ${missingFields.join(', ')}`);
    }

    // Warn about fallback values in production
    if (config.NODE_ENV === 'production') {
        const fallbackFields = [];

        if (config.JWT_SECRET === 'fallback-secret') {
            fallbackFields.push('JWT_SECRET');
        }

        if (fallbackFields.length > 0) {
            console.warn(`⚠️  Using fallback values in production for: ${fallbackFields.join(', ')}`);
        }
    }
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
