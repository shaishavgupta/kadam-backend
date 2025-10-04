import { Type, Static } from '@sinclair/typebox';
import { ApiResponseSchema, PaginationQuerySchema } from './common';

// Import enums for schema definitions
import { ParentType as ParentTypeEnum } from '../shared/enums';

// Enum schemas
export const ParentTypeSchema = Type.Union([
    Type.Literal(ParentTypeEnum.CONTENT),
    Type.Literal(ParentTypeEnum.COURSE),
    Type.Literal(ParentTypeEnum.COMMENT)
]);

// Base schemas matching existing interfaces
export const LikeSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    user_id: Type.Number(),
    parent_id: Type.Number(),
    parent_type: ParentTypeSchema,
    is_active: Type.Boolean()
});

export const CommentSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    user_id: Type.Number(),
    parent_id: Type.Number(),
    parent_type: ParentTypeSchema,
    is_active: Type.Boolean(),
    comment_text: Type.String()
});

export const ShareSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    user_id: Type.Number(),
    parent_id: Type.Number(),
    parent_type: ParentTypeSchema,
    shared_url: Type.Optional(Type.String())
});

export const SaveSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    user_id: Type.Number(),
    parent_id: Type.Number(),
    parent_type: ParentTypeSchema
});

export const ViewSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    user_id: Type.Number(),
    parent_id: Type.Number(),
    parent_type: ParentTypeSchema,
    duration: Type.Optional(Type.Number())
});

export const RatingSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    user_id: Type.Number(),
    course_id: Type.Number(),
    rating: Type.Number({ minimum: 1, maximum: 5 }),
    review: Type.Optional(Type.String())
});

// Request schemas
export const CreateLikeDTOSchema = Type.Object({
    parent_id: Type.Number(),
    parent_type: ParentTypeSchema
});

export const UpdateLikeDTOSchema = Type.Object({
    is_active: Type.Optional(Type.Boolean())
});

export const GetLikesByUserIdDTOSchema = Type.Object({
    userId: Type.Number()
});

export const CreateCommentDTOSchema = Type.Object({
    parent_id: Type.Number(),
    parent_type: ParentTypeSchema,
    comment_text: Type.String(),
    is_active: Type.Optional(Type.Boolean())
});

export const UpdateCommentDTOSchema = Type.Object({
    comment_text: Type.Optional(Type.String()),
    is_active: Type.Optional(Type.Boolean())
});

export const CreateShareDTOSchema = Type.Object({
    parent_id: Type.Number(),
    parent_type: ParentTypeSchema,
    shared_url: Type.Optional(Type.String())
});

export const UpdateShareDTOSchema = Type.Object({
    shared_url: Type.Optional(Type.String())
});

export const CreateSaveDTOSchema = Type.Object({
    parent_id: Type.Number(),
    parent_type: ParentTypeSchema
});

export const CreateViewDTOSchema = Type.Object({
    parent_id: Type.Number(),
    parent_type: ParentTypeSchema,
    duration: Type.Optional(Type.Number())
});

export const UpdateViewDTOSchema = Type.Object({
    duration: Type.Optional(Type.Number())
});

export const CreateRatingDTOSchema = Type.Object({
    course_id: Type.Number(),
    rating: Type.Number({ minimum: 1, maximum: 5 }),
    review: Type.Optional(Type.String())
});

export const UpdateRatingDTOSchema = Type.Object({
    rating: Type.Optional(Type.Number({ minimum: 1, maximum: 5 })),
    review: Type.Optional(Type.String())
});

// Response wrapper schemas
export const LikeResponseSchema = ApiResponseSchema(LikeSchema);
export const CommentResponseSchema = ApiResponseSchema(CommentSchema);
export const ShareResponseSchema = ApiResponseSchema(ShareSchema);
export const SaveResponseSchema = ApiResponseSchema(SaveSchema);
export const ViewResponseSchema = ApiResponseSchema(ViewSchema);
export const RatingResponseSchema = ApiResponseSchema(RatingSchema);

// Array response schemas
export const LikesArrayResponseSchema = ApiResponseSchema(Type.Array(LikeSchema));
export const CommentsArrayResponseSchema = ApiResponseSchema(Type.Array(CommentSchema));
export const SharesArrayResponseSchema = ApiResponseSchema(Type.Array(ShareSchema));
export const SavesArrayResponseSchema = ApiResponseSchema(Type.Array(SaveSchema));
export const ViewsArrayResponseSchema = ApiResponseSchema(Type.Array(ViewSchema));
export const RatingsArrayResponseSchema = ApiResponseSchema(Type.Array(RatingSchema));

// Additional schemas for missing endpoints
export const InteractionUserIdParamSchema = Type.Object({
    userId: Type.String({ pattern: '^[0-9]+$' })
});

export const LikeIdParamSchema = Type.Object({
    likeId: Type.String({ pattern: '^[0-9]+$' })
});

export const CommentIdParamSchema = Type.Object({
    commentId: Type.String({ pattern: '^[0-9]+$' })
});

export const ShareIdParamSchema = Type.Object({
    shareId: Type.String({ pattern: '^[0-9]+$' })
});

export const SaveIdParamSchema = Type.Object({
    saveId: Type.String({ pattern: '^[0-9]+$' })
});

export const ViewIdParamSchema = Type.Object({
    viewId: Type.String({ pattern: '^[0-9]+$' })
});

export const RatingIdParamSchema = Type.Object({
    ratingId: Type.String({ pattern: '^[0-9]+$' })
});

export const ParentIdParamSchema = Type.Object({
    parentId: Type.String({ pattern: '^[0-9]+$' })
});

export const InteractionCourseIdParamSchema = Type.Object({
    courseId: Type.String({ pattern: '^[0-9]+$' })
});

// Additional parameter schemas for missing endpoints
export const LikeUpdateParamSchema = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});

export const CommentUpdateParamSchema = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});

export const ShareUpdateParamSchema = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});

export const SaveDeleteParamSchema = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});

export const ViewUpdateParamSchema = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});

export const RatingUpdateParamSchema = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});

// Parent type and ID parameter schemas
export const ParentTypeParamSchema = Type.Object({
    parentType: Type.String(),
    parentId: Type.String({ pattern: '^[0-9]+$' })
});

// Simple User ID parameter schema for interactions
export const SimpleUserIdParamSchema = Type.Object({
    userId: Type.String({ pattern: '^[0-9]+$' })
});

// Count response schema
export const CountResponseSchema = ApiResponseSchema(Type.Object({
    count: Type.Number()
}));

// Delete response schema
export const DeleteResponseSchema = ApiResponseSchema(Type.Object({
    deleted: Type.Boolean()
}));

// Export inferred TypeScript types using Static
export type ParentType = Static<typeof ParentTypeSchema>;
export type Like = Static<typeof LikeSchema>;
export type Comment = Static<typeof CommentSchema>;
export type Share = Static<typeof ShareSchema>;
export type Save = Static<typeof SaveSchema>;
export type View = Static<typeof ViewSchema>;
export type Rating = Static<typeof RatingSchema>;
export type CreateLikeDTO = Static<typeof CreateLikeDTOSchema>;
export type UpdateLikeDTO = Static<typeof UpdateLikeDTOSchema>;
export type GetLikesByUserIdDTO = Static<typeof GetLikesByUserIdDTOSchema>;
export type CreateCommentDTO = Static<typeof CreateCommentDTOSchema>;
export type UpdateCommentDTO = Static<typeof UpdateCommentDTOSchema>;
export type CreateShareDTO = Static<typeof CreateShareDTOSchema>;
export type UpdateShareDTO = Static<typeof UpdateShareDTOSchema>;
export type CreateSaveDTO = Static<typeof CreateSaveDTOSchema>;
export type CreateViewDTO = Static<typeof CreateViewDTOSchema>;
export type UpdateViewDTO = Static<typeof UpdateViewDTOSchema>;
export type CreateRatingDTO = Static<typeof CreateRatingDTOSchema>;
export type UpdateRatingDTO = Static<typeof UpdateRatingDTOSchema>;
export type InteractionUserIdParam = Static<typeof InteractionUserIdParamSchema>;
export type LikeIdParam = Static<typeof LikeIdParamSchema>;
export type CommentIdParam = Static<typeof CommentIdParamSchema>;
export type ShareIdParam = Static<typeof ShareIdParamSchema>;
export type SaveIdParam = Static<typeof SaveIdParamSchema>;
export type ViewIdParam = Static<typeof ViewIdParamSchema>;
export type RatingIdParam = Static<typeof RatingIdParamSchema>;
export type ParentIdParam = Static<typeof ParentIdParamSchema>;
export type InteractionCourseIdParam = Static<typeof InteractionCourseIdParamSchema>;
export type LikeUpdateParam = Static<typeof LikeUpdateParamSchema>;
export type CommentUpdateParam = Static<typeof CommentUpdateParamSchema>;
export type ShareUpdateParam = Static<typeof ShareUpdateParamSchema>;
export type SaveDeleteParam = Static<typeof SaveDeleteParamSchema>;
export type ViewUpdateParam = Static<typeof ViewUpdateParamSchema>;
export type RatingUpdateParam = Static<typeof RatingUpdateParamSchema>;
export type ParentTypeParam = Static<typeof ParentTypeParamSchema>;
export type SimpleUserIdParam = Static<typeof SimpleUserIdParamSchema>;

