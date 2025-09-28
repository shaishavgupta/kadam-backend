import { Type, Static } from '@sinclair/typebox';
import { ApiResponseSchema, PaginationQuerySchema } from './common';

// Import enums for schema definitions
import { Language as LanguageEnum, Gender as GenderEnum, PlanType as PlanTypeEnum } from '../shared/enums';

// Enum schemas
export const LanguageSchema = Type.Union([
    Type.Literal(LanguageEnum.ENGLISH),
    Type.Literal(LanguageEnum.HINDI)
]);

export const GenderSchema = Type.Union([
    Type.Literal(GenderEnum.MALE),
    Type.Literal(GenderEnum.FEMALE),
    Type.Literal(GenderEnum.OTHERS)
]);

export const PlanTypeSchema = Type.Union([
    Type.Literal(PlanTypeEnum.FREE),
    Type.Literal(PlanTypeEnum.PREMIUM),
    Type.Literal(PlanTypeEnum.PRO)
]);


// Base schemas matching existing interfaces
export const UserSchema = Type.Object({
    id: Type.Number(),
    email: Type.Optional(Type.String({ format: 'email' })),
    name: Type.Optional(Type.String()),
    phone: Type.String(),
    avatar_url: Type.Optional(Type.String()),
    preferred_language: LanguageSchema,
    plan_type: PlanTypeSchema,
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    is_active: Type.Boolean(),
    last_active_at: Type.Optional(Type.String({ format: 'date-time' })),
    paid_at: Type.Optional(Type.String({ format: 'date-time' })),
    dob: Type.Optional(Type.String({ format: 'date' })),
    bio: Type.Optional(Type.String()),
    gender: Type.Optional(GenderSchema),
    onboarding_completed: Type.Boolean(),
    whatsapp_allowed: Type.Boolean()
});

export const CreateUserRequestSchema = Type.Object({
    email: Type.Optional(Type.String({ format: 'email' })),
    name: Type.Optional(Type.String()),
    avatar_url: Type.Optional(Type.String()),
    phone: Type.String(),
    preferred_language: Type.Optional(LanguageSchema),
    plan_type: Type.Optional(PlanTypeSchema),
    dob: Type.Optional(Type.String({ format: 'date' })),
    bio: Type.Optional(Type.String()),
    gender: Type.Optional(GenderSchema),
    whatsapp_allowed: Type.Optional(Type.Boolean()),
    onboarding_completed: Type.Optional(Type.Boolean())
});

export const UpdateUserRequestSchema = Type.Partial(CreateUserRequestSchema);

// Pagination schemas
export const PaginatedUsersResponseSchema = Type.Object({
    users: Type.Array(UserSchema),
    total: Type.Number(),
    page: Type.Number(),
    limit: Type.Number(),
    totalPages: Type.Number()
});

// Query parameter schemas
export const GetUsersQuerySchema = PaginationQuerySchema;

export const UserResponseSchema = ApiResponseSchema(UserSchema);
export const PaginatedUsersResponseWrapperSchema = ApiResponseSchema(PaginatedUsersResponseSchema);

// Additional schemas
// Additional schemas matching existing interfaces
export const UserBadgeSchema = Type.Object({
    id: Type.Number(),
    user_id: Type.Number(),
    badge_type: Type.String(),
    earned_at: Type.String({ format: 'date-time' })
});

export const UserEnrollmentSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    user_id: Type.Number(),
    course_id: Type.Number(),
    completed_at: Type.Optional(Type.String({ format: 'date-time' })),
    progress: Type.Number({ minimum: 0, maximum: 100 })
});

export const UserCertificateSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    user_id: Type.Number(),
    course_id: Type.Number(),
    url: Type.String()
});

export const BannerSchema = Type.Object({
    id: Type.Number(),
    image_url: Type.String(),
    redirect_url: Type.String()
});

// Additional schemas for missing endpoints
export const UserEnumsResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        languages: Type.Array(Type.String()),
        genders: Type.Array(Type.String()),
        planTypes: Type.Array(Type.String())
    }),
    message: Type.String()
});



export const CleanupOtpsResponseSchema = Type.Object({
    success: Type.Boolean(),
    message: Type.String()
});

// Parameter schemas
export const UserIdParamSchema = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});

export const UserPhoneParamSchema = Type.Object({
    phone: Type.String({ pattern: '^[0-9]{10}$' })
});

export const UserEmailParamSchema = Type.Object({
    email: Type.String({ format: 'email' })
});

// Export inferred TypeScript types using Static
export type User = Static<typeof UserSchema>;
export type CreateUserRequest = Static<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = Static<typeof UpdateUserRequestSchema>;
export type PaginatedUsersResponse = Static<typeof PaginatedUsersResponseSchema>;
export type GetUsersQuery = Static<typeof GetUsersQuerySchema>;
export type UserBadge = Static<typeof UserBadgeSchema>;
export type UserEnrollment = Static<typeof UserEnrollmentSchema>;
export type UserCertificate = Static<typeof UserCertificateSchema>;
export type Banner = Static<typeof BannerSchema>;
export type UserEnumsResponse = Static<typeof UserEnumsResponseSchema>;
export type CleanupOtpsResponse = Static<typeof CleanupOtpsResponseSchema>;
export type UserIdParam = Static<typeof UserIdParamSchema>;
export type UserPhoneParam = Static<typeof UserPhoneParamSchema>;
export type UserEmailParam = Static<typeof UserEmailParamSchema>;
