import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CoursesService } from '../service/courses.service';
import {
    Category,
    ContentWithModule,
    Module,
    Tag,
    CreateCourseRequest,
    UpdateCourseRequest,
    PaginatedCoursesResponse,
    PublishCourseRequest,
    Course,
    GetCoursesQuery,
    CreateContentRequest,
    CreateModuleRequest,
    CreateCourseRequestSchema,
    UpdateCourseRequestSchema,
    PublishCourseRequestSchema,
    CourseIdParam,
    CourseCreatorIdParam,
    CourseIdParam2,
    CategoryIdParam,
    TagsSearchQuery,
    TagsSearchResponse,
    PublishCourseResponse,
    UnpublishCourseResponse,
    CategoriesResponseSchema,
    ContentsResponseSchema,
    ModulesResponseSchema,
    TagsSearchResponseSchema,
    CourseResponseSchema,
    PopularCategoriesResponseSchema,
    CoursesByCategoryResponseSchema,
    CurrentlyEnrolledCoursesResponseSchema,
    PublishCourseResponseSchema,
    UnpublishCourseResponseSchema,
    CourseIdParamSchema,
    CourseCreatorIdParamSchema,
    CourseIdParamSchema2,
    CategoryIdParamSchema,
    TagsSearchQuerySchema,
    CourseListItemSchema,
    CourseListDataSchema,
    CourseListResponseSchema,
    UserStatsSchema,
    UserStatsResponseSchema,
    CourseListItem,
    CourseListData,
    CourseListResponse,
    UserStats,
    UserStatsResponse
} from '../schemas/course';

import { PaginationQuery, PaginationQuerySchema } from '../schemas/common';
import { authMiddleware, AuthenticatedRequest, requireUser, requireAdmin } from '../shared/middleware/auth';

// Helper to convert all Date values in objects/arrays to ISO strings
function serializeDates<T>(value: any): T {
    return JSON.parse(
        JSON.stringify(value, (_key, val) => (val instanceof Date ? val.toISOString() : val))
    );
}

export default async function coursesRoutes(fastify: FastifyInstance) {
    const coursesService = new CoursesService();

    // Get course categories
    fastify.get('/categories', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Get course categories',
            description: 'Retrieve all available course categories',
            security: [{ bearerAuth: [] }],
            response: {
                200: CategoriesResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: Category[]; message: string }> => {
        try {
            const data = await coursesService.getCategories();
            return {
                success: true,
                data,
                message: "Categories retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Get course contents
    fastify.get('/contents/:courseId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Get course contents',
            description: 'Retrieve all contents for a specific course',
            params: CourseIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: ContentsResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: ContentWithModule[]; message: string }> => {
        try {
            const courseId = parseInt((request.params as any).courseId, 10);
            const raw = await coursesService.getContentsByCourseId(courseId);
            const data = serializeDates<ContentWithModule[]>(raw);
            return {
                success: true,
                data,
                message: "Contents retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Get modules by creator
    fastify.get('/modules/creator/:creatorId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Get modules by creator',
            description: 'Retrieve all modules created by a specific creator',
            params: CourseCreatorIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: ModulesResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: Module[]; message: string }> => {
        try {
            const creatorId = parseInt((request.params as any).creatorId, 10);
            const raw = await coursesService.getModulesByCreatorId(creatorId);
            const data = serializeDates<Module[]>(raw);
            return {
                success: true,
                data,
                message: "Modules retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Search tags
    fastify.get('/tags/search', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Search tags',
            description: 'Search for tags based on content, course, or module names',
            querystring: TagsSearchQuerySchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: TagsSearchResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: Tag[]; message: string }> => {
        try {
            const { contentName, courseName, moduleName } = request.query as TagsSearchQuery;
            const data = await coursesService.searchTags(contentName, courseName, moduleName);
            return {
                success: true,
                data,
                message: "Tags retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Create course
    fastify.post('/courses', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Create course',
            description: 'Create a new course',
            body: CreateCourseRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CourseResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: Course; message: string }> => {
        try {
            const created = await coursesService.createCourse(request.body as CreateCourseRequest);
            const body = request.body as CreateCourseRequest;
            const data: Course = {
                id: (created as any)?.id ?? (created as any)?.courseId ?? 0,
                name: body.name,
                description: body.description,
                is_paid: body.is_paid,
                price: body.price,
                thumbnail_url: body.thumbnail_url,
                certificate_url: body.certificate_url,
                rank: 0,
                published_at: undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            return {
                success: true,
                data,
                message: "Course created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: {
                    id: 0,
                    name: '',
                    description: '',
                    is_paid: false,
                    price: 0,
                    thumbnail_url: '',
                    certificate_url: '',
                    rank: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // Update course
    fastify.patch('/courses/:id', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Update course',
            description: 'Update an existing course',
            params: CourseIdParamSchema2,
            body: UpdateCourseRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CourseResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: Course; message: string }> => {
        try {
            const courseId = parseInt((request.params as any).id, 10);
            const updated = await coursesService.updateCourse(courseId, request.body as UpdateCourseRequest);
            const body = request.body as UpdateCourseRequest;
            const data: Course = {
                id: (updated as any)?.id ?? courseId,
                name: body.name,
                description: body.description,
                is_paid: body.is_paid,
                price: body.price,
                thumbnail_url: body.thumbnail_url,
                certificate_url: body.certificate_url,
                rank: (updated as any)?.rank ?? 0,
                published_at: (updated as any)?.published_at ? serializeDates<{ published_at?: string }>((updated as any)).published_at : undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            return {
                success: true,
                data,
                message: "Course updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: {
                    id: 0,
                    name: '',
                    description: '',
                    is_paid: false,
                    price: 0,
                    thumbnail_url: '',
                    certificate_url: '',
                    rank: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // Get courses by category
    fastify.get('/courses/category/:categoryId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Get courses by category',
            description: 'Retrieve a paginated list of courses in a specific category',
            params: CategoryIdParamSchema,
            querystring: PaginationQuerySchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: CoursesByCategoryResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: PaginatedCoursesResponse; message: string }> => {
        try {
            const categoryId = parseInt((request.params as any).categoryId, 10);
            const page = (request.query as any)?.page ? parseInt((request.query as any).page, 10) : 1;
            const limit = (request.query as any)?.limit ? parseInt((request.query as any).limit, 10) : 10;

            const raw = await coursesService.getCoursesByCategory(categoryId, page, limit);
            const data: PaginatedCoursesResponse = {
                courses: serializeDates<any[]>(raw?.courses ?? []),
                total: (raw as any)?.total ?? (raw as any)?.pagination?.total ?? 0,
                page: (raw as any)?.page ?? (raw as any)?.pagination?.page ?? page,
                limit: (raw as any)?.limit ?? (raw as any)?.pagination?.limit ?? limit,
                totalPages: (raw as any)?.totalPages ?? (raw as any)?.pagination?.totalPages ?? 0
            } as PaginatedCoursesResponse;
            return {
                success: true,
                data,
                message: "Courses retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: {
                    courses: [],
                    total: 0,
                    page: 1,
                    limit: 10,
                    totalPages: 0
                },
                message: errorMessage
            };
        }
    });

    // Get currently enrolled courses
    fastify.get('/courses/currently-enrolled', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Get currently enrolled courses',
            description: 'Retrieve courses currently enrolled by the authenticated user',
            security: [{ bearerAuth: [] }],
            response: {
                200: CurrentlyEnrolledCoursesResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: Course[]; message: string }> => {
        try {
            // Assuming userId is available from auth middleware
            const userId = request.user?.userID;
            if (!userId) {
                reply.status(401).send({
                    success: false,
                    data: [],
                    message: "User not authenticated"
                });
                return {
                    success: false,
                    data: [],
                    message: "User not authenticated"
                };
            }
            const raw = await coursesService.getCurrentlyEnrolledCourses(parseInt(userId));
            const data = serializeDates<Course[]>(raw);
            return {
                success: true,
                data,
                message: "Currently enrolled courses retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Publish course
    fastify.post('/courses/publish', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Courses'],
            summary: 'Publish course',
            description: 'Publish a course to make it available to users',
            body: PublishCourseRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: PublishCourseResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<PublishCourseResponse> => {
        try {
            const publishData = {
                ...(request.body as PublishCourseRequest),
                published_at: (request.body as PublishCourseRequest).published_at ? new Date((request.body as PublishCourseRequest).published_at!) : undefined
            };
            const success = await coursesService.publishCourse(publishData);
            return {
                success,
                message: "Course published successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return { success: false, message: errorMessage };
        }
    });

    // Unpublish course
    fastify.post('/courses/:courseId/unpublish', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Unpublish course',
            description: 'Unpublish a course to make it unavailable to users',
            params: CourseIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: UnpublishCourseResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<UnpublishCourseResponse> => {
        try {
            const courseId = parseInt((request.params as any).courseId, 10);
            const success = await coursesService.unpublishCourse(courseId);
            return {
                success,
                message: "Course unpublished successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return { success: false, message: errorMessage };
        }
    });

    // Get course list with aggregated data
    fastify.get('/courses/home-page-courses', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Get home page courses',
            description: 'Retrieve course list with aggregated interaction data (likes, views, saves, shares)',
            security: [{ bearerAuth: [] }],
            response: {
                200: CourseListResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<CourseListResponse> => {
        try {
            const data = await coursesService.getCourseList();
            return {
                success: true,
                data,
                message: "Home page courses retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: {
                    keep_watching: [],
                    for_you: [],
                    top_10: [],
                    popular: [],
                    latest: [],
                },
                message: errorMessage
            };
        }
    });

    // Get user statistics
    fastify.get('/get-user-stats', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Get user statistics',
            description: 'Retrieve user statistics including total courses started, total hours spent, and average hours per day',
            security: [{ bearerAuth: [] }],
            response: {
                200: UserStatsResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<UserStatsResponse> => {
        try {
            const userId = request.user?.userID;
            if (!userId) {
                reply.status(401).send({
                    success: false,
                    data: {
                        total_courses_started: 0,
                        total_hours_spent: 0,
                        avg_hours_per_day: 0
                    },
                    message: "User not authenticated"
                });
                return {
                    success: false,
                    data: {
                        total_courses_started: 0,
                        total_hours_spent: 0,
                        avg_hours_per_day: 0
                    },
                    message: "User not authenticated"
                };
            }

            const data = await coursesService.getUserStats(parseInt(userId));
            return {
                success: true,
                data,
                message: "User statistics retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: {
                    total_courses_started: 0,
                    total_hours_spent: 0,
                    avg_hours_per_day: 0
                },
                message: errorMessage
            };
        }
    });

    // Manual trigger for course ranking calculation (Admin only)
    fastify.post('/recalculate-rankings', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Courses'],
            summary: 'Recalculate course rankings',
            description: 'Manually trigger recalculation of course rankings based on interactions',
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; message: string }> => {
        try {
            await coursesService.calculateAndUpdateCourseRankings();
            return {
                success: true,
                message: "Course rankings recalculated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                message: errorMessage
            };
        }
    });
}
