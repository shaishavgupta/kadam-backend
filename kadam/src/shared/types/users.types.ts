import { Language, Gender, PlanType } from '../enums';

export { Language, Gender, PlanType };

export interface User {
    id: number;
    email?: string;
    name?: string;
    phone: string;
    avatar_url?: string;
    preferred_language: Language;
    plan_type: PlanType;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
    last_active_at?: Date;
    paid_at?: Date;
    dob?: Date;
    bio?: string;
    gender?: Gender;
    onboarding_completed: boolean;
    whatsapp_allowed: boolean;
}

export interface CreateUserRequest {
    email?: string;
    name?: string;
    avatar_url?: string;
    phone: string;
    preferred_language?: Language;
    plan_type?: PlanType;
    dob?: string;
    bio?: string;
    gender?: Gender;
    whatsapp_allowed?: boolean;
    onboarding_completed?: boolean;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> { }

export interface SendOtpRequest {
    phone: string;
}

export interface VerifyOtpRequest {
    phone: string;
    otp: string;
    language: Language;
}

export interface VerifyOtpResponse {
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
    userId: number;
}

export interface PaginatedUsersResponse {
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface UserBadge {
    id: number;
    user_id: number;
    badge_type: string;
    earned_at: Date;
}

export interface UserEnrollment {
    id: number;
    created_at: Date;
    user_id: number;
    course_id: number;
    completed_at?: Date;
    progress: number;
}

export interface UserCertificate {
    id: number;
    created_at: Date;
    user_id: number;
    course_id: number;
    url: string;
}

export interface Banner {
    id: number;
    image_url: string;
    redirect_url: string;
}
