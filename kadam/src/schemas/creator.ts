import { Type, Static } from '@sinclair/typebox';
import { ApiResponseSchema, PaginationQuerySchema } from './common';

// Import enums for schema definitions
import { QualificationType as QualificationTypeEnum, AchievementType as AchievementTypeEnum } from '../shared/enums';

// Enum schemas
export const QualificationTypeSchema = Type.Union([
    Type.Literal(QualificationTypeEnum.DEGREE),
    Type.Literal(QualificationTypeEnum.DIPLOMA),
    Type.Literal(QualificationTypeEnum.CERTIFICATION)
]);

export const AchievementTypeSchema = Type.Union([
    Type.Literal(AchievementTypeEnum.ACADEMIC),
    Type.Literal(AchievementTypeEnum.SPORTS),
    Type.Literal(AchievementTypeEnum.PROFESSIONAL)
]);

// Base schemas matching existing interfaces
export const CreatorSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    name: Type.String(),
    bio: Type.Optional(Type.String()),
    profile_pic: Type.Optional(Type.String({ format: 'uri' })),
    rating: Type.Optional(Type.Number())
});

export const QualificationSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    institution: Type.String(),
    qualification_type: QualificationTypeSchema,
    start_date: Type.Optional(Type.String({ format: 'date' })),
    end_date: Type.Optional(Type.String({ format: 'date' })),
    grade: Type.Optional(Type.String()),
    created_at: Type.String({ format: 'date-time' })
});

export const AchievementSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    title: Type.String(),
    description: Type.Optional(Type.String()),
    types: AchievementTypeSchema,
    date_achieved: Type.String({ format: 'date' })
});

export const CreatorQualificationSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    qualification_id: Type.Number(),
    creator_id: Type.Number()
});

export const CreatorAchievementSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    achievement_id: Type.Number(),
    creator_id: Type.Number()
});

// Request schemas
export const CreateCreatorRequestSchema = Type.Object({
    name: Type.String(),
    bio: Type.Optional(Type.String()),
    profile_pic: Type.Optional(Type.String({ format: 'uri' })),
    rating: Type.Optional(Type.Number())
});

export const UpdateCreatorRequestSchema = Type.Partial(CreateCreatorRequestSchema);

export const CreateQualificationRequestSchema = Type.Object({
    title: Type.String(),
    institution: Type.String(),
    year: Type.Number(),
    description: Type.Optional(Type.String())
});

export const CreateAchievementRequestSchema = Type.Object({
    title: Type.String(),
    description: Type.Optional(Type.String()),
    year: Type.Number()
});

// Response schemas
export const CreatorWithDetailsSchema = Type.Object({
    creator: CreatorSchema,
    qualifications: Type.Array(QualificationSchema),
    achievements: Type.Array(AchievementSchema)
});

export const CreatorStatsSchema = Type.Object({
    total_courses: Type.Number(),
    published_courses: Type.Number(),
    avg_rating: Type.Number(),
    num_ratings: Type.Number()
});

export const PaginatedCreatorsResponseSchema = Type.Object({
    creators: Type.Array(CreatorSchema),
    total: Type.Number(),
    page: Type.Number(),
    limit: Type.Number(),
    totalPages: Type.Number()
});

// Query parameter schemas
export const GetCreatorsQuerySchema = PaginationQuerySchema;

// Response wrapper schemas
export const CreatorResponseSchema = ApiResponseSchema(CreatorSchema);
export const CreatorWithDetailsResponseSchema = ApiResponseSchema(CreatorWithDetailsSchema);
export const CreatorStatsResponseSchema = ApiResponseSchema(CreatorStatsSchema);
export const PaginatedCreatorsResponseWrapperSchema = ApiResponseSchema(PaginatedCreatorsResponseSchema);
export const QualificationResponseSchema = ApiResponseSchema(QualificationSchema);
export const AchievementResponseSchema = ApiResponseSchema(AchievementSchema);

// Additional schemas for missing endpoints
export const CreatorIdParamSchema = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});

export const CreateCreatorResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: CreatorSchema,
    message: Type.String()
});

export const UpdateCreatorResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: CreatorSchema,
    message: Type.String()
});

export const DeleteCreatorResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Any(),
    message: Type.String()
});

// Export inferred TypeScript types using Static
export type QualificationType = Static<typeof QualificationTypeSchema>;
export type AchievementType = Static<typeof AchievementTypeSchema>;
export type Creator = Static<typeof CreatorSchema>;
export type Qualification = Static<typeof QualificationSchema>;
export type Achievement = Static<typeof AchievementSchema>;
export type CreatorQualification = Static<typeof CreatorQualificationSchema>;
export type CreatorAchievement = Static<typeof CreatorAchievementSchema>;
export type CreateCreatorRequest = Static<typeof CreateCreatorRequestSchema>;
export type UpdateCreatorRequest = Static<typeof UpdateCreatorRequestSchema>;
export type CreateQualificationRequest = Static<typeof CreateQualificationRequestSchema>;
export type CreateAchievementRequest = Static<typeof CreateAchievementRequestSchema>;
export type CreatorWithDetails = Static<typeof CreatorWithDetailsSchema>;
export type CreatorStats = Static<typeof CreatorStatsSchema>;
export type PaginatedCreatorsResponse = Static<typeof PaginatedCreatorsResponseSchema>;
export type GetCreatorsQuery = Static<typeof GetCreatorsQuerySchema>;
export type CreatorIdParam = Static<typeof CreatorIdParamSchema>;
export type CreateCreatorResponse = Static<typeof CreateCreatorResponseSchema>;
export type UpdateCreatorResponse = Static<typeof UpdateCreatorResponseSchema>;
export type DeleteCreatorResponse = Static<typeof DeleteCreatorResponseSchema>;

