import { ParentType } from '../enums';

export { ParentType };

export interface Like {
    id: number;
    created_at: Date;
    user_id: number;
    parent_id: number;
    parent_type: ParentType;
    is_active: boolean;
}

export interface CreateLikeDTO {
    user_id: number;
    parent_id: number;
    parent_type: ParentType;
}

export interface UpdateLikeDTO {
    is_active?: boolean;
}

export interface GetLikesByUserIdDTO {
    userId: number;
}

export interface Comment {
    id: number;
    created_at: Date;
    updated_at: Date;
    user_id: number;
    parent_id: number;
    parent_type: ParentType;
    is_active: boolean;
    comment_text: string;
}

export interface CreateCommentDTO {
    user_id: number;
    parent_id: number;
    parent_type: ParentType;
    comment_text: string;
    is_active?: boolean;
}

export interface UpdateCommentDTO {
    comment_text?: string;
    is_active?: boolean;
}

export interface Share {
    id: number;
    created_at: Date;
    user_id: number;
    parent_id: number;
    parent_type: ParentType;
    shared_url?: string;
}

export interface CreateShareDTO {
    user_id: number;
    parent_id: number;
    parent_type: ParentType;
    shared_url?: string;
}

export interface UpdateShareDTO {
    shared_url?: string;
}

export interface Save {
    id: number;
    created_at: Date;
    user_id: number;
    parent_id: number;
    parent_type: ParentType;
}

export interface CreateSaveDTO {
    user_id: number;
    parent_id: number;
    parent_type: ParentType;
}

export interface View {
    id: number;
    created_at: Date;
    user_id: number;
    parent_id: number;
    parent_type: ParentType;
    duration?: number;
}

export interface CreateViewDTO {
    user_id: number;
    parent_id: number;
    parent_type: ParentType;
    duration?: number;
}

export interface UpdateViewDTO {
    duration?: number;
}

export interface Rating {
    id: number;
    created_at: Date;
    user_id: number;
    course_id: number;
    rating: number;
    review?: string;
}

export interface CreateRatingDTO {
    user_id: number;
    course_id: number;
    rating: number;
    review?: string;
}

export interface UpdateRatingDTO {
    rating?: number;
    review?: string;
}
