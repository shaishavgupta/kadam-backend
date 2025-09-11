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

