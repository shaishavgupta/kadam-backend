import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AIService } from '../service/ai.service';
import { authMiddleware, AuthenticatedRequest, requireUser } from '../shared/middleware/auth';
import {
    CourseRecommendationRequestSchema,
    CourseRecommendationApiResponseSchema,
    ContentDiscoveryRequestSchema,
    ContentDiscoveryApiResponseSchema,
    SimilarContentRequestSchema,
    SimilarContentApiResponseSchema,
    VectorReindexRequestSchema,
    VectorReindexApiResponseSchema,
    ChatRequestSchema,
    ChatApiResponseSchema,
    CourseRecommendationRequest,
    ContentDiscoveryRequest,
    SimilarContentRequest,
    VectorReindexRequest,
    ChatRequest
} from '../schemas';

const aiService = new AIService();

export default async function aiRoutes(fastify: FastifyInstance) {

    // Course Recommendation Flow
    fastify.post('/courseRecommendationFlow', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['AI'],
            summary: 'Get course recommendations',
            description: 'Get personalized course recommendations based on user preferences and behavior',
            security: [{ bearerAuth: [] }],
            body: CourseRecommendationRequestSchema,
            response: {
                200: CourseRecommendationApiResponseSchema,
                400: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        statusCode: { type: 'number' }
                    }
                },
                500: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        statusCode: { type: 'number' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        try {
            const requestData = request.body as CourseRecommendationRequest;
            const result = await aiService.courseRecommendationFlow(requestData);

            return {
                success: true,
                data: result,
                message: 'Course recommendations retrieved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500);
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Content Discovery Flow
    fastify.post('/contentDiscoveryFlow', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['AI'],
            summary: 'Discover course content',
            description: 'Discover relevant course content based on search query using AI-powered semantic search',
            security: [{ bearerAuth: [] }],
            body: ContentDiscoveryRequestSchema,
            response: {
                200: ContentDiscoveryApiResponseSchema,
                400: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        statusCode: { type: 'number' }
                    }
                },
                500: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        statusCode: { type: 'number' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        try {
            const requestData = request.body as ContentDiscoveryRequest;
            const result = await aiService.contentDiscoveryFlow(requestData);

            return {
                success: true,
                data: result,
                message: 'Content discovery completed successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500);
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Similar Content Flow
    fastify.post('/similarContentFlow', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['AI'],
            summary: 'Find similar content',
            description: 'Find content similar to a given content item using vector similarity',
            security: [{ bearerAuth: [] }],
            body: SimilarContentRequestSchema,
            response: {
                200: SimilarContentApiResponseSchema,
                400: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        statusCode: { type: 'number' }
                    }
                },
                500: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        statusCode: { type: 'number' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        try {
            const requestData = request.body as SimilarContentRequest;
            const result = await aiService.similarContentFlow(requestData);

            return {
                success: true,
                data: result,
                message: 'Similar content retrieved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500);
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Vector Reindex Flow
    fastify.post('/vectorReindexFlow', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['AI'],
            summary: 'Reindex vector embeddings',
            description: 'Reindex vector embeddings for courses or content to improve search accuracy',
            security: [{ bearerAuth: [] }],
            body: VectorReindexRequestSchema,
            response: {
                200: VectorReindexApiResponseSchema,
                400: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        statusCode: { type: 'number' }
                    }
                },
                500: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        statusCode: { type: 'number' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        try {
            const requestData = request.body as VectorReindexRequest;
            const result = await aiService.vectorReindexFlow(requestData);

            return {
                success: true,
                data: result,
                message: 'Vector reindexing completed successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500);
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Chat Flow
    fastify.post('/chatFlow', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['AI'],
            summary: 'Chat with AI mentor',
            description: 'Chat with AI mentor for learning assistance and guidance',
            security: [{ bearerAuth: [] }],
            body: ChatRequestSchema,
            response: {
                200: ChatApiResponseSchema,
                400: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        statusCode: { type: 'number' }
                    }
                },
                500: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        statusCode: { type: 'number' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        try {
            const userId = request.user!.userID;
            const requestData = { ...(request.body as any), userId } as ChatRequest;
            const result = await aiService.chatFlow(requestData);

            return {
                success: true,
                data: result,
                message: 'Chat response generated successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500);
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });
}
