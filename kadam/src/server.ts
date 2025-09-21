import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import dotenv from 'dotenv';
import { db } from './infra/db';
import { redis } from './infra/cache';
import { errorHandler } from './shared/middleware/errorHandler';
import { requestLogger } from './shared/middleware/logging';
import { appConfig } from './config';
// Import route handlers
import userRoutes from './controller/users.controller';
import adminRoutes from './controller/admin.controller';
import coursesRoutes from './controller/courses.controller';
import creatorsRoutes from './controller/creators.controller';
import interactionsRoutes from './controller/interactions.controller';
import authRoutes from './controller/auth.controller';
import mediaRoutes from './controller/media.controller';

dotenv.config();

const fastifyInstance = Fastify({
    logger: {
        level: appConfig.LOG_LEVEL
    }
}).withTypeProvider<TypeBoxTypeProvider>();

// Register Swagger plugin
fastifyInstance.register(swagger, {
    openapi: {
        info: {
            title: 'Kadam Backend API',
            description: 'API documentation for the Kadam backend service',
            version: '0.0.1'
        },
        servers: [
            {
                url: getServerUrl(),
                description: 'API server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    }
});

// Register Swagger UI plugin
fastifyInstance.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
        docExpansion: 'full',
        deepLinking: true,
        persistAuthorization: true,
        displayRequestDuration: true,
        tryItOutEnabled: true
    },
    uiHooks: {
        onRequest: function (request: any, reply: any, next: any) {
            next();
        },
        preHandler: function (request: any, reply: any, next: any) {
            next();
        }
    },
    staticCSP: false,
    transformStaticCSP: (header: any) => header
});

fastifyInstance.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Kadam-Path'],
    preflightContinue: false,
    exposedHeaders: ['X-Kadam-Path']
});

// Register error handler
fastifyInstance.setErrorHandler(errorHandler);

// Register request logger as a hook
fastifyInstance.addHook('onRequest', requestLogger);

// Health check endpoint
fastifyInstance.get('/health', async (request: any, reply: any) => {
    const dbStatus = await checkDatabaseConnection();
    const redisStatus = await checkRedisConnection();

    return {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database: dbStatus,
            redis: redisStatus
        }
    };
});

// Register API routes BEFORE Swagger UI
fastifyInstance.register(authRoutes, { prefix: '/api/auth' });
fastifyInstance.register(userRoutes, { prefix: '/api/users' });
fastifyInstance.register(adminRoutes, { prefix: '/api/admin' });
fastifyInstance.register(coursesRoutes, { prefix: '/api/courses' });
fastifyInstance.register(creatorsRoutes, { prefix: '/api/creators' });
fastifyInstance.register(interactionsRoutes, { prefix: '/api/interactions' });
fastifyInstance.register(mediaRoutes, { prefix: '/api/media' });

// Database connection check
async function checkDatabaseConnection() {
    try {
        await db.query('SELECT 1');
        return true;
    } catch {
        return false;
    }
}

// Redis connection check
async function checkRedisConnection() {
    try {
        await redis.ping();
        return true;
    } catch {
        return false;
    }
}

// Helper function to get server URL based on environment
function getServerUrl(): string {
    const domain = appConfig.DOMAIN;
    const port = appConfig.PORT;
    const environment = appConfig.NODE_ENV;

    // For local development, include port
    if (environment === 'local') {
        return `${domain}:${port}`;
    }

    // For production domains, don't include port (assumes standard ports 80/443)
    return domain;
}

// Start server
const start = async () => {
    try {
        const port = appConfig.PORT;
        await fastifyInstance.listen({ port, host: '0.0.0.0' });
        const serverUrl = getServerUrl();
        console.log(`🚀 Server running on port ${port}`);
        console.log(`📊 Health check: ${serverUrl}/health`);
        console.log(`📚 Swagger UI: ${serverUrl}/documentation`);
    } catch (err) {
        fastifyInstance.log.error(err);
        process.exit(1);
    }
};

start();
