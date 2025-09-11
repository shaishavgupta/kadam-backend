import { QualificationType, AchievementType } from '../enums';

export { QualificationType, AchievementType };

export interface Creator {
    id: number;
    created_at: Date;
    updated_at: Date;
    name: string;
    bio?: string;
    profile_pic?: string;
    rating?: number;
}

export interface Qualification {
    id: number;
    name: string;
    institution: string;
    qualification_type: QualificationType;
    start_date?: Date;
    end_date?: Date;
    grade?: string;
    created_at: Date;
}

export interface Achievement {
    id: number;
    created_at: Date;
    updated_at: Date;
    title: string;
    description?: string;
    types: AchievementType;
    date_achieved: Date;
}

export interface CreatorQualification {
    id: number;
    created_at: Date;
    updated_at: Date;
    qualification_id: number;
    creator_id: number;
}

export interface CreatorAchievement {
    id: number;
    created_at: Date;
    updated_at: Date;
    achievement_id: number;
    creator_id: number;
}

export interface CreateCreatorRequest {
    name: string;
    bio?: string;
    profile_pic?: string;
    rating?: number;
}

export interface UpdateCreatorRequest extends Partial<CreateCreatorRequest> { }

export interface CreateQualificationRequest {
    title: string;
    institution: string;
    year: number;
    description?: string;
}

export interface CreateAchievementRequest {
    title: string;
    description?: string;
    year: number;
}

export interface CreatorWithDetails {
    creator: Creator;
    qualifications: Qualification[];
    achievements: Achievement[];
}

export interface CreatorStats {
    total_courses: number;
    published_courses: number;
    avg_rating: number;
    num_ratings: number;
}

export interface PaginatedCreatorsResponse {
    creators: Creator[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
