import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { InteractionsService } from '../service/interactions.service';
import { authMiddleware, AuthenticatedRequest, requireUser } from '../shared/middleware/auth';
import {
    CreateLikeDTO,
    UpdateLikeDTO,
    Like,
    Comment,
    CreateCommentDTO,
    UpdateCommentDTO,
    Share,
    CreateShareDTO,
    UpdateShareDTO,
    Save,
    CreateSaveDTO,
    View,
    CreateViewDTO,
    UpdateViewDTO,
    Rating,
    CreateRatingDTO,
    UpdateRatingDTO,
    GetLikesByUserIdDTO,
    InteractionUserIdParam,
    LikeIdParam,
    CommentIdParam,
    ShareIdParam,
    SaveIdParam,
    ViewIdParam,
    RatingIdParam,
    ParentIdParam,
    InteractionCourseIdParam,
    LikeUpdateParam,
    CommentUpdateParam,
    ShareUpdateParam,
    SaveDeleteParam,
    ViewUpdateParam,
    RatingUpdateParam,
    ParentTypeParam,
    SimpleUserIdParam,
    CreateLikeDTOSchema,
    UpdateLikeDTOSchema,
    CreateCommentDTOSchema,
    UpdateCommentDTOSchema,
    CreateShareDTOSchema,
    UpdateShareDTOSchema,
    CreateSaveDTOSchema,
    CreateViewDTOSchema,
    UpdateViewDTOSchema,
    CreateRatingDTOSchema,
    UpdateRatingDTOSchema,
    LikeResponseSchema,
    CommentResponseSchema,
    ShareResponseSchema,
    SaveResponseSchema,
    ViewResponseSchema,
    RatingResponseSchema,
    LikesArrayResponseSchema,
    CommentsArrayResponseSchema,
    SharesArrayResponseSchema,
    SavesArrayResponseSchema,
    ViewsArrayResponseSchema,
    RatingsArrayResponseSchema,
    InteractionUserIdParamSchema,
    LikeIdParamSchema,
    CommentIdParamSchema,
    ShareIdParamSchema,
    SaveIdParamSchema,
    ViewIdParamSchema,
    RatingIdParamSchema,
    ParentIdParamSchema,
    InteractionCourseIdParamSchema,
    LikeUpdateParamSchema,
    CommentUpdateParamSchema,
    ShareUpdateParamSchema,
    SaveDeleteParamSchema,
    ViewUpdateParamSchema,
    RatingUpdateParamSchema,
    ParentTypeParamSchema,
    SimpleUserIdParamSchema,
    CountResponseSchema,
    DeleteResponseSchema
} from '../schemas/interaction';

// Import the user schema's UserIdParamSchema with alias to avoid conflicts
import { UserIdParamSchema as UserParamSchema, UserIdParam } from '../schemas/user';

export default async function interactionsRoutes(fastify: FastifyInstance) {
    const interactionsService = new InteractionsService();

    // Create like
    fastify.post('/likes', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Create like',
            description: 'Create a new like for content, course, or comment',
            body: CreateLikeDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: LikeResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = await interactionsService.createLike(request.body as any);
            return {
                success: true,
                data,
                message: "Like created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get likes by user ID
    fastify.get('/likes/user/:userId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get likes by user ID',
            description: 'Retrieve all likes created by a specific user',
            params: InteractionUserIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: LikesArrayResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = parseInt((request.params as any).userId, 10);
            const data = await interactionsService.getLikesByUserId(userId);
            return {
                success: true,
                data,
                message: "Likes retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get all likes
    fastify.get('/likes', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get all likes',
            description: 'Retrieve all likes',
            security: [{ bearerAuth: [] }],
            response: {
                200: LikesArrayResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = await interactionsService.getAllLikes();
            return {
                success: true,
                data,
                message: "Likes retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Update like
    fastify.patch('/likes/:id', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Update like',
            description: 'Update an existing like',
            params: LikeUpdateParamSchema,
            body: UpdateLikeDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: LikeResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const likeId = parseInt((request.params as any).id, 10);
            const data = await interactionsService.updateLike(likeId, request.body as any);
            return {
                success: true,
                data,
                message: "Like updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get likes count by parent ID
    fastify.get('/likes/count/:parentType/:parentId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get likes count by parent ID',
            description: 'Get the count of likes for a specific parent (content, course, or comment)',
            params: ParentTypeParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CountResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const parentId = parseInt((request.params as any).parentId, 10);
            const data = await interactionsService.getLikesCountByParentId(parentId, (request.params as any).parentType);
            return {
                success: true,
                data,
                message: "Likes count retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Create comment
    fastify.post('/comments', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Create comment',
            description: 'Create a new comment on content, course, or another comment',
            body: CreateCommentDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CommentResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = await interactionsService.createComment(request.body as any);
            return {
                success: true,
                data,
                message: "Comment created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get comments by parent ID
    fastify.get('/comments/parent/:parentType/:parentId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get comments by parent ID',
            description: 'Retrieve all comments for a specific parent (content, course, or comment)',
            params: ParentTypeParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CommentsArrayResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const parentId = parseInt((request.params as any).parentId, 10);
            const data = await interactionsService.getCommentsByParentId(parentId, (request.params as any).parentType);
            return {
                success: true,
                data,
                message: "Comments retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get user comments
    fastify.get('/comments/user/:userId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get user comments',
            description: 'Retrieve all comments created by a specific user',
            params: SimpleUserIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CommentsArrayResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {

    });

    // Update comment
    fastify.patch('/comments/:id', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Update comment',
            description: 'Update an existing comment',
            params: CommentUpdateParamSchema,
            body: UpdateCommentDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CommentResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const commentId = parseInt((request.params as any).id, 10);
            const data = await interactionsService.updateComment(commentId, request.body as any);
            return {
                success: true,
                data,
                message: "Comment updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Create share
    fastify.post('/shares', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Create share',
            description: 'Create a new share for content, course, or comment',
            body: CreateShareDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: ShareResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = await interactionsService.createShare(request.body as any);
            return {
                success: true,
                data,
                message: "Share created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get shares by user ID
    fastify.get('/shares/user/:userId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get shares by user ID',
            description: 'Retrieve all shares created by a specific user',
            params: SimpleUserIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: SharesArrayResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {

    });

    // Update share
    fastify.patch('/shares/:id', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Update share',
            description: 'Update an existing share',
            params: ShareUpdateParamSchema,
            body: UpdateShareDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: ShareResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const shareId = parseInt((request.params as any).id, 10);
            const data = await interactionsService.updateShare(shareId, request.body as any);
            return {
                success: true,
                data,
                message: "Share updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Create save
    fastify.post('/saves', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Create save',
            description: 'Save content, course, or comment for later viewing',
            body: CreateSaveDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: SaveResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = await interactionsService.createSave(request.body as any);
            return {
                success: true,
                data,
                message: "Save created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get saves by user ID
    fastify.get('/saves/user/:userId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get saves by user ID',
            description: 'Retrieve all saved items by a specific user',
            params: SimpleUserIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: SavesArrayResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {

    });

    // Delete save
    fastify.delete('/saves/:id', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Delete save',
            description: 'Remove a saved item',
            params: SaveDeleteParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: DeleteResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const saveId = parseInt((request.params as any).id, 10);
            const data = await interactionsService.deleteSave(saveId);
            return {
                success: true,
                data,
                message: "Save deleted successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Create view
    fastify.post('/views', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Create view',
            description: 'Record a view for content, course, or comment',
            body: CreateViewDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: ViewResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = await interactionsService.createView(request.body as any);
            return {
                success: true,
                data,
                message: "View created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get views by user ID
    fastify.get('/views/user/:userId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get views by user ID',
            description: 'Retrieve all views by a specific user',
            params: SimpleUserIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: ViewsArrayResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {

    });

    // Update view
    fastify.patch('/views/:id', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Update view',
            description: 'Update an existing view record',
            params: ViewUpdateParamSchema,
            body: UpdateViewDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: ViewResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const viewId = parseInt((request.params as any).id, 10);
            const data = await interactionsService.updateView(viewId, request.body as any);
            return {
                success: true,
                data,
                message: "View updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Create rating
    fastify.post('/ratings', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Create rating',
            description: 'Create a rating and review for a course',
            body: CreateRatingDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: RatingResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = await interactionsService.createRating(request.body as any);
            return {
                success: true,
                data,
                message: "Rating created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get ratings by user ID
    fastify.get('/ratings/user/:userId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get ratings by user ID',
            description: 'Retrieve all ratings created by a specific user',
            params: SimpleUserIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: RatingsArrayResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {

    });

    // Get ratings by course ID
    fastify.get('/ratings/course/:courseId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get ratings by course ID',
            description: 'Retrieve all ratings for a specific course',
            params: InteractionCourseIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: RatingsArrayResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const courseId = parseInt((request.params as any).courseId, 10);
            const data = await interactionsService.getRatingsByCourseId(courseId);
            return {
                success: true,
                data,
                message: "Course ratings retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Update rating
    fastify.patch('/ratings/:id', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Update rating',
            description: 'Update an existing rating and review',
            params: RatingUpdateParamSchema,
            body: UpdateRatingDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: RatingResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const ratingId = parseInt((request.params as any).id, 10);
            const data = await interactionsService.updateRating(ratingId, request.body as any);
            return {
                success: true,
                data,
                message: "Rating updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });
}
