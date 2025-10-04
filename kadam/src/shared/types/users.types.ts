import { Language, Gender, PlanType } from '../enums';

export { Language, Gender, PlanType };

// User, CreateUserRequest, and UpdateUserRequest are now defined as TypeBox schemas in ../schemas/user.ts
// Import them using: import { User, CreateUserRequest, UpdateUserRequest } from '../schemas/user'

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

// PaginatedUsersResponse, UserBadge, UserEnrollment, UserCertificate, and Banner
// are now defined as TypeBox schemas in ../schemas/user.ts
// Import them using: import {
//   PaginatedUsersResponse, UserBadge, UserEnrollment, UserCertificate, Banner
// } from '../schemas/user'
