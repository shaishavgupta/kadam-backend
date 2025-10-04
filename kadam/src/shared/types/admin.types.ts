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

// Admin entity interface - keep this as it represents DB entity structure
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

// AdminContent is now defined as a TypeBox schema in ../schemas/admin.ts
// Import it using: import { AdminContent } from '../schemas/admin'

// AdminModule is now defined as a TypeBox schema in ../schemas/admin.ts
// Import it using: import { AdminModule } from '../schemas/admin'

// CourseWithModulesAndContent is now defined as a TypeBox schema in ../schemas/admin.ts
// Import it using: import { CourseWithModulesAndContent } from '../schemas/admin'
