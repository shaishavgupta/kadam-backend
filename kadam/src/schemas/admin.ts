import { Type, Static } from '@sinclair/typebox';
import { ApiResponseSchema, PaginationQuerySchema } from './common';

// Extended pagination schema for admin courses with filter
export const AdminCoursesQuerySchema = Type.Object({
    page: Type.Optional(Type.String({
        pattern: '^[0-9]+$',
        description: 'Page number'
    })),
    limit: Type.Optional(Type.String({
        pattern: '^[0-9]+$',
        description: 'Items per page'
    })),
    rejected: Type.Optional(Type.String({
        enum: ['true', 'false'],
        description: 'Include rejected courses'
    }))
});

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
    password: Type.String({ minLength: 6 })
});

export const AdminLoginResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(Type.Object({
        token: Type.String(),
        user: Type.Object({
            id: Type.Number(),
            email: Type.String(),
            name: Type.String()
        })
    })),
    message: Type.String()
});

export const AdminResponseSchema = Type.Object({
    id: Type.Number(),
    email: Type.String(),
    name: Type.String(),
    phone: Type.String(),
    is_active: Type.Boolean(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    last_active_at: Type.Optional(Type.String({ format: 'date-time' })),
    profile_pic: Type.Optional(Type.String())
});

export const AdminByIdResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(AdminResponseSchema),
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

export const ModuleApprovalResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(Type.Object({
        moduleId: Type.Number(),
        approvedAt: Type.Optional(Type.String()),
        rejectedAt: Type.Optional(Type.String()),
        approvedBy: Type.Optional(Type.Number()),
        rejectedBy: Type.Optional(Type.Number()),
        rejectionReason: Type.Optional(Type.String())
    })),
    message: Type.String()
});

export const ContentApprovalResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(Type.Object({
        contentId: Type.Number(),
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

export const ReorderContentsRequestSchema = Type.Object({
    contentIds: Type.Array(Type.Number())
});

export const ReorderContentsResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(Type.Object({
        updatedContents: Type.Array(Type.Any())
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

export const UnifiedRejectResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(Type.Object({
        type: Type.String(),
        id: Type.Number(),
        rejectedAt: Type.String(),
        rejectedBy: Type.Number(),
        rejectionReason: Type.String(),
        cascadedUpdates: Type.Optional(Type.Object({
            courseUpdated: Type.Optional(Type.Boolean()),
            moduleUpdated: Type.Optional(Type.Boolean()),
            contentUpdated: Type.Optional(Type.Boolean())
        }))
    })),
    message: Type.String()
});

export const UnifiedRejectRequestSchema = Type.Object({
    type: Type.String({ enum: ['course', 'module', 'content'] }),
    id: Type.Number(),
    reason: Type.Optional(Type.String())
});

// Video Metadata Schemas
export const VideoMetadataSchema = Type.Object({
    title: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String()),
    duration: Type.Optional(Type.Number({ minimum: 0 })),
    position: Type.Number({ minimum: 1 }),
    is_paid: Type.Boolean(),
    is_active: Type.Boolean(),
    module_id: Type.Optional(Type.Number()),
    url: Type.String({ minLength: 1 }),
    thumbnail_url: Type.Optional(Type.String())
});

export const CreateContentsRequestSchema = Type.Object({
    videos: Type.Array(VideoMetadataSchema, { minItems: 1 })
});

export const CreateContentsResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        createdContents: Type.Array(Type.Object({
            id: Type.Number(),
            title: Type.String(),
            description: Type.Optional(Type.String()),
            duration: Type.Optional(Type.Number()),
            position: Type.Number(),
            is_paid: Type.Boolean(),
            is_active: Type.Boolean(),
            module_id: Type.Optional(Type.Number()),
            url: Type.String(),
            thumbnail_url: Type.Optional(Type.String()),
            course_id: Type.Number(),
            created_at: Type.String({ format: 'date-time' }),
            updated_at: Type.String({ format: 'date-time' })
        }))
    }),
    message: Type.String()
});

// Content Schema
export const AdminContentSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    is_active: Type.Boolean(),
    name: Type.String(),
    module_id: Type.Number(),
    content_type: Type.String(),
    next_content_id: Type.Optional(Type.Number()),
    is_paid: Type.Boolean(),
    approved_at: Type.Optional(Type.String({ format: 'date-time' })),
    approved_by: Type.Optional(Type.Number()),
    position: Type.Number(),
    url: Type.Optional(Type.String()),
    duration: Type.Optional(Type.Number()),
    thumbnail_url: Type.Optional(Type.String()),
    category_id: Type.Optional(Type.Number()),
    rejected_at: Type.Optional(Type.String({ format: 'date-time' })),
    rejected_by: Type.Optional(Type.Number()),
    rejection_reason: Type.Optional(Type.String())
});

// Module Schema
export const AdminModuleSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    name: Type.String(),
    description: Type.String(),
    course_id: Type.Number(),
    thumbnail_url: Type.Optional(Type.String()),
    approved_at: Type.Optional(Type.String({ format: 'date-time' })),
    approved_by: Type.Optional(Type.Number()),
    is_paid: Type.Boolean(),
    is_active: Type.Boolean(),
    position: Type.Number(),
    contents: Type.Array(AdminContentSchema)
});

// Course with Modules and Content Schema
export const CourseWithModulesAndContentSchema = Type.Object({
    id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    name: Type.String(),
    description: Type.String(),
    approved_at: Type.Optional(Type.String({ format: 'date-time' })),
    approved_by: Type.Optional(Type.Number()),
    is_paid: Type.Boolean(),
    is_active: Type.Boolean(),
    price: Type.Number(),
    thumbnail_url: Type.Optional(Type.String()),
    certificate_id: Type.Optional(Type.Number()),
    priority: Type.Number(),
    rank: Type.Number(),
    rejected_at: Type.Optional(Type.String({ format: 'date-time' })),
    rejected_by: Type.Optional(Type.Number()),
    rejected_reason: Type.Optional(Type.String()),
    published_at: Type.Optional(Type.String({ format: 'date-time' })),
    next_course_ids: Type.Optional(Type.Array(Type.Number())),
    totalModules: Type.Number(),
    totalContent: Type.Number(),
    modules: Type.Array(AdminModuleSchema)
});

// Response wrapper for course with modules and content
export const CourseWithModulesAndContentResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(CourseWithModulesAndContentSchema),
    message: Type.String()
});

// Export inferred TypeScript types using Static
export type AdminCoursesQuery = Static<typeof AdminCoursesQuerySchema>;
export type AdminConfigurationRequest = Static<typeof AdminConfigurationRequestSchema>;
export type AdminConfigurationResponse = Static<typeof AdminConfigurationResponseSchema>;
export type DashboardData = Static<typeof DashboardDataSchema>;
export type AdminDashboardResponse = Static<typeof AdminDashboardResponseSchema>;
export type AdminUsersResponse = Static<typeof AdminUsersResponseSchema>;
export type AdminCreatorsResponse = Static<typeof AdminCreatorsResponseSchema>;
export type AdminLoginRequest = Static<typeof AdminLoginRequestSchema>;
export type AdminLoginResponse = Static<typeof AdminLoginResponseSchema>;
export type AdminResponse = Static<typeof AdminResponseSchema>;
export type AdminByIdResponse = Static<typeof AdminByIdResponseSchema>;
export type UnapprovedCoursesResponse = Static<typeof UnapprovedCoursesResponseSchema>;
export type CourseApprovalRequest = Static<typeof CourseApprovalRequestSchema>;
export type CourseApprovalResponse = Static<typeof CourseApprovalResponseSchema>;
export type ModuleApprovalResponse = Static<typeof ModuleApprovalResponseSchema>;
export type ContentApprovalResponse = Static<typeof ContentApprovalResponseSchema>;
export type SaveVideoMetadataRequest = Static<typeof SaveVideoMetadataRequestSchema>;
export type SaveVideoMetadataResponse = Static<typeof SaveVideoMetadataResponseSchema>;
export type ReorderVideosRequest = Static<typeof ReorderVideosRequestSchema>;
export type ReorderVideosResponse = Static<typeof ReorderVideosResponseSchema>;
export type ReorderContentsRequest = Static<typeof ReorderContentsRequestSchema>;
export type ReorderContentsResponse = Static<typeof ReorderContentsResponseSchema>;
export type SoftDeleteVideoResponse = Static<typeof SoftDeleteVideoResponseSchema>;
export type VideoMetadata = Static<typeof VideoMetadataSchema>;
export type CreateContentsRequest = Static<typeof CreateContentsRequestSchema>;
export type CreateContentsResponse = Static<typeof CreateContentsResponseSchema>;
export type AdminContent = Static<typeof AdminContentSchema>;
export type AdminModule = Static<typeof AdminModuleSchema>;
export type CourseWithModulesAndContent = Static<typeof CourseWithModulesAndContentSchema>;
export type CourseWithModulesAndContentResponse = Static<typeof CourseWithModulesAndContentResponseSchema>;
export type UnifiedRejectRequest = Static<typeof UnifiedRejectRequestSchema>;
export type UnifiedRejectResponse = Static<typeof UnifiedRejectResponseSchema>;

