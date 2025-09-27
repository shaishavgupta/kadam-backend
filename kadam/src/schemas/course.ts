import { Type, Static } from '@sinclair/typebox';
import { ApiResponseSchema, PaginationQuerySchema } from './common';

// Import enums for schema definitions
import { ContentType as ContentTypeEnum } from '../shared/enums';

// Enum schemas
export const ContentTypeSchema = Type.Union([
    Type.Literal(ContentTypeEnum.VIDEO),
    Type.Literal(ContentTypeEnum.QUIZ),
    Type.Literal(ContentTypeEnum.NOTES)
]);

// Certificate schemas
export const CertificateSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    html_content: Type.String(),
    is_active: Type.Boolean(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' })
});

export const CreateCertificateRequestSchema = Type.Object({
    name: Type.String({ minLength: 1 }),
    html_content: Type.String({ minLength: 1 }),
    is_active: Type.Optional(Type.Boolean())
});

export const UpdateCertificateRequestSchema = Type.Object({
    name: Type.Optional(Type.String({ minLength: 1 })),
    html_content: Type.Optional(Type.String({ minLength: 1 })),
    is_active: Type.Optional(Type.Boolean())
});

export const CertificateIdParamSchema = Type.Object({
    certificateId: Type.String({ pattern: '^[0-9]+$' })
});

export const CertificateResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: CertificateSchema,
    message: Type.String()
});

export const CertificatesResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        certificates: Type.Array(CertificateSchema),
        total: Type.Number()
    }),
    message: Type.String()
});

// Base schemas matching existing interfaces
export const CategorySchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    image_url: Type.String()
});

export const ModuleSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    description: Type.String(),
    position: Type.Number(),
    is_paid: Type.Boolean(),
    is_active: Type.Boolean(),
    thumbnail_url: Type.Optional(Type.String()),
    approved_at: Type.Optional(Type.String({ format: 'date-time' })),
    approved_by: Type.Optional(Type.Number()),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' })
});

export const ContentSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    module_id: Type.Number(),
    type: ContentTypeSchema,
    position: Type.Number(),
    is_paid: Type.Boolean(),
    is_active: Type.Boolean(),
    url: Type.Optional(Type.String()),
    abs_url: Type.Optional(Type.String()),
    duration: Type.Optional(Type.Number()),
    thumbnail_url: Type.Optional(Type.String()),
    category_id: Type.Optional(Type.Number()),
    next_content_id: Type.Optional(Type.Number()),
    approved_at: Type.Optional(Type.String({ format: 'date-time' })),
    approved_by: Type.Optional(Type.Number()),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' })
});

export const CourseSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    description: Type.String(),
    is_paid: Type.Boolean(),
    price: Type.Number(),
    thumbnail_url: Type.Optional(Type.String()),
    certificate_id: Type.Optional(Type.Number()),
    rank: Type.Number(),
    published_at: Type.Optional(Type.String({ format: 'date-time' })),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    next_course_ids: Type.Optional(Type.Array(Type.Number()))
});

export const VectorSchema = Type.Object({
    id: Type.Number(),
    string: Type.String(),
    vector: Type.Array(Type.Number()),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    source: Type.Union([Type.Literal('contents'), Type.Literal('courses')]),
    source_id: Type.Number()
});

// Request schemas
export const CreateContentRequestSchema = Type.Object({
    name: Type.String(),
    type: ContentTypeSchema,
    position: Type.Number(),
    is_paid: Type.Boolean(),
    is_active: Type.Boolean(),
    url: Type.Optional(Type.String()),
    abs_url: Type.Optional(Type.String()),
    duration: Type.Optional(Type.Number()),
    thumbnail_url: Type.Optional(Type.String()),
    category_id: Type.Optional(Type.Number()),
    next_content_id: Type.Optional(Type.Number()),
    module_name: Type.Optional(Type.String())
});

export const CreateCourseRequestSchema = Type.Object({
    name: Type.String(),
    description: Type.String(),
    creator_id: Type.Number(),
    category_id: Type.Number(),
    is_paid: Type.Boolean(),
    is_active: Type.Boolean(),
    price: Type.Number(),
    thumbnail_url: Type.Optional(Type.String()),
    certificate_id: Type.Optional(Type.Number()),
    contents: Type.Optional(Type.Array(CreateContentRequestSchema)),
    next_course_ids: Type.Optional(Type.Array(Type.Number()))
});

export const UpdateCourseRequestSchema = Type.Intersect([
    CreateCourseRequestSchema,
    Type.Object({
        id: Type.Number()
    })
]);

export const CreateModuleRequestSchema = Type.Object({
    name: Type.String(),
    description: Type.String(),
    position: Type.Number(),
    is_paid: Type.Boolean(),
    is_active: Type.Boolean(),
    thumbnail_url: Type.Optional(Type.String())
});

export const PublishCourseRequestSchema = Type.Object({
    course_id: Type.Number(),
    published_at: Type.Optional(Type.String({ format: 'date-time' }))
});

// Response schemas
export const PaginatedCoursesResponseSchema = Type.Object({
    courses: Type.Array(CourseSchema),
    total: Type.Number(),
    page: Type.Number(),
    limit: Type.Number(),
    totalPages: Type.Number()
});

export const ContentWithModuleSchema = Type.Intersect([
    ContentSchema,
    Type.Object({
        module_title: Type.Optional(Type.String()),
        module_description: Type.Optional(Type.String())
    })
]);

// Query parameter schemas
export const GetCoursesQuerySchema = Type.Intersect([
    PaginationQuerySchema,
    Type.Object({
        category_id: Type.Optional(Type.String({ pattern: '^[0-9]+$' })),
        is_paid: Type.Optional(Type.String({ enum: ['true', 'false'] }))
    })
]);

export const CourseResponseSchema = ApiResponseSchema(CourseSchema);
export const PaginatedCoursesResponseWrapperSchema = ApiResponseSchema(PaginatedCoursesResponseSchema);
export const CategoriesResponseSchema = ApiResponseSchema(Type.Array(CategorySchema));
export const ContentsResponseSchema = ApiResponseSchema(Type.Array(ContentWithModuleSchema));

// Additional schemas for missing endpoints
export const CourseIdParamSchema = Type.Object({
    courseId: Type.String({ pattern: '^[0-9]+$' })
});

export const CourseCreatorIdParamSchema = Type.Object({
    creatorId: Type.String({ pattern: '^[0-9]+$' })
});

export const CourseIdParamSchema2 = Type.Object({
    id: Type.String({ pattern: '^[0-9]+$' })
});

export const CategoryIdParamSchema = Type.Object({
    categoryId: Type.String({ pattern: '^[0-9]+$' })
});

export const ModulesResponseSchema = ApiResponseSchema(Type.Array(ModuleSchema));
export const PopularCategoriesResponseSchema = ApiResponseSchema(Type.Array(CategorySchema));
export const CoursesByCategoryResponseSchema = ApiResponseSchema(PaginatedCoursesResponseSchema);
export const CurrentlyEnrolledCoursesResponseSchema = ApiResponseSchema(Type.Array(CourseSchema));
export const PublishCourseResponseSchema = Type.Object({
    success: Type.Boolean(),
    message: Type.String()
});
export const UnpublishCourseResponseSchema = Type.Object({
    success: Type.Boolean(),
    message: Type.String()
});

// Certificate Types
export type Certificate = Static<typeof CertificateSchema>;
export type CreateCertificateRequest = Static<typeof CreateCertificateRequestSchema>;
export type UpdateCertificateRequest = Static<typeof UpdateCertificateRequestSchema>;
export type CertificateIdParam = Static<typeof CertificateIdParamSchema>;
export type CertificateResponse = Static<typeof CertificateResponseSchema>;
export type CertificatesResponse = Static<typeof CertificatesResponseSchema>;

// Export inferred TypeScript types using Static
export type ContentType = Static<typeof ContentTypeSchema>;
export type Category = Static<typeof CategorySchema>;
export type Module = Static<typeof ModuleSchema>;
export type Content = Static<typeof ContentSchema>;
export type Course = Static<typeof CourseSchema>;
export type Vector = Static<typeof VectorSchema>;
export type CreateContentRequest = Static<typeof CreateContentRequestSchema>;
export type CreateCourseRequest = Static<typeof CreateCourseRequestSchema>;
export type UpdateCourseRequest = Static<typeof UpdateCourseRequestSchema>;
export type CreateModuleRequest = Static<typeof CreateModuleRequestSchema>;
export type PublishCourseRequest = Static<typeof PublishCourseRequestSchema>;
export type PaginatedCoursesResponse = Static<typeof PaginatedCoursesResponseSchema>;
export type ContentWithModule = Static<typeof ContentWithModuleSchema>;
export type GetCoursesQuery = Static<typeof GetCoursesQuerySchema>;
export type CourseIdParam = Static<typeof CourseIdParamSchema>;
export type CourseCreatorIdParam = Static<typeof CourseCreatorIdParamSchema>;
export type CourseIdParam2 = Static<typeof CourseIdParamSchema2>;
export type CategoryIdParam = Static<typeof CategoryIdParamSchema>;

// Course list response schema based on tasks.txt structure
export const CourseListItemSchema = Type.Object({
    id: Type.Number(),
    title: Type.String(),
    thumbnail: Type.Optional(Type.String()),
    description: Type.String(),
    category: Type.String(),
    total_videos: Type.Number(),
    total_duration: Type.Number(),
    likes: Type.Number(),
    views: Type.Number(),
    saves: Type.Number(),
    shares: Type.Number()
});

export const CourseListDataSchema = Type.Object({
    keep_watching: Type.Array(CourseListItemSchema),
    for_you: Type.Array(CourseListItemSchema),
    top_10: Type.Array(CourseListItemSchema),
    popular: Type.Array(CourseListItemSchema),
    latest: Type.Array(CourseListItemSchema)
});

export const CourseListResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: CourseListDataSchema,
    message: Type.String()
});

export const UserStatsSchema = Type.Object({
    total_courses_started: Type.Number(),
    total_hours_spent: Type.Number(),
    avg_hours_per_day: Type.Number()
});

export const UserStatsResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: UserStatsSchema,
    message: Type.String()
});

// Module Management Schemas
export const CreateModuleRequestSchemaNew = Type.Object({
    name: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    position: Type.Number({ minimum: 1 }),
    is_paid: Type.Boolean(),
    is_active: Type.Boolean(),
    thumbnail_url: Type.String()
});

export const UpdateModuleRequestSchema = Type.Object({
    name: Type.Optional(Type.String({ minLength: 1 })),
    description: Type.Optional(Type.String({ minLength: 1 })),
    position: Type.Optional(Type.Number({ minimum: 1 })),
    is_paid: Type.Optional(Type.Boolean()),
    is_active: Type.Optional(Type.Boolean()),
    thumbnail_url: Type.Optional(Type.String())
});

export const ModuleIdParamSchema = Type.Object({
    moduleId: Type.String({ pattern: '^[0-9]+$' })
});

export const ModulesResponseSchemaNew = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        modules: Type.Array(ModuleSchema),
        total: Type.Number()
    }),
    message: Type.String()
});

export const ModuleResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: ModuleSchema,
    message: Type.String()
});

export const DeleteModuleResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        moduleId: Type.Number(),
        deletedAt: Type.String({ format: 'date-time' })
    }),
    message: Type.String()
});

// Content Management Schemas
export const CreateContentRequestSchemaNew = Type.Object({
    name: Type.String({ minLength: 1 }),
    content_type: ContentTypeSchema,
    position: Type.Number({ minimum: 1 }),
    is_paid: Type.Boolean(),
    is_active: Type.Boolean(),
    url: Type.Optional(Type.String()),
    abs_url: Type.Optional(Type.String()),
    duration: Type.Optional(Type.Number({ minimum: 0 })),
    thumbnail_url: Type.Optional(Type.String()),
    category_id: Type.Optional(Type.Number()),
    next_content_id: Type.Optional(Type.Number())
});

export const UpdateContentRequestSchema = Type.Object({
    name: Type.Optional(Type.String({ minLength: 1 })),
    content_type: Type.Optional(ContentTypeSchema),
    position: Type.Optional(Type.Number({ minimum: 1 })),
    is_paid: Type.Optional(Type.Boolean()),
    is_active: Type.Optional(Type.Boolean()),
    url: Type.Optional(Type.String()),
    abs_url: Type.Optional(Type.String()),
    duration: Type.Optional(Type.Number({ minimum: 0 })),
    thumbnail_url: Type.Optional(Type.String()),
    category_id: Type.Optional(Type.Number()),
    next_content_id: Type.Optional(Type.Number())
});

export const ContentIdParamSchema = Type.Object({
    contentId: Type.String({ pattern: '^[0-9]+$' })
});

export const ContentResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        content: Type.Array(ContentWithModuleSchema),
        total: Type.Number()
    }),
    message: Type.String()
});

export const SingleContentResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: ContentWithModuleSchema,
    message: Type.String()
});

export const DeleteContentResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        contentId: Type.Number(),
        deletedAt: Type.String({ format: 'date-time' })
    }),
    message: Type.String()
});

// Enhanced Course Schema
export const CourseWithModulesSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    description: Type.String(),
    is_paid: Type.Boolean(),
    price: Type.Number(),
    thumbnail_url: Type.Optional(Type.String()),
    certificate_id: Type.Optional(Type.Number()),
    rank: Type.Number(),
    published_at: Type.Optional(Type.String({ format: 'date-time' })),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    totalModules: Type.Number(),
    totalContent: Type.Number(),
    modules: Type.Array(Type.Object({
        id: Type.Number(),
        name: Type.String(),
        description: Type.String(),
        position: Type.Number(),
        course_id: Type.Number(),
        is_paid: Type.Boolean(),
        is_active: Type.Boolean(),
        thumbnail_url: Type.Optional(Type.String()),
        approved_at: Type.Optional(Type.String({ format: 'date-time' })),
        approved_by: Type.Optional(Type.Number()),
        created_at: Type.String({ format: 'date-time' }),
        updated_at: Type.String({ format: 'date-time' }),
        contentCount: Type.Number(),
        content: Type.Array(ContentWithModuleSchema)
    }))
});

export const CourseWithModulesResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: CourseWithModulesSchema,
    message: Type.String()
});

export type CourseListItem = Static<typeof CourseListItemSchema>;
export type CourseListData = Static<typeof CourseListDataSchema>;
export type CourseListResponse = Static<typeof CourseListResponseSchema>;
export type UserStats = Static<typeof UserStatsSchema>;
export type UserStatsResponse = Static<typeof UserStatsResponseSchema>;
export type PublishCourseResponse = Static<typeof PublishCourseResponseSchema>;
export type UnpublishCourseResponse = Static<typeof UnpublishCourseResponseSchema>;

// Module Management Types
export type CreateModuleRequestNew = Static<typeof CreateModuleRequestSchemaNew>;
export type UpdateModuleRequest = Static<typeof UpdateModuleRequestSchema>;
export type ModuleIdParam = Static<typeof ModuleIdParamSchema>;
export type ModulesResponseNew = Static<typeof ModulesResponseSchemaNew>;
export type ModuleResponse = Static<typeof ModuleResponseSchema>;
export type DeleteModuleResponse = Static<typeof DeleteModuleResponseSchema>;

// Content Management Types
export type CreateContentRequestNew = Static<typeof CreateContentRequestSchemaNew>;
export type UpdateContentRequest = Static<typeof UpdateContentRequestSchema>;
export type ContentIdParam = Static<typeof ContentIdParamSchema>;
export type ContentResponse = Static<typeof ContentResponseSchema>;
export type SingleContentResponse = Static<typeof SingleContentResponseSchema>;
export type DeleteContentResponse = Static<typeof DeleteContentResponseSchema>;

// Enhanced Course Types
export type CourseWithModules = Static<typeof CourseWithModulesSchema>;
export type CourseWithModulesResponse = Static<typeof CourseWithModulesResponseSchema>;

