export const AdminConfigurations = {
    loginPageBackground: "loginPageBackground",
    homePageBanners: "homePageBanners",
    homePagePopularCategories: "homePagePopularCategories"
} as const;

export interface AdminConfigurationRequest {
    key: string;
    value: any;
    created_by: number;
    updated_by: number;
}

export interface AdminConfigurationResponse {
    id: number;
    key: string;
    value: any;
    created_at: Date;
    updated_at: Date;
    created_by: number;
    updated_by: number;
}

export interface DashboardData {
    totalUsers: number;
    totalCreators: number;
    totalCourses: number;
    totalRevenue: number;
}

export interface Admin {
    id: number;
    email: string;
    name: string;
    phone: string;
    password: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    last_active_at?: Date;
    profile_pic?: string;
}

export interface VideoMetadata {
    title: string;
    description?: string;
    duration?: number;
    position: number;
    is_paid: boolean;
    is_active: boolean;
    module_name?: string;
    url: string;
    thumbnail_url?: string;
}

export interface CreateContentsRequest {
    videos: VideoMetadata[];
}

export interface CreateContentsResponse {
    success: boolean;
    data: {
        createdContents: Array<{
            id: number;
            title: string;
            description?: string;
            duration?: number;
            position: number;
            is_paid: boolean;
            is_active: boolean;
            module_name?: string;
            url: string;
            thumbnail_url?: string;
            course_id: number;
            created_at: string;
            updated_at: string;
        }>;
    };
    message: string;
}

export interface AdminContent {
    id: number;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
    name: string;
    module_id: number;
    content_type: string;
    next_content_id?: number;
    is_paid: boolean;
    approved_at?: Date;
    approved_by?: number;
    position: number;
    url?: string;
    duration?: number;
    thumbnail_url?: string;
    category_id?: number;
    rejected_at?: Date;
    rejected_by?: number;
    rejection_reason?: string;
    abs_url?: string;
}

export interface AdminModule {
    id: number;
    created_at: Date;
    updated_at: Date;
    name: string;
    description: string;
    course_id: number;
    thumbnail_url?: string;
    approved_at?: Date;
    approved_by?: number;
    is_paid: boolean;
    is_active: boolean;
    position: number;
    contents: AdminContent[];
    rejected_at?: Date;
    rejected_by?: number;
    rejection_reason?: string;
}

export interface CourseWithModulesAndContent {
    id: number;
    created_at: Date;
    updated_at: Date;
    name: string;
    description: string;
    approved_at?: Date;
    approved_by?: number;
    is_paid: boolean;
    is_active: boolean;
    price: number;
    thumbnail_url?: string;
    certificate_id?: number;
    priority: number;
    rank: number;
    rejected_at?: Date;
    rejected_by?: number;
    rejected_reason?: string;
    creator_published_at?: Date;
    next_course_ids?: number[];
    totalModules: number;
    totalContent: number;
    modules: AdminModule[];
}
