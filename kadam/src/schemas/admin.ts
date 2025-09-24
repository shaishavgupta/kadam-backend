import { Type, Static } from '@sinclair/typebox';
import { ApiResponseSchema, PaginationQuerySchema } from './common';

// Admin configuration schemas matching existing interfaces
export const AdminConfigurationRequestSchema = Type.Object({
    key: Type.String(),
    value: Type.Any(),
    created_by: Type.Number(),
    updated_by: Type.Number()
});

export const AdminConfigurationResponseSchema = Type.Object({
    id: Type.Number(),
    key: Type.String(),
    value: Type.Any(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    created_by: Type.Number(),
    updated_by: Type.Number()
});

export const DashboardDataSchema = Type.Object({
    totalUsers: Type.Number(),
    totalCreators: Type.Number(),
    totalCourses: Type.Number(),
    totalRevenue: Type.Number()
});

// Admin Login Schemas
export const AdminLoginRequestSchema = Type.Object({
    email: Type.String({ format: 'email' }),
    token: Type.String()
});

export const AdminLoginResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(Type.Object({
        token: Type.String(),
        user: Type.Object({
            id: Type.Number(),
            email: Type.String(),
            role: Type.Union([Type.Literal('admin'), Type.Literal('super_admin')])
        })
    })),
    message: Type.String()
});

// Course Management Schemas
export const UnapprovedCoursesResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        courses: Type.Array(Type.Object({
            id: Type.Number(),
            name: Type.String(),
            description: Type.String(),
            is_paid: Type.Boolean(),
            price: Type.Number(),
            thumbnail_url: Type.Optional(Type.String()),
            created_at: Type.String(),
            updated_at: Type.String(),
            category_name: Type.Optional(Type.String()),
            creator_name: Type.Optional(Type.String()),
            video_count: Type.Number(),
            total_duration: Type.Number()
        })),
        total: Type.Number(),
        page: Type.Number(),
        limit: Type.Number(),
        totalPages: Type.Number()
    }),
    message: Type.String()
});

export const CourseApprovalRequestSchema = Type.Object({
    reason: Type.Optional(Type.String())
});

export const CourseApprovalResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(Type.Object({
        courseId: Type.Number(),
        approvedAt: Type.Optional(Type.String()),
        rejectedAt: Type.Optional(Type.String()),
        approvedBy: Type.Optional(Type.Number()),
        rejectedBy: Type.Optional(Type.Number()),
        rejectionReason: Type.Optional(Type.String())
    })),
    message: Type.String()
});

// Video Management Schemas
export const SaveVideoMetadataRequestSchema = Type.Object({
    videos: Type.Array(Type.Object({
        name: Type.String(),
        description: Type.Optional(Type.String()),
        url: Type.String(),
        position: Type.Number(),
        is_paid: Type.Boolean(),
        is_active: Type.Boolean(),
        duration: Type.Optional(Type.Number()),
        thumbnail_url: Type.Optional(Type.String()),
        module_name: Type.Optional(Type.String())
    }))
});

export const SaveVideoMetadataResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(Type.Object({
        createdVideos: Type.Array(Type.Any())
    })),
    message: Type.String()
});

export const ReorderVideosRequestSchema = Type.Object({
    videoIds: Type.Array(Type.Number())
});

export const ReorderVideosResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(Type.Object({
        updatedVideos: Type.Array(Type.Any())
    })),
    message: Type.String()
});

export const SoftDeleteVideoResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(Type.Object({
        videoId: Type.Number(),
        deletedAt: Type.String()
    })),
    message: Type.String()
});

export const RejectedVideosResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        videos: Type.Array(Type.Object({
            id: Type.Number(),
            title: Type.String(),
            url: Type.Optional(Type.String()),
            courseId: Type.Number(),
            courseName: Type.String(),
            rejectedBy: Type.Number(),
            rejectedByName: Type.String(),
            rejectedAt: Type.String(),
            rejectionReason: Type.String()
        })),
        total: Type.Number(),
        page: Type.Number(),
        limit: Type.Number(),
        totalPages: Type.Number()
    }),
    message: Type.String()
});

// Response schemas
export const AdminConfigurationResponseWrapperSchema = ApiResponseSchema(AdminConfigurationResponseSchema);
export const DashboardDataResponseSchema = ApiResponseSchema(DashboardDataSchema);

// Additional schemas for missing endpoints
export const AdminDashboardResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: DashboardDataSchema,
    message: Type.String()
});

export const AdminUsersResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Any(), // Will be properly typed when imported
    message: Type.String()
});

export const AdminCreatorsResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Any(), // Will be properly typed when imported
    message: Type.String()
});

export const AdminCoursesResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Any(), // Will be properly typed when imported
    message: Type.String()
});

// Export inferred TypeScript types using Static
export type AdminConfigurationRequest = Static<typeof AdminConfigurationRequestSchema>;
export type AdminConfigurationResponse = Static<typeof AdminConfigurationResponseSchema>;
export type DashboardData = Static<typeof DashboardDataSchema>;
export type AdminDashboardResponse = Static<typeof AdminDashboardResponseSchema>;
export type AdminUsersResponse = Static<typeof AdminUsersResponseSchema>;
export type AdminCreatorsResponse = Static<typeof AdminCreatorsResponseSchema>;
export type AdminCoursesResponse = Static<typeof AdminCoursesResponseSchema>;
export type AdminLoginRequest = Static<typeof AdminLoginRequestSchema>;
export type AdminLoginResponse = Static<typeof AdminLoginResponseSchema>;
export type UnapprovedCoursesResponse = Static<typeof UnapprovedCoursesResponseSchema>;
export type CourseApprovalRequest = Static<typeof CourseApprovalRequestSchema>;
export type CourseApprovalResponse = Static<typeof CourseApprovalResponseSchema>;
export type SaveVideoMetadataRequest = Static<typeof SaveVideoMetadataRequestSchema>;
export type SaveVideoMetadataResponse = Static<typeof SaveVideoMetadataResponseSchema>;
export type ReorderVideosRequest = Static<typeof ReorderVideosRequestSchema>;
export type ReorderVideosResponse = Static<typeof ReorderVideosResponseSchema>;
export type SoftDeleteVideoResponse = Static<typeof SoftDeleteVideoResponseSchema>;
export type RejectedVideosResponse = Static<typeof RejectedVideosResponseSchema>;

