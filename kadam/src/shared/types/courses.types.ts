import { ContentType } from '../enums';

export { ContentType };

export interface Tag {
    id: number;
    name: string;
}

export interface Category {
    id: number;
    name: string;
    image_url: string;
}

export interface Module {
    id: number;
    name: string;
    description: string;
    position: number;
    is_paid: boolean;
    is_active: boolean;
    approved_at?: Date;
    approved_by?: number;
    created_at: Date;
    updated_at: Date;
}

export interface Content {
    id: number;
    module_id: number;
    course_id: number;
    type: ContentType;
    position: number;
    is_paid: boolean;
    is_active: boolean;
    url?: string;
    duration?: number;
    thumbnail_url?: string;
    category_id?: number;
    next_content_id?: number;
    approved_at?: Date;
    approved_by?: number;
    created_at: Date;
    updated_at: Date;
}

export interface Course {
    id: number;
    name: string;
    description: string;
    is_paid: boolean;
    price: number;
    thumbnail_url?: string;
    certificate_url: string;
    rank: number;
    published_at?: Date;
    created_at: Date;
    updated_at: Date;
}

export interface CourseVector {
    id: number;
    name: string;
    description: string;
    course_id: number;
}

export interface CreateCourseRequest {
    name: string;
    description: string;
    creator_id: number;
    category_id: number;
    tags: string[];
    is_paid: boolean;
    is_active: boolean;
    price: number;
    thumbnail_url?: string;
    certificate_url: string;
    contents?: CreateContentRequest[];
}

export interface CreateModuleRequest {
    name: string;
    description: string;
    position: number;
    is_paid: boolean;
    is_active: boolean;
}

export interface CreateContentRequest {
    type: ContentType;
    position: number;
    is_paid: boolean;
    is_active: boolean;
    url?: string;
    duration?: number;
    thumbnail_url?: string;
    category_id?: number;
    next_content_id?: number;
    module_name?: string;
}

export interface UpdateCourseRequest {
    id: number;
    name: string;
    description: string;
    creator_id: number;
    category_id: number;
    tags: string[];
    is_paid: boolean;
    is_active: boolean;
    price: number;
    thumbnail_url?: string;
    certificate_url: string;
    contents?: CreateContentRequest[];
}

export interface ContentWithModule {
    id: number;
    module_id?: number;
    course_id: number;
    type: ContentType;
    position: number;
    is_paid: boolean;
    is_active: boolean;
    url?: string;
    duration?: number;
    thumbnail_url?: string;
    category_id?: number;
    next_content_id?: number;
    approved_at?: Date;
    approved_by?: number;
    created_at: Date;
    updated_at: Date;
}

export interface PaginatedCoursesResponse {
    courses: Course[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PublishCourseRequest {
    course_id: number;
    published_at?: Date; // Optional, defaults to current timestamp if not provided
}
