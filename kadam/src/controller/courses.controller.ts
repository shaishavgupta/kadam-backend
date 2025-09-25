import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CoursesService } from '../service/courses.service';
import {
    Category,
    ContentWithModule,
    Module,
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
    PublishCourseResponse,
    UnpublishCourseResponse,
    CategoriesResponseSchema,
    ContentsResponseSchema,
    ModulesResponseSchema,
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
    CourseListItemSchema,
    CourseListDataSchema,
    CourseListResponseSchema,
    UserStatsSchema,
    UserStatsResponseSchema,
    CourseListItem,
    CourseListData,
    CourseListResponse,
    UserStats,
    UserStatsResponse,
    Vector,
    VectorSchema,
    // Module Management
    CreateModuleRequestSchemaNew,
    UpdateModuleRequestSchema,
    ModuleIdParamSchema,
    ModulesResponseSchemaNew,
    ModuleResponseSchema,
    DeleteModuleResponseSchema,
    CreateModuleRequestNew,
    UpdateModuleRequest,
    ModuleIdParam,
    ModulesResponseNew,
    ModuleResponse,
    DeleteModuleResponse,
    // Content Management
    CreateContentRequestSchemaNew,
    UpdateContentRequestSchema,
    ContentIdParamSchema,
    ContentResponseSchema,
    SingleContentResponseSchema,
    DeleteContentResponseSchema,
    CreateContentRequestNew,
    UpdateContentRequest,
    ContentIdParam,
    ContentResponse,
    SingleContentResponse,
    DeleteContentResponse,
    // Enhanced Course
    CourseWithModulesResponseSchema,
    CourseWithModulesResponse
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

    // Get next courses for a given course
    fastify.get('/courses/:courseId/next', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Get next courses',
            description: 'Retrieve the next recommended courses for a given course',
            params: CourseIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'array',
                            items: CourseResponseSchema
                        },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: Course[]; message: string }> => {
        try {
            const courseId = parseInt((request.params as any).courseId, 10);
            const raw = await coursesService.getNextCourses(courseId);
            const data = serializeDates<Course[]>(raw);
            return {
                success: true,
                data,
                message: "Next courses retrieved successfully"
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

    // Vector endpoints
    // Create vector
    fastify.post('/vectors', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Vectors'],
            summary: 'Create a new vector',
            description: 'Create a new vector for courses or contents',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['string', 'vector', 'source', 'source_id'],
                properties: {
                    string: { type: 'string' },
                    vector: { type: 'array', items: { type: 'number' } },
                    source: { type: 'string', enum: ['contents', 'courses'] },
                    source_id: { type: 'number' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: VectorSchema,
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: Vector | null; message: string }> => {
        try {
            const { string, vector, source, source_id } = request.body as any;
            const data = await coursesService.createVector(string, vector, source, source_id);
            return {
                success: true,
                data,
                message: "Vector created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Update vector
    fastify.put('/vectors/:id', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Vectors'],
            summary: 'Update a vector',
            description: 'Update an existing vector',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'number' }
                }
            },
            body: {
                type: 'object',
                required: ['string', 'vector'],
                properties: {
                    string: { type: 'string' },
                    vector: { type: 'array', items: { type: 'number' } }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: VectorSchema,
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: Vector | null; message: string }> => {
        try {
            const { id } = request.params as { id: number };
            const { string, vector } = request.body as any;
            const data = await coursesService.updateVector(id, string, vector);
            return {
                success: true,
                data,
                message: "Vector updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Get vector by source
    fastify.get('/vectors/:source/:sourceId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Vectors'],
            summary: 'Get vector by source',
            description: 'Get vector by source type and source ID',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    source: { type: 'string', enum: ['contents', 'courses'] },
                    sourceId: { type: 'number' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: VectorSchema,
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: Vector | null; message: string }> => {
        try {
            const { source, sourceId } = request.params as { source: 'contents' | 'courses', sourceId: number };
            const data = await coursesService.getVectorBySourceId(source, sourceId);
            return {
                success: true,
                data,
                message: "Vector retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: null,
                message: errorMessage
            };
        }
    });

    // Search similar vectors
    fastify.post('/vectors/search', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Vectors'],
            summary: 'Search similar vectors',
            description: 'Search for similar vectors using cosine similarity',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['query_vector', 'source'],
                properties: {
                    query_vector: { type: 'array', items: { type: 'number' } },
                    source: { type: 'string', enum: ['contents', 'courses'] },
                    limit: { type: 'number', default: 10 }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'array', items: VectorSchema },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: Vector[]; message: string }> => {
        try {
            const { query_vector, source, limit = 10 } = request.body as any;
            const data = await coursesService.searchSimilarVectors(query_vector, source, limit);
            return {
                success: true,
                data,
                message: "Similar vectors retrieved successfully"
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

    // Delete vector
    fastify.delete('/vectors/:id', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Vectors'],
            summary: 'Delete a vector',
            description: 'Delete a vector by ID',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'number' }
                }
            },
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
            const { id } = request.params as { id: number };
            const success = await coursesService.deleteVector(id);
            return {
                success,
                message: success ? "Vector deleted successfully" : "Vector not found"
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

    // Delete vector by source
    fastify.delete('/vectors/:source/:sourceId', {
        preHandler: [authMiddleware, requireAdmin],
        schema: {
            tags: ['Vectors'],
            summary: 'Delete vector by source',
            description: 'Delete a vector by source type and source ID',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    source: { type: 'string', enum: ['contents', 'courses'] },
                    sourceId: { type: 'number' }
                }
            },
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
            const { source, sourceId } = request.params as { source: 'contents' | 'courses', sourceId: number };
            const success = await coursesService.deleteVectorBySourceId(source, sourceId);
            return {
                success,
                message: success ? "Vector deleted successfully" : "Vector not found"
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

    // Fuzzy search endpoints
    // Search courses and contents
    fastify.get('/search', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Search'],
            summary: 'Fuzzy search courses and contents',
            description: 'Search for courses and contents using fuzzy matching on names and descriptions',
            querystring: {
                type: 'object',
                required: ['q'],
                properties: {
                    q: { type: 'string', description: 'Search query string' },
                    limit: { type: 'number', default: 5, description: 'Maximum number of results per type' }
                }
            },
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                courses: {
                                    type: 'array',
                                    items: CourseResponseSchema
                                },
                                contents: {
                                    type: 'array',
                                    items: ContentsResponseSchema
                                }
                            }
                        },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: { courses: Course[]; contents: ContentWithModule[] }; message: string }> => {
        try {
            const { q: searchString, limit = 5 } = request.query as { q: string; limit?: number };

            if (!searchString || searchString.trim().length === 0) {
                reply.status(400).send({
                    success: false,
                    data: { courses: [], contents: [] },
                    message: "Search query is required"
                });
                return {
                    success: false,
                    data: { courses: [], contents: [] },
                    message: "Search query is required"
                };
            }

            const raw = await coursesService.fuzzySearchCombined(searchString.trim(), limit);
            const data = {
                courses: serializeDates<Course[]>(raw.courses),
                contents: serializeDates<ContentWithModule[]>(raw.contents)
            };

            return {
                success: true,
                data,
                message: `Found ${raw.courses.length} courses and ${raw.contents.length} contents matching "${searchString}"`
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: { courses: [], contents: [] },
                message: errorMessage
            };
        }
    });

    // Test search endpoint
    fastify.get('/search/test', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Search'],
            summary: 'Test search functionality',
            description: 'Test endpoint to verify search functionality with sample queries',
            querystring: {
                type: 'object',
                properties: {
                    q: { type: 'string', default: 'python', description: 'Test search query' },
                    limit: { type: 'number', default: 3, description: 'Maximum number of results per type' }
                }
            },
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                courses: {
                                    type: 'array',
                                    items: CourseResponseSchema
                                },
                                contents: {
                                    type: 'array',
                                    items: ContentsResponseSchema
                                },
                                testInfo: {
                                    type: 'object',
                                    properties: {
                                        searchQuery: { type: 'string' },
                                        limit: { type: 'number' },
                                        timestamp: { type: 'string' },
                                        coursesFound: { type: 'number' },
                                        contentsFound: { type: 'number' }
                                    }
                                }
                            }
                        },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<{ success: boolean; data: { courses: Course[]; contents: ContentWithModule[]; testInfo: any }; message: string }> => {
        try {
            const { q: searchString = 'python', limit = 3 } = request.query as { q?: string; limit?: number };

            const startTime = Date.now();
            const raw = await coursesService.fuzzySearchCombined(searchString, limit);
            const endTime = Date.now();

            const data = {
                courses: serializeDates<Course[]>(raw.courses),
                contents: serializeDates<ContentWithModule[]>(raw.contents),
                testInfo: {
                    searchQuery: searchString,
                    limit,
                    timestamp: new Date().toISOString(),
                    coursesFound: raw.courses.length,
                    contentsFound: raw.contents.length,
                    executionTimeMs: endTime - startTime
                }
            };

            return {
                success: true,
                data,
                message: `Test search completed in ${endTime - startTime}ms. Found ${raw.courses.length} courses and ${raw.contents.length} contents.`
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: { courses: [], contents: [], testInfo: null },
                message: errorMessage
            };
        }
    });

    // Module Management APIs
    // GET /courses/{courseId}/modules
    fastify.get('/courses/:courseId/modules', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Module Management'],
            summary: 'Get modules by course ID',
            description: 'Retrieve all modules for a specific course',
            params: CourseIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: ModulesResponseSchemaNew
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<ModulesResponseNew> => {
        try {
            const courseId = parseInt((request.params as any).courseId, 10);
            const raw = await coursesService.getModulesByCourseId(courseId);
            const modules = serializeDates<Module[]>(raw);

            return {
                success: true,
                data: {
                    modules,
                    total: modules.length
                },
                message: "Modules retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send({ success: false, message: errorMessage });
            return {
                success: false,
                data: {
                    modules: [],
                    total: 0
                },
                message: errorMessage
            };
        }
    });
}
