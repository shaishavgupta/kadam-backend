import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { errorHandler } from './shared/middleware/errorHandler';
import { requestLogger } from './shared/middleware/logging';
import { appConfig } from './config';
// Infrastructure imports
import {
    connectInfrastructure,
    checkInfrastructureHealth,
    InfrastructureOptions
} from './infra';

// Import route handlers
import userRoutes from './controller/users.controller';
import adminRoutes from './controller/admin.controller';
import coursesRoutes from './controller/courses.controller';
import creatorsRoutes from './controller/creators.controller';
import interactionsRoutes from './controller/interactions.controller';
import authRoutes from './controller/auth.controller';
import mediaRoutes from './controller/media.controller';
import aiRoutes from './controller/ai.controller';

const fastifyInstance = Fastify({
    logger: {
        level: appConfig.LOG_LEVEL
    }
}).withTypeProvider<TypeBoxTypeProvider>();

// Register CORS first - must be registered before other plugins
fastifyInstance.register(cors, {
    origin: (origin, callback) => {
        // Allow requests from localhost with any port for development
        if (!origin || 
            origin.startsWith('http://localhost') || 
            origin.startsWith('http://127.0.0.1') ||
            origin.startsWith('https://localhost') ||
            origin.startsWith('https://127.0.0.1')) {
            callback(null, true);
        } else {
            // In production, add your specific domains here
            callback(null, true); // For now, allow all origins
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Accept', 
        'X-Kadam-Path',
        'sec-ch-ua',
        'sec-ch-ua-mobile',
        'sec-ch-ua-platform',
        'User-Agent',
        'Referer'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 200,
    exposedHeaders: ['X-Kadam-Path']
});

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


// Register error handler
fastifyInstance.setErrorHandler(errorHandler);

// Register request logger as a hook
fastifyInstance.addHook('onRequest', requestLogger);

// Health check endpoint
fastifyInstance.get('/health', async (request: any, reply: any) => {
    const infraHealth = await checkInfrastructureHealth();

    return {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database: infraHealth.database,
            redis: infraHealth.redis,
            tracing: infraHealth.tracing,
            s3: infraHealth.s3,
            overall: infraHealth.overall
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
fastifyInstance.register(aiRoutes, { prefix: '/api/ai' });

// Connection checks are now handled by centralized infrastructure functions

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
        // Connect to all infrastructure components
        console.log('🔄 Connecting to infrastructure...');
        const infraStatus = await connectInfrastructure({
            enableTracing: false, // Tracing is already initialized by index.ts
            enableS3: true,
            enableDatabase: true,
            enableRedis: true
        });

        if (!infraStatus.overall) {
            console.error('❌ Infrastructure connection failed');
            process.exit(1);
        }

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
