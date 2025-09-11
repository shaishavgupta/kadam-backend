import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { InteractionsService } from '../service/interactions.service';
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
    InteractionCourseIdParamSchema
} from '../schemas/interaction';

export default async function interactionsRoutes(fastify: FastifyInstance) {
    const interactionsService = new InteractionsService();

    // Create like
    fastify.post('/likes', {
        schema: {
            tags: ['Interactions'],
            summary: 'Create like',
            description: 'Create a new like for content, course, or comment',
            body: CreateLikeDTOSchema,
            response: {
                200: LikeResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Body: CreateLikeDTO }>, reply: FastifyReply) => {
        try {
            const data = await interactionsService.createLike(request.body);
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
        schema: {
            tags: ['Interactions'],
            summary: 'Get likes by user ID',
            description: 'Retrieve all likes created by a specific user',
            params: InteractionUserIdParamSchema,
            response: {
                200: LikesArrayResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Params: InteractionUserIdParam }>, reply: FastifyReply) => {
        try {
            const userId = parseInt(request.params.userId, 10);
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
        schema: {
            tags: ['Interactions'],
            summary: 'Get all likes',
            description: 'Retrieve all likes',
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
    fastify.patch('/likes/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: UpdateLikeDTO }>, reply: FastifyReply) => {
        try {
            const likeId = parseInt(request.params.id, 10);
            const data = await interactionsService.updateLike(likeId, request.body);
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
    fastify.get('/likes/count/:parentType/:parentId', async (request: FastifyRequest<{ Params: { parentType: string, parentId: string } }>, reply: FastifyReply) => {
        try {
            const parentId = parseInt(request.params.parentId, 10);
            const data = await interactionsService.getLikesCountByParentId(parentId, request.params.parentType as any);
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
    fastify.post('/comments', async (request: FastifyRequest<{ Body: CreateCommentDTO }>, reply: FastifyReply) => {
        try {
            const data = await interactionsService.createComment(request.body);
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
    fastify.get('/comments/parent/:parentType/:parentId', async (request: FastifyRequest<{ Params: { parentType: string, parentId: string } }>, reply: FastifyReply) => {
        try {
            const parentId = parseInt(request.params.parentId, 10);
            const data = await interactionsService.getCommentsByParentId(parentId, request.params.parentType as any);
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
    fastify.get('/comments/user/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
        try {
            const userId = parseInt(request.params.userId, 10);
            const data = await interactionsService.getCommentsByUserId(userId);
            return {
                success: true,
                data,
                message: "User comments retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Update comment
    fastify.patch('/comments/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: UpdateCommentDTO }>, reply: FastifyReply) => {
        try {
            const commentId = parseInt(request.params.id, 10);
            const data = await interactionsService.updateComment(commentId, request.body);
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
    fastify.post('/shares', async (request: FastifyRequest<{ Body: CreateShareDTO }>, reply: FastifyReply) => {
        try {
            const data = await interactionsService.createShare(request.body);
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
    fastify.get('/shares/user/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
        try {
            const userId = parseInt(request.params.userId, 10);
            const data = await interactionsService.getSharesByUserId(userId);
            return {
                success: true,
                data,
                message: "Shares retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Update share
    fastify.patch('/shares/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: UpdateShareDTO }>, reply: FastifyReply) => {
        try {
            const shareId = parseInt(request.params.id, 10);
            const data = await interactionsService.updateShare(shareId, request.body);
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
    fastify.post('/saves', async (request: FastifyRequest<{ Body: CreateSaveDTO }>, reply: FastifyReply) => {
        try {
            const data = await interactionsService.createSave(request.body);
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
    fastify.get('/saves/user/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
        try {
            const userId = parseInt(request.params.userId, 10);
            const data = await interactionsService.getSavesByUserId(userId);
            return {
                success: true,
                data,
                message: "Saves retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Delete save
    fastify.delete('/saves/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        try {
            const saveId = parseInt(request.params.id, 10);
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
    fastify.post('/views', async (request: FastifyRequest<{ Body: CreateViewDTO }>, reply: FastifyReply) => {
        try {
            const data = await interactionsService.createView(request.body);
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
    fastify.get('/views/user/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
        try {
            const userId = parseInt(request.params.userId, 10);
            const data = await interactionsService.getViewsByUserId(userId);
            return {
                success: true,
                data,
                message: "Views retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Update view
    fastify.patch('/views/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: UpdateViewDTO }>, reply: FastifyReply) => {
        try {
            const viewId = parseInt(request.params.id, 10);
            const data = await interactionsService.updateView(viewId, request.body);
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
    fastify.post('/ratings', async (request: FastifyRequest<{ Body: CreateRatingDTO }>, reply: FastifyReply) => {
        try {
            const data = await interactionsService.createRating(request.body);
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
    fastify.get('/ratings/user/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
        try {
            const userId = parseInt(request.params.userId, 10);
            const data = await interactionsService.getRatingsByUserId(userId);
            return {
                success: true,
                data,
                message: "User ratings retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get ratings by course ID
    fastify.get('/ratings/course/:courseId', async (request: FastifyRequest<{ Params: { courseId: string } }>, reply: FastifyReply) => {
        try {
            const courseId = parseInt(request.params.courseId, 10);
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
    fastify.patch('/ratings/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: UpdateRatingDTO }>, reply: FastifyReply) => {
        try {
            const ratingId = parseInt(request.params.id, 10);
            const data = await interactionsService.updateRating(ratingId, request.body);
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
