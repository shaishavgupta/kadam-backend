import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreatorService } from '../service/creators.service';
import { authMiddleware, AuthenticatedRequest, requireUser, requireAdmin } from '../shared/middleware/auth';
import {
    CreateCreatorRequest,
    UpdateCreatorRequest,
    Creator,
    PaginatedCreatorsResponse,
    CreatorStats,
    GetCreatorsQuery,
    CreateQualificationRequest,
    CreateAchievementRequest,
    CreatorWithDetails,
    CreatorIdParam,
    CreateCreatorResponse,
    UpdateCreatorResponse,
    DeleteCreatorResponse,
    CreateCreatorRequestSchema,
    UpdateCreatorRequestSchema,
    CreatorIdParamSchema,
    CreateCreatorResponseSchema,
    UpdateCreatorResponseSchema,
    DeleteCreatorResponseSchema,
    CreatorResponseSchema,
    PaginatedCreatorsResponseWrapperSchema,
    CreatorStatsResponseSchema,
    GetCreatorsQuerySchema
} from '../schemas/creator';

// Helper to convert all Date values in objects/arrays to ISO strings
function serializeDates<T>(value: any): T {
    return JSON.parse(
        JSON.stringify(value, (_key, val) => (val instanceof Date ? val.toISOString() : val))
    );
}

// Helper to create error responses
function createErrorResponse(message: string, statusCode: number = 500) {
    return {
        success: false,
        message,
        statusCode
    };
}

export default async function creatorsRoutes(fastify: FastifyInstance) {
    const creatorService = new CreatorService();

    // Create creator
    fastify.post('/', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Creators'],
            summary: 'Create creator',
            description: 'Create a new creator',
            body: CreateCreatorRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CreateCreatorResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<CreateCreatorResponse> => {
        try {
            const result = await creatorService.createCreator(request.body as CreateCreatorRequest);
            if (result.error) {
                reply.status(400).send(createErrorResponse(result.error, 400));
                return {
                    success: false,
                    data: {
                        id: 0,
                        name: '',
                        bio: '',
                        profile_pic: '',
                        rating: 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    message: result.error
                };
            }
            return {
                success: true,
                data: result.creator!,
                message: "Creator created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    id: 0,
                    name: '',
                    bio: '',
                    profile_pic: '',
                    rating: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // Get creator by ID
    fastify.get('/:id', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Creators'],
            summary: 'Get creator by ID',
            description: 'Retrieve a specific creator by their ID',
            params: CreatorIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CreatorResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: Creator; message: string }> => {
        try {
            const creatorId = parseInt((request.params as any).id, 10);
            const result = await creatorService.getCreatorById(creatorId);

            if (result.error || !result.creator) {
                reply.status(404);
                return {
                    success: false,
                    data: {
                        id: 0,
                        name: '',
                        bio: '',
                        profile_pic: '',
                        rating: 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    message: result.error || "Creator not found"
                };
            }

            const data = serializeDates<Creator>(result.creator);
            return {
                success: true,
                data,
                message: "Creator retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    id: 0,
                    name: '',
                    bio: '',
                    profile_pic: '',
                    rating: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // Update creator
    fastify.patch('/:id', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Creators'],
            summary: 'Update creator',
            description: 'Update an existing creator',
            params: CreatorIdParamSchema,
            body: UpdateCreatorRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: UpdateCreatorResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<UpdateCreatorResponse> => {
        try {
            const creatorId = parseInt((request.params as any).id, 10);
            const result = await creatorService.updateCreator(creatorId, request.body as UpdateCreatorRequest);
            if (result.error) {
                reply.status(400).send(createErrorResponse(result.error, 400));
                return {
                    success: false,
                    data: {
                        id: 0,
                        name: '',
                        bio: '',
                        profile_pic: '',
                        rating: 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    message: result.error
                };
            }
            return {
                success: true,
                data: result.creator!,
                message: "Creator updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    id: 0,
                    name: '',
                    bio: '',
                    profile_pic: '',
                    rating: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // Delete creator
    fastify.delete('/:id', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Creators'],
            summary: 'Delete creator',
            description: 'Delete a specific creator by their ID',
            params: CreatorIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: DeleteCreatorResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<DeleteCreatorResponse> => {
        try {
            const creatorId = parseInt((request.params as any).id, 10);
            const data = await creatorService.deleteCreator(creatorId);
            return {
                success: true,
                data,
                message: "Creator deleted successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    id: 0,
                    name: '',
                    bio: '',
                    profile_pic: '',
                    rating: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // Get creator statistics
    fastify.get('/:id/stats', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Creators'],
            summary: 'Get creator statistics',
            description: 'Retrieve statistics for a specific creator',
            params: CreatorIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CreatorStatsResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: CreatorStats; message: string }> => {
        try {
            const creatorId = parseInt((request.params as any).id, 10);
            const raw = await creatorService.getCreatorStats(creatorId);
            const data = serializeDates<CreatorStats>(raw);
            return {
                success: true,
                data,
                message: "Creator statistics retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    total_courses: 0,
                    published_courses: 0,
                    rating: 0,
                    num_ratings: 0
                },
                message: errorMessage
            };
        }
    });
}
