import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreatorService } from '../service/creators.service';
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

export default async function creatorsRoutes(fastify: FastifyInstance) {
    const creatorService = new CreatorService();

    // Create creator
    fastify.post('/', {
        schema: {
            tags: ['Creators'],
            summary: 'Create creator',
            description: 'Create a new creator',
            body: CreateCreatorRequestSchema,
            response: {
                200: CreateCreatorResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Body: CreateCreatorRequest }>, reply: FastifyReply): Promise<CreateCreatorResponse | void> => {
        try {
            const result = await creatorService.createCreator(request.body);
            if (result.error) {
                reply.code(400).send({ success: false, message: result.error });
                return;
            }
            return {
                success: true,
                data: {
                    ...result.creator!,
                    created_at: result.creator!.created_at.toISOString(),
                    updated_at: result.creator!.updated_at.toISOString()
                },
                message: "Creator created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
            return;
        }
    });

    // Get creator by ID
    fastify.get('/:id', {
        schema: {
            tags: ['Creators'],
            summary: 'Get creator by ID',
            description: 'Retrieve a specific creator by their ID',
            params: CreatorIdParamSchema,
            response: {
                200: CreatorResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Params: CreatorIdParam }>, reply: FastifyReply) => {
        try {
            const creatorId = parseInt(request.params.id, 10);
            const data = await creatorService.getCreatorById(creatorId);
            return {
                success: true,
                data,
                message: "Creator retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Update creator
    fastify.patch('/:id', {
        schema: {
            tags: ['Creators'],
            summary: 'Update creator',
            description: 'Update an existing creator',
            params: CreatorIdParamSchema,
            body: UpdateCreatorRequestSchema,
            response: {
                200: UpdateCreatorResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Params: CreatorIdParam, Body: UpdateCreatorRequest }>, reply: FastifyReply): Promise<UpdateCreatorResponse | void> => {
        try {
            const creatorId = parseInt(request.params.id, 10);
            const result = await creatorService.updateCreator(creatorId, request.body);
            if (result.error) {
                reply.code(400).send({ success: false, message: result.error });
                return;
            }
            return {
                success: true,
                data: {
                    ...result.creator!,
                    created_at: result.creator!.created_at.toISOString(),
                    updated_at: result.creator!.updated_at.toISOString()
                },
                message: "Creator updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
            return;
        }
    });

    // Delete creator
    fastify.delete('/:id', {
        schema: {
            tags: ['Creators'],
            summary: 'Delete creator',
            description: 'Delete a specific creator by their ID',
            params: CreatorIdParamSchema,
            response: {
                200: DeleteCreatorResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Params: CreatorIdParam }>, reply: FastifyReply): Promise<DeleteCreatorResponse | void> => {
        try {
            const creatorId = parseInt(request.params.id, 10);
            const data = await creatorService.deleteCreator(creatorId);
            return {
                success: true,
                data,
                message: "Creator deleted successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
            return;
        }
    });

    // Get all creators
    fastify.get('/', {
        schema: {
            tags: ['Creators'],
            summary: 'Get all creators',
            description: 'Retrieve a paginated list of all creators',
            querystring: GetCreatorsQuerySchema,
            response: {
                200: PaginatedCreatorsResponseWrapperSchema
            }
        }
    }, async (request: FastifyRequest<{ Querystring: GetCreatorsQuery }>, reply: FastifyReply) => {
        try {
            const page = request.query.page ? parseInt(request.query.page, 10) : 1;
            const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;
            const data = await creatorService.getAllCreators(page, limit);
            return {
                success: true,
                data,
                message: "Creators retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get creator statistics
    fastify.get('/:id/stats', {
        schema: {
            tags: ['Creators'],
            summary: 'Get creator statistics',
            description: 'Retrieve statistics for a specific creator',
            params: CreatorIdParamSchema,
            response: {
                200: CreatorStatsResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Params: CreatorIdParam }>, reply: FastifyReply) => {
        try {
            const creatorId = parseInt(request.params.id, 10);
            const data = await creatorService.getCreatorStats(creatorId);
            return {
                success: true,
                data,
                message: "Creator statistics retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });
}
