import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import dotenv from 'dotenv';
import { db } from './infra/db';
import { redis } from './infra/cache';
import { errorHandler } from './shared/middleware/errorHandler';
import { requestLogger } from './shared/middleware/logging';
// Import route handlers
import userRoutes from './controller/users.controller';
import adminRoutes from './controller/admin.controller';
import coursesRoutes from './controller/courses.controller';
import creatorsRoutes from './controller/creators.controller';
import interactionsRoutes from './controller/interactions.controller';

dotenv.config();

const fastifyInstance = Fastify({
    logger: {
        level: process.env.LOG_LEVEL || 'info'
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
                url: `${process.env.DOMAIN}`,
                description: 'Development server'
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
        deepLinking: true
    },
    staticCSP: false,
    transformStaticCSP: (header) => header
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
fastifyInstance.get('/health', async (request, reply) => {
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
fastifyInstance.register(userRoutes, { prefix: '/api/users' });
fastifyInstance.register(adminRoutes, { prefix: '/api/admin' });
fastifyInstance.register(coursesRoutes, { prefix: '/api/courses' });
fastifyInstance.register(creatorsRoutes, { prefix: '/api/creators' });
fastifyInstance.register(interactionsRoutes, { prefix: '/api/interactions' });

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

// Start server
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3000');
        await fastifyInstance.listen({ port, host: '0.0.0.0' });
        const domain = process.env.DOMAIN
        console.log(`🚀 Server running on port ${port}`);
        console.log(`📊 Health check: ${domain}:${port}/health`);
        console.log(`📚 Swagger UI: ${domain}:${port}/documentation`);
    } catch (err) {
        fastifyInstance.log.error(err);
        process.exit(1);
    }
};

start();

