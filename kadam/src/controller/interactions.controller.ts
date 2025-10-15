import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { InteractionsService } from '../service/interactions.service';
import { authMiddleware, AuthenticatedRequest, requireUser } from '../shared/middleware/auth';
import {
    CreateLikeDTO,

    Like,
    Comment,
    CreateCommentDTO,
    UpdateCommentDTO,
    Share,
    CreateShareDTO,
    UpdateShareDTO,
    Save,
    CreateSaveDTO,
    GetLikesByUserIdDTO,
    UserEnrollment,
    CreateUserEnrollmentDTO,
    UpdateUserEnrollmentDTO,
    InteractionUserIdParam,
    LikeIdParam,
    CommentIdParam,
    ShareIdParam,
    SaveIdParam,
    ParentIdParam,

    CommentUpdateParam,
    ShareUpdateParam,
    SaveDeleteParam,
    ParentTypeParam,
    SimpleUserIdParam,
    UserEnrollmentIdParam,
    UserEnrollmentUpdateParam,
    CreateLikeDTOSchema,

    CreateCommentDTOSchema,
    UpdateCommentDTOSchema,
    CreateShareDTOSchema,
    UpdateShareDTOSchema,
    CreateSaveDTOSchema,
    CreateUserEnrollmentDTOSchema,
    UpdateUserEnrollmentDTOSchema,
    LikeResponseSchema,
    CommentResponseSchema,
    ShareResponseSchema,
    SaveResponseSchema,
    UserEnrollmentResponseSchema,
    LikesArrayResponseSchema,
    CommentsArrayResponseSchema,
    SharesArrayResponseSchema,
    SavesArrayResponseSchema,
    SavedContentsArrayResponseSchema,
    UserEnrollmentsArrayResponseSchema,
    InteractionUserIdParamSchema,
    LikeIdParamSchema,
    CommentIdParamSchema,
    ShareIdParamSchema,
    SaveIdParamSchema,
    ParentIdParamSchema,

    CommentUpdateParamSchema,
    ShareUpdateParamSchema,
    SaveDeleteParamSchema,
    ParentTypeParamSchema,
    SimpleUserIdParamSchema,
    UserEnrollmentIdParamSchema,
    UserEnrollmentUpdateParamSchema,
    CountResponseSchema,
    DeleteResponseSchema,
    BooleanFlagResponseSchema,
    PathEnrollment,
    PathEnrollmentResponseSchema,
    PathEnrollmentsResponseSchema
} from '../schemas/interaction';

// Import the user schema's UserIdParamSchema with alias to avoid conflicts
import { UserIdParamSchema as UserParamSchema, UserIdParam } from '../schemas/user';
import { ContentsResponseSchema, PathIdParamSchema } from '../schemas/course';
import { PaginationQuerySchema } from '../schemas/common';
import { Type } from '@sinclair/typebox';

// Helper to create error responses
function createErrorResponse(message: string, statusCode: number = 500) {
    return {
        success: false,
        message,
        statusCode
    };
}

// Helper to serialize dates
function serializeDates<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (obj instanceof Date) {
        return obj.toISOString() as any;
    }

    if (Array.isArray(obj)) {
        return obj.map(serializeDates) as any;
    }

    if (typeof obj === 'object') {
        const serialized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            serialized[key] = serializeDates(value);
        }
        return serialized;
    }

    return obj;
}

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
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const userId = parseInt(request.user!.userID);
            const data = await interactionsService.createLike(request.body as any as CreateLikeDTO, userId);
            return {
                success: true,
                data,
                message: "Like created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Get total likes for a parent (using same route)
    fastify.get('/likes/is-liked/:parentType/:parentId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get total likes for entity',
            description: 'Return total count of likes for the given parentType and parentId',
            params: ParentTypeParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CountResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const userId = parseInt(request.user!.userID, 10);
            const parentId = parseInt((request.params as any).parentId, 10);
            const parentType = (request.params as any).parentType;
            const result = await interactionsService.getLikesCountByParentId(parentId, parentType as any, userId);
            return {
                success: true,
                data: { count: result.likesCount, isLiked: result.isLiked },
                message: 'Likes count retrieved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: { count: 0, isLiked: false },
                message: errorMessage
            };
        }
    });

    // Get liked contents for authenticated user
    fastify.get('/likes/user', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get liked contents for current user',
            description: 'Retrieve all content items liked by the authenticated user',
            security: [{ bearerAuth: [] }],
            response: {
                200: ContentsResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const userId = parseInt(request.user!.userID, 10);
            const data = await interactionsService.getLikedContentsByUserId(userId);
            return {
                success: true,
                data,
                message: "Liked contents retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: [],
                message: errorMessage
            };
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
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const userId = parseInt(request.user!.userID);
            const data = await interactionsService.createComment(request.body as any as CreateCommentDTO, userId);
            return {
                success: true,
                data,
                message: "Comment created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: null,
                message: errorMessage
            };
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
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: [],
                message: errorMessage
            };
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
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const userId = parseInt((request.params as any).userId, 10);
            const data = await interactionsService.getCommentsByUserId(userId);
            return {
                success: true,
                data,
                message: "User comments retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
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
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: null,
                message: errorMessage
            };
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
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const userId = parseInt(request.user!.userID);
            const data = await interactionsService.createShare(request.body as any as CreateShareDTO, userId);
            return {
                success: true,
                data,
                message: "Share created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: null,
                message: errorMessage
            };
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
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const userId = parseInt((request.params as any).userId, 10);
            const data = await interactionsService.getSharesByUserId(userId);
            return {
                success: true,
                data,
                message: "User shares retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
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
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: null,
                message: errorMessage
            };
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
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const userId = parseInt(request.user!.userID);
            const data = await interactionsService.createSave(request.body as any as CreateSaveDTO, userId);
            return {
                success: true,
                data,
                message: "Save created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Get saves for authenticated user
    fastify.get('/saves/user', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get saves for current user',
            description: 'Retrieve all saved items with full content details for the authenticated user',
            security: [{ bearerAuth: [] }],
            response: {
                200: SavedContentsArrayResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const userId = parseInt(request.user!.userID);
            const data = await interactionsService.getSavedContentsByUserId(userId);
            return {
                success: true,
                data,
                message: "User saved content retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
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
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Check if saved by current user
    fastify.get('/saves/is-saved/:parentType/:parentId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Check if saved by current user',
            description: 'Return true if the given entity is saved by the authenticated user',
            params: ParentTypeParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: BooleanFlagResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const userId = parseInt(request.user!.userID, 10);
            const parentId = parseInt((request.params as any).parentId, 10);
            const parentType = (request.params as any).parentType;
            const value = await interactionsService.isSavedByUser(parentId, parentType as any, userId);
            return {
                success: true,
                data: { value },
                message: 'Save status retrieved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: { value: false },
                message: errorMessage
            };
        }
    });

    // User Enrollment endpoints
    // Create user enrollment
    fastify.post('/enrollments', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Create user enrollment',
            description: 'Create a new user enrollment for a course and content',
            body: CreateUserEnrollmentDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: UserEnrollmentResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const userId = parseInt(request.user!.userID);
            const data = await interactionsService.createUserEnrollment(request.body as any as CreateUserEnrollmentDTO, userId);
            return {
                success: true,
                data,
                message: "User enrollment created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });


    // Get user enrollments by user ID
    fastify.get('/enrollments/user/:userId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get user enrollments by user ID',
            description: 'Retrieve all enrollments for a specific user',
            params: SimpleUserIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: UserEnrollmentsArrayResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const userId = parseInt((request.params as any).userId, 10);
            const data = await interactionsService.getUserEnrollmentsByUserId(userId);
            return {
                success: true,
                data,
                message: "User enrollments retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Get user enrollments by course ID
    fastify.get('/enrollments/course/:courseId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get user enrollments by course ID',
            description: 'Retrieve all enrollments for a specific course',
            params: ParentIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: UserEnrollmentsArrayResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const courseId = parseInt((request.params as any).parentId, 10);
            const data = await interactionsService.getUserEnrollmentsByCourseId(courseId);
            return {
                success: true,
                data,
                message: "Course enrollments retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Update user enrollment
    fastify.patch('/enrollments/:id', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Update user enrollment',
            description: 'Update an existing user enrollment',
            params: UserEnrollmentUpdateParamSchema,
            body: UpdateUserEnrollmentDTOSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: UserEnrollmentResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const enrollmentId = parseInt((request.params as any).id, 10);
            const data = await interactionsService.updateUserEnrollment(enrollmentId, request.body as any);
            return {
                success: true,
                data,
                message: "User enrollment updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Delete user enrollment
    fastify.delete('/enrollments/:id', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Delete user enrollment',
            description: 'Delete a user enrollment',
            params: UserEnrollmentUpdateParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: DeleteResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; data: any; message: string }> => {
        try {
            const enrollmentId = parseInt((request.params as any).id, 10);
            const data = await interactionsService.deleteUserEnrollment(enrollmentId);
            return {
                success: true,
                data,
                message: "User enrollment deleted successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Path Enrollments
    // POST /paths/:pathId/enroll
    fastify.post('/paths/:pathId/enroll', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Enroll in a path',
            params: PathIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: { 200: PathEnrollmentResponseSchema }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        try {
            const pathId = parseInt((request.params as any).pathId, 10);
            const userId = parseInt(request.user!.userID);
            const enrollment = await interactionsService.enrollInPath(userId, pathId);
            if (!enrollment) { reply.status(400); return { success: false, data: {} as any, message: 'Failed to enroll in path' }; }
            const data = serializeDates<any>(enrollment);
            return { success: true, data, message: 'Enrolled in path successfully' };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return { success: false, data: {} as any, message: errorMessage };
        }
    });

    // DELETE /paths/:pathId/enroll
    fastify.delete('/paths/:pathId/enroll', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Unenroll from a path',
            params: PathIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: { 200: Type.Object({ success: Type.Boolean(), message: Type.String() }) }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        try {
            const pathId = parseInt((request.params as any).pathId, 10);
            const userId = parseInt(request.user!.userID);
            const success = await interactionsService.unenrollFromPath(userId, pathId);
            return { success, message: success ? 'Unenrolled from path successfully' : 'Enrollment not found' };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return { success: false, message: errorMessage } as any;
        }
    });

    // GET /paths/enrollments/me
    fastify.get('/paths/enrollments/me', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Interactions'],
            summary: 'Get my path enrollments',
            description: 'List current user\'s active path enrollments',
            querystring: PaginationQuerySchema,
            security: [{ bearerAuth: [] }],
            response: { 200: PathEnrollmentsResponseSchema }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        try {
            const page = (request.query as any)?.page ? parseInt((request.query as any).page, 10) : 1;
            const limit = (request.query as any)?.limit ? parseInt((request.query as any).limit, 10) : 10;
            const userId = parseInt(request.user!.userID);
            const raw = await interactionsService.getMyPathEnrollments(userId, page, limit);
            const data = serializeDates<any>(raw);
            return { success: true, data: { enrollments: data.enrollments, total: data.total }, message: 'Enrollments retrieved successfully' };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return { success: false, data: { enrollments: [], total: 0 }, message: errorMessage } as any;
        }
    });


}
