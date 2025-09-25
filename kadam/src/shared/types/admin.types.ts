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
    role: string;
    permissions: string[];
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
