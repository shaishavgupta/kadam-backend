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
    parent_type: ParentTypeSchema,
    is_active: Type.Boolean()
});


export const RatingSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    user_id: Type.Number(),
    course_id: Type.Number(),
    rating: Type.Number({ minimum: 1, maximum: 5 }),
    review: Type.Optional(Type.String())
});

export const PathEnrollmentSchema = Type.Object({
    id: Type.Number(),
    user_id: Type.Number(),
    path_id: Type.Number(),
    is_active: Type.Boolean(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' })
});

export const CreatePathEnrollmentRequestSchema = Type.Object({
    path_id: Type.Number()
});

export const PathEnrollmentResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: PathEnrollmentSchema,
    message: Type.String()
});

export const PathEnrollmentsResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        enrollments: Type.Array(PathEnrollmentSchema),
        total: Type.Number()
    }),
    message: Type.String()
});


export const UserEnrollmentSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    user_id: Type.Number(),
    course_id: Type.Number(),
    module_id: Type.Number(),
    content_id: Type.Number(),
    completed_at: Type.Optional(Type.String({ format: 'date-time' })),
    progress: Type.Number({ minimum: 0, maximum: 100 })
});

export const CreateLikeDTOSchema = Type.Object({
    parent_id: Type.Number(),
    parent_type: ParentTypeSchema,
    is_active: Type.Boolean()
});

export const UpdateLikeDTOSchema = Type.Object({
    is_active: Type.Boolean()
});

export const GetLikesByUserIdDTOSchema = Type.Object({
    userId: Type.Number()
});

export const CreateCommentDTOSchema = Type.Object({
    parent_id: Type.Number(),
    parent_type: ParentTypeSchema,
    comment_text: Type.String(),
    is_active: Type.Boolean()
});

export const UpdateCommentDTOSchema = Type.Object({
    comment_text: Type.Optional(Type.String()),
    is_active: Type.Boolean()
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
    parent_type: ParentTypeSchema,
    is_active: Type.Boolean()
});

export const UpdateSaveDTOSchema = Type.Object({
    is_active: Type.Boolean()
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

export const CreateUserEnrollmentDTOSchema = Type.Object({
    course_id: Type.Number(),
    module_id: Type.Number(),
    content_id: Type.Number(),
    progress: Type.Optional(Type.Number({ minimum: 0, maximum: 100 }))
});

export const UpdateUserEnrollmentDTOSchema = Type.Object({
    completed_at: Type.Optional(Type.String({ format: 'date-time' })),
    progress: Type.Optional(Type.Number({ minimum: 0, maximum: 100 }))
});

// Response wrapper schemas
export const LikeResponseSchema = ApiResponseSchema(LikeSchema);
export const CommentResponseSchema = ApiResponseSchema(CommentSchema);
export const ShareResponseSchema = ApiResponseSchema(ShareSchema);
export const SaveResponseSchema = ApiResponseSchema(SaveSchema);
export const RatingResponseSchema = ApiResponseSchema(RatingSchema);
export const UserEnrollmentResponseSchema = ApiResponseSchema(UserEnrollmentSchema);

// Array response schemas
export const LikesArrayResponseSchema = ApiResponseSchema(Type.Array(LikeSchema));
export const CommentsArrayResponseSchema = ApiResponseSchema(Type.Array(CommentSchema));
export const SharesArrayResponseSchema = ApiResponseSchema(Type.Array(ShareSchema));
export const SavesArrayResponseSchema = ApiResponseSchema(Type.Array(SaveSchema));
export const RatingsArrayResponseSchema = ApiResponseSchema(Type.Array(RatingSchema));
export const UserEnrollmentsArrayResponseSchema = ApiResponseSchema(Type.Array(UserEnrollmentSchema));

// Saved content with details schema
export const SavedContentWithDetailsSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    description: Type.String(),
    module_id: Type.Number(),
    type: Type.String(),
    position: Type.Number(),
    is_paid: Type.Boolean(),
    is_active: Type.Boolean(),
    url: Type.Optional(Type.String()),
    abs_url: Type.Optional(Type.String()),
    duration: Type.Optional(Type.Number()),
    thumbnail_url: Type.Optional(Type.String()),
    category_id: Type.Optional(Type.Number()),
    next_content_id: Type.Optional(Type.Number()),
    approved_at: Type.Optional(Type.String({ format: 'date-time' })),
    approved_by: Type.Optional(Type.Number()),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    course_id: Type.Optional(Type.Number()),
    module_title: Type.Optional(Type.String()),
    module_description: Type.Optional(Type.String()),
    saved_at: Type.String({ format: 'date-time' })
});

export const SavedContentsArrayResponseSchema = ApiResponseSchema(Type.Array(SavedContentWithDetailsSchema));

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


export const RatingIdParamSchema = Type.Object({
    ratingId: Type.String({ pattern: '^[0-9]+$' })
});

export const UserEnrollmentIdParamSchema = Type.Object({
    enrollmentId: Type.String({ pattern: '^[0-9]+$' })
});


export const ParentIdParamSchema = Type.Object({
    parentId: Type.String({ pattern: '^[0-9]+$' })
});

export const InteractionCourseIdParamSchema = Type.Object({
    courseId: Type.String({ pattern: '^[0-9]+$' })
});

// Additional parameter schemas for missing endpoints


export const CommentUpdateParamSchema = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});

export const ShareUpdateParamSchema = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});

export const SaveDeleteParamSchema = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});


export const RatingUpdateParamSchema = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});

export const UserEnrollmentUpdateParamSchema = Type.Object({
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
    count: Type.Number(),
    isLiked: Type.Boolean()
}));

// Delete response schema
export const DeleteResponseSchema = ApiResponseSchema(Type.Object({
    deleted: Type.Boolean()
}));

// Boolean flag responses
export const BooleanFlagResponseSchema = ApiResponseSchema(Type.Object({
    value: Type.Boolean()
}));

// Export inferred TypeScript types using Static
export type ParentType = Static<typeof ParentTypeSchema>;
export type Like = Static<typeof LikeSchema>;
export type Comment = Static<typeof CommentSchema>;
export type Share = Static<typeof ShareSchema>;
export type Save = Static<typeof SaveSchema>;
export type Rating = Static<typeof RatingSchema>;
export type UserEnrollment = Static<typeof UserEnrollmentSchema>;
export type CreateLikeDTO = Static<typeof CreateLikeDTOSchema>;
export type UpdateLikeDTO = Static<typeof UpdateLikeDTOSchema>;
export type GetLikesByUserIdDTO = Static<typeof GetLikesByUserIdDTOSchema>;
export type CreateCommentDTO = Static<typeof CreateCommentDTOSchema>;
export type UpdateCommentDTO = Static<typeof UpdateCommentDTOSchema>;
export type CreateShareDTO = Static<typeof CreateShareDTOSchema>;
export type UpdateShareDTO = Static<typeof UpdateShareDTOSchema>;
export type CreateSaveDTO = Static<typeof CreateSaveDTOSchema>;
export type UpdateSaveDTO = Static<typeof UpdateSaveDTOSchema>;
export type CreateRatingDTO = Static<typeof CreateRatingDTOSchema>;
export type UpdateRatingDTO = Static<typeof UpdateRatingDTOSchema>;
export type CreateUserEnrollmentDTO = Static<typeof CreateUserEnrollmentDTOSchema>;
export type UpdateUserEnrollmentDTO = Static<typeof UpdateUserEnrollmentDTOSchema>;
export type InteractionUserIdParam = Static<typeof InteractionUserIdParamSchema>;
export type LikeIdParam = Static<typeof LikeIdParamSchema>;
export type CommentIdParam = Static<typeof CommentIdParamSchema>;
export type ShareIdParam = Static<typeof ShareIdParamSchema>;
export type SaveIdParam = Static<typeof SaveIdParamSchema>;
export type RatingIdParam = Static<typeof RatingIdParamSchema>;
export type UserEnrollmentIdParam = Static<typeof UserEnrollmentIdParamSchema>;
export type ParentIdParam = Static<typeof ParentIdParamSchema>;
export type InteractionCourseIdParam = Static<typeof InteractionCourseIdParamSchema>;

export type CommentUpdateParam = Static<typeof CommentUpdateParamSchema>;
export type ShareUpdateParam = Static<typeof ShareUpdateParamSchema>;
export type SaveDeleteParam = Static<typeof SaveDeleteParamSchema>;
export type RatingUpdateParam = Static<typeof RatingUpdateParamSchema>;
export type UserEnrollmentUpdateParam = Static<typeof UserEnrollmentUpdateParamSchema>;
export type ParentTypeParam = Static<typeof ParentTypeParamSchema>;
export type SimpleUserIdParam = Static<typeof SimpleUserIdParamSchema>;
export type PathEnrollment = Static<typeof PathEnrollmentSchema>;
export type CreatePathEnrollmentRequest = Static<typeof CreatePathEnrollmentRequestSchema>;
export type PathEnrollmentResponse = Static<typeof PathEnrollmentResponseSchema>;
export type PathEnrollmentsResponse = Static<typeof PathEnrollmentsResponseSchema>;
export type SavedContentWithDetails = Static<typeof SavedContentWithDetailsSchema>;

