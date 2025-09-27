import { Type, Static } from '@sinclair/typebox';
import { ApiResponseSchema } from './common';
import { Language as LanguageEnum, Gender as GenderEnum, PlanType as PlanTypeEnum, UserType as UserTypeEnum } from '../shared/enums';

// OTP related schemas
export const SendOtpRequestSchema = Type.Object({
    phone: Type.String({
        pattern: '^[0-9]{10}$',
        description: '10-digit phone number'
    })
});

export const SendOtpResponseSchema = Type.Object({
    success: Type.Boolean(),
    message: Type.String()
});

export const VerifyOtpRequestSchema = Type.Object({
    phone: Type.String({
        pattern: '^[0-9]{10}$',
        description: '10-digit phone number'
    }),
    otp: Type.String({
        pattern: '^[0-9]{4}$',
        description: '4-digit OTP'
    }),
    language: Type.Enum(LanguageEnum),
    userType: Type.Enum(UserTypeEnum)
});

export const VerifyOtpResponseSchema = Type.Object({
    accessToken: Type.String(),
    refreshToken: Type.String(),
    isNewUser: Type.Boolean(),
    userId: Type.Number()
});

// User creation schemas for different user types
export const CreateUserWithAuthRequestSchema = Type.Object({
    email: Type.Optional(Type.String({ format: 'email' })),
    name: Type.Optional(Type.String()),
    avatar_url: Type.Optional(Type.String()),
    phone: Type.String(),
    preferred_language: Type.Optional(Type.Enum(LanguageEnum)),
    plan_type: Type.Optional(Type.Enum(PlanTypeEnum)),
    dob: Type.Optional(Type.String({ format: 'date' })),
    bio: Type.Optional(Type.String()),
    gender: Type.Optional(Type.Enum(GenderEnum)),
    whatsapp_allowed: Type.Optional(Type.Boolean()),
    onboarding_completed: Type.Optional(Type.Boolean())
});

export const CreateAdminRequestSchema = Type.Object({
    email: Type.String({ format: 'email' }),
    name: Type.String(),
    phone: Type.String(),
    role: Type.String(),
    permissions: Type.Array(Type.String())
});

export const CreateCreatorWithUserRequestSchema = Type.Object({
    email: Type.String({ format: 'email' }),
    name: Type.String(),
    phone: Type.String(),
    bio: Type.Optional(Type.String()),
    avatar_url: Type.Optional(Type.String()),
    specialization: Type.Optional(Type.String()),
    experience_years: Type.Optional(Type.Number()),
    social_links: Type.Optional(Type.Object({
        youtube: Type.Optional(Type.String()),
        instagram: Type.Optional(Type.String()),
        linkedin: Type.Optional(Type.String()),
        twitter: Type.Optional(Type.String())
    }))
});

// Response schemas
export const UserWithAuthResponseSchema = ApiResponseSchema(Type.Object({
    id: Type.Number(),
    email: Type.Optional(Type.String({ format: 'email' })),
    name: Type.Optional(Type.String()),
    phone: Type.String(),
    avatar_url: Type.Optional(Type.String()),
    preferred_language: Type.Enum(LanguageEnum),
    plan_type: Type.Enum(PlanTypeEnum),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    is_active: Type.Boolean(),
    last_active_at: Type.Optional(Type.String({ format: 'date-time' })),
    paid_at: Type.Optional(Type.String({ format: 'date-time' })),
    dob: Type.Optional(Type.String({ format: 'date' })),
    bio: Type.Optional(Type.String()),
    gender: Type.Optional(Type.Enum(GenderEnum)),
    onboarding_completed: Type.Boolean(),
    whatsapp_allowed: Type.Boolean()
}));

export const AdminResponseSchema = ApiResponseSchema(Type.Object({
    id: Type.Number(),
    email: Type.String({ format: 'email' }),
    name: Type.String(),
    phone: Type.String(),
    role: Type.String(),
    permissions: Type.Array(Type.String()),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    is_active: Type.Boolean()
}));

export const CreatorWithUserResponseSchema = ApiResponseSchema(Type.Object({
    id: Type.Number(),
    email: Type.String({ format: 'email' }),
    name: Type.String(),
    phone: Type.String(),
    bio: Type.Optional(Type.String()),
    avatar_url: Type.Optional(Type.String()),
    specialization: Type.Optional(Type.String()),
    experience_years: Type.Optional(Type.Number()),
    social_links: Type.Optional(Type.Object({
        youtube: Type.Optional(Type.String()),
        instagram: Type.Optional(Type.String()),
        linkedin: Type.Optional(Type.String()),
        twitter: Type.Optional(Type.String())
    })),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    is_active: Type.Boolean()
}));

// Refresh token schemas
export const RefreshTokenRequestSchema = Type.Object({
    refreshToken: Type.String({
        description: 'Refresh token to generate new access token'
    }),
    userType: Type.Enum(UserTypeEnum, {
        description: 'Type of user (user, admin, creator)'
    })
});

export const RefreshTokenResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(Type.Object({
        accessToken: Type.String(),
        refreshToken: Type.String(),
        user: Type.Object({
            id: Type.Number(),
            userType: Type.Enum(UserTypeEnum)
        })
    })),
    message: Type.String()
});

// Export inferred TypeScript types using Static
export type SendOtpRequest = Static<typeof SendOtpRequestSchema>;
export type SendOtpResponse = Static<typeof SendOtpResponseSchema>;
export type VerifyOtpRequest = Static<typeof VerifyOtpRequestSchema>;
export type VerifyOtpResponse = Static<typeof VerifyOtpResponseSchema>;
export type CreateUserWithAuthRequest = Static<typeof CreateUserWithAuthRequestSchema>;
export type CreateAdminRequest = Static<typeof CreateAdminRequestSchema>;
export type CreateCreatorWithUserRequest = Static<typeof CreateCreatorWithUserRequestSchema>;
export type RefreshTokenRequest = Static<typeof RefreshTokenRequestSchema>;
export type RefreshTokenResponse = Static<typeof RefreshTokenResponseSchema>;
