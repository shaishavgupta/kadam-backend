import { FastifyInstance, FastifyReply } from 'fastify';
import { AIService } from '../service/ai.service';
import { authMiddleware, AuthenticatedRequest, requireUser } from '../shared/middleware/auth';
import {
    ChatRequestSchema,
    ChatApiResponseSchema,
    GetUserSessionsResponseSchema,
    GetSessionMessagesResponseSchema,
    DeleteSessionResponseSchema,
    UpdateSessionTitleRequestSchema,
    UpdateSessionTitleResponseSchema,
    CreateSessionRequestSchema,
    CreateSessionResponseSchema,
    ChatRequest,
    CreateSessionRequest,
    GetExpertsResponseSchema,
    GetExpertResponseSchema,
    CreateExpertRequestSchema,
    CreateExpertResponseSchema,
    UpdateExpertRequestSchema,
    UpdateExpertResponseSchema,
    DeleteExpertResponseSchema
} from '../schemas';
import { ExpertRepository } from '../repository/experts.repository';

const aiService = new AIService();
const expertRepository = new ExpertRepository();

export default async function aiRoutes(fastify: FastifyInstance) {

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
            // Ensure user is authenticated (this should be handled by authMiddleware, but adding extra safety)
            if (!request.user?.userID) {
                reply.status(401);
                return {
                    success: false,
                    data: null,
                    message: 'Authentication required'
                };
            }
            
            const jwtUserId = request.user.userID;
            
            // Validate expertId is provided
            const body = request.body as any;
            if (!body.expertId) {
                reply.status(400);
                return {
                    success: false,
                    data: null,
                    message: 'Expert ID is required'
                };
            }

            // Use JWT userId as the primary source
            const requestData = { 
                ...body, 
                userId: jwtUserId 
            } as ChatRequest & { userId: string };
            
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

    // Session Management Endpoints

    // Get User Sessions
    fastify.get('/sessions', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['AI Sessions'],
            summary: 'Get user chat sessions',
            description: 'Get all chat sessions for the authenticated user',
            security: [{ bearerAuth: [] }],
            response: {
                200: GetUserSessionsResponseSchema,
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
            const { expertId } = request.query as { expertId?: string };
            
            const sessions = await aiService.getUserSessions(userId, expertId);

            return {
                success: true,
                data: sessions,
                message: 'User sessions retrieved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500);
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Get Session Messages
    fastify.get('/sessions/:sessionId/messages', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['AI Sessions'],
            summary: 'Get session messages',
            description: 'Get messages from a specific chat session',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string' }
                },
                required: ['sessionId']
            },
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'number' },
                    expertId: { type: 'string' }
                }
            },
            response: {
                200: GetSessionMessagesResponseSchema,
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
            const { sessionId } = request.params as { sessionId: string };
            const { limit } = request.query as { limit?: number };
            
            const messages = await aiService.getSessionMessages(sessionId, limit);

            return {
                success: true,
                data: messages,
                message: 'Session messages retrieved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500);
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Create New Session
    fastify.post('/sessions', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['AI Sessions'],
            summary: 'Create new chat session',
            description: 'Create a new chat session for the authenticated user',
            security: [{ bearerAuth: [] }],
            body: CreateSessionRequestSchema,
            response: {
                200: CreateSessionResponseSchema,
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
            const requestData = { ...(request.body as any), userId } as CreateSessionRequest;
            
            const result = await aiService.createNewSession(requestData.userId, requestData.expertId, requestData.title);

            return {
                success: true,
                data: result,
                message: 'New session created successfully'
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

    // Update Session Title
    fastify.put('/sessions/:sessionId/title', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['AI Sessions'],
            summary: 'Update session title',
            description: 'Update the title of a specific chat session',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string' }
                },
                required: ['sessionId']
            },
            body: UpdateSessionTitleRequestSchema,
            response: {
                200: UpdateSessionTitleResponseSchema,
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
            const { sessionId } = request.params as { sessionId: string };
            const { title } = request.body as { title: string };
            
            await aiService.updateSessionTitle(sessionId, title);

            return {
                success: true,
                message: 'Session title updated successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500);
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    // Delete Session
    fastify.delete('/sessions/:sessionId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['AI Sessions'],
            summary: 'Delete chat session',
            description: 'Delete a specific chat session',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string' }
                },
                required: ['sessionId']
            },
            response: {
                200: DeleteSessionResponseSchema,
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
            const { sessionId } = request.params as { sessionId: string };
            
            await aiService.deleteSession(sessionId);

            return {
                success: true,
                message: 'Session deleted successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500);
            return {
                success: false,
                message: errorMessage
            };
        }
    });

    // Expert Management Endpoints

    // Get All Active Experts
    fastify.get('/experts', {
        schema: {
            tags: ['AI Experts'],
            summary: 'Get all active experts',
            description: 'Get list of all active AI experts available for chat',
            response: {
                200: GetExpertsResponseSchema,
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
            const experts = await expertRepository.getAllActiveExperts();

            return {
                success: true,
                data: experts.map(expert => ({
                    id: expert.id,
                    name: expert.name,
                    title: expert.title,
                    description: expert.description,
                    avatar_url: expert.avatar_url,
                    actions: expert.actions,
                    tags: expert.tags
                })),
                message: 'Active experts retrieved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500);
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Get Expert by ID
    fastify.get('/experts/:expertId', {
        schema: {
            tags: ['AI Experts'],
            summary: 'Get expert by ID',
            description: 'Get detailed information about a specific expert',
            params: {
                type: 'object',
                properties: {
                    expertId: { type: 'string' }
                },
                required: ['expertId']
            },
            response: {
                200: GetExpertResponseSchema,
                404: {
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
            const { expertId } = request.params as { expertId: string };
            const expert = await expertRepository.getExpertById(parseInt(expertId));

            if (!expert) {
                reply.status(404);
                return {
                    success: false,
                    data: null,
                    message: 'Expert not found'
                };
            }

            return {
                success: true,
                data: expert,
                message: 'Expert retrieved successfully'
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
