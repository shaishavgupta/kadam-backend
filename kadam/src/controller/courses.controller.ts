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
import { ContentType } from '../shared/enums';

// Helper to convert all Date values in objects/arrays to ISO strings
function serializeDates<T>(value: any): T {
    return JSON.parse(
        JSON.stringify(value, (_key, val) => (val instanceof Date ? val.toISOString() : val))
    );
}

// Helper to create error responses
function createErrorResponse(message: string, statusCode: number = 500) {
    return {
        success: false,
        message,
        statusCode
    };
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Create course
    fastify.post('', {
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
                certificate_id: body.certificate_id,
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    id: 0,
                    name: '',
                    description: '',
                    is_paid: false,
                    price: 0,
                    thumbnail_url: '',
                    certificate_id: 0,
                    rank: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // Update course
    fastify.patch('/:id', {
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
                certificate_id: body.certificate_id,
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    id: 0,
                    name: '',
                    description: '',
                    is_paid: false,
                    price: 0,
                    thumbnail_url: '',
                    certificate_id: 0,
                    rank: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // Get courses by category
    fastify.get('/category/:categoryId', {
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
    fastify.get('/currently-enrolled', {
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
                reply.status(401).send(createErrorResponse("User not authenticated", 401));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: [],
                message: errorMessage
            };
        }
    });

    // Publish course
    fastify.post('/publish', {
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return { success: false, message: errorMessage };
        }
    });

    // Unpublish course
    fastify.post('/:courseId/unpublish', {
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return { success: false, message: errorMessage };
        }
    });

    // Get course list with aggregated data
    fastify.get('/home-page-courses', {
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
            reply.code(500).send(createErrorResponse(errorMessage, 500));
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
                reply.status(401).send(createErrorResponse("User not authenticated", 401));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
    fastify.get('/:courseId/next', {
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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
                reply.status(400).send(createErrorResponse("Search query is required", 400));
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: { courses: [], contents: [] },
                message: errorMessage
            };
        }
    });

    // Module Management APIs
    // GET /courses/{courseId}/modules
    fastify.get('/:courseId/modules', {
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
            reply.status(500).send(createErrorResponse(errorMessage, 500));
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

    // POST /courses/{courseId}/modules
    fastify.post('/:courseId/modules', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Module Management'],
            summary: 'Create a new module',
            description: 'Create a new module within a course',
            params: CourseIdParamSchema,
            body: CreateModuleRequestSchemaNew,
            security: [{ bearerAuth: [] }],
            response: {
                200: ModuleResponseSchema,
                400: ModuleResponseSchema,
                500: ModuleResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<ModuleResponse> => {
        try {
            const courseId = parseInt((request.params as any).courseId, 10);
            const moduleData = request.body as CreateModuleRequestNew;

            const module = await coursesService.createModule(courseId, moduleData);

            if (!module) {
                reply.status(400);
                return {
                    success: false,
                    data: {
                        id: 0,
                        name: '',
                        description: '',
                        position: 0,
                        is_paid: false,
                        is_active: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    message: "Failed to create module"
                };
            }

            const data = serializeDates<Module>(module);
            return {
                success: true,
                data,
                message: "Module created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    id: 0,
                    name: '',
                    description: '',
                    position: 0,
                    is_paid: false,
                    is_active: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // GET /modules/{moduleId}/content
    fastify.get('/modules/:moduleId/content', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Content Management'],
            summary: 'Get content by module ID',
            description: 'Retrieve all content items within a specific module',
            params: ModuleIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: ContentResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<ContentResponse> => {
        try {
            const moduleId = parseInt((request.params as any).moduleId, 10);
            const raw = await coursesService.getContentByModuleId(moduleId);
            const content = serializeDates<ContentWithModule[]>(raw);

            return {
                success: true,
                data: {
                    content,
                    total: content.length
                },
                message: "Content retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    content: [],
                    total: 0
                },
                message: errorMessage
            };
        }
    });

    // POST /modules/{moduleId}/content
    fastify.post('/modules/:moduleId/content', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Content Management'],
            summary: 'Create new content',
            description: 'Create new content within a specific module',
            params: ModuleIdParamSchema,
            body: CreateContentRequestSchemaNew,
            security: [{ bearerAuth: [] }],
            response: {
                200: SingleContentResponseSchema,
                400: SingleContentResponseSchema,
                500: SingleContentResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<SingleContentResponse> => {
        const errorResponse = {
            success: false,
            data: {
                id: 0,
                name: '',
                module_id: 0,
                type: ContentType.VIDEO as any,
                position: 0,
                is_paid: false,
                is_active: false,
                url: '',
                abs_url: '',
                duration: 0,
                thumbnail_url: '',
                category_id: 0,
                next_content_id: 0,
                approved_at: '',
                approved_by: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                module_title: '',
                module_description: ''
            },
            message: "Failed to create content"
        }
        try {
            const moduleId = parseInt((request.params as any).moduleId, 10);
            const contentData = request.body as CreateContentRequestNew;

            const content = await coursesService.createContent(moduleId, contentData);

            if (!content) {
                reply.status(400);
                return errorResponse;
            }

            const data = serializeDates<ContentWithModule>(content);
            return {
                success: true,
                data,
                message: "Content created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500);
            errorResponse.message = errorMessage;
            return errorResponse;
        }
    });

    // PATCH /modules/{moduleId}
    fastify.patch('/modules/:moduleId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Module Management'],
            summary: 'Update a module',
            description: 'Update an existing module',
            params: ModuleIdParamSchema,
            body: UpdateModuleRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: ModuleResponseSchema,
                404: ModuleResponseSchema,
                500: ModuleResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<ModuleResponse> => {
        try {
            const moduleId = parseInt((request.params as any).moduleId, 10);
            const moduleData = request.body as UpdateModuleRequest;

            const module = await coursesService.updateModule(moduleId, moduleData);

            if (!module) {
                reply.status(404);
                return {
                    success: false,
                    data: {
                        id: 0,
                        name: '',
                        description: '',
                        position: 0,
                        is_paid: false,
                        is_active: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    message: "Module not found"
                };
            }

            const data = serializeDates<Module>(module);
            return {
                success: true,
                data,
                message: "Module updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    id: 0,
                    name: '',
                    description: '',
                    position: 0,
                    is_paid: false,
                    is_active: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // PATCH /content/{contentId}
    fastify.patch('/content/:contentId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Content Management'],
            summary: 'Update content',
            description: 'Update existing content',
            params: ContentIdParamSchema,
            body: UpdateContentRequestSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: SingleContentResponseSchema,
                404: SingleContentResponseSchema,
                500: SingleContentResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<SingleContentResponse> => {
        try {
            const contentId = parseInt((request.params as any).contentId, 10);
            const contentData = request.body as UpdateContentRequest;

            const content = await coursesService.updateContent(contentId, contentData);

            if (!content) {
                reply.status(404);
                return {
                    success: false,
                    data: {
                        id: 0,
                        name: '',
                        module_id: 0,
                        type: 'VIDEO' as any,
                        position: 0,
                        is_paid: false,
                        is_active: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    message: "Content not found"
                };
            }

            const data = serializeDates<ContentWithModule>(content);
            return {
                success: true,
                data,
                message: "Content updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    id: 0,
                    name: '',
                    module_id: 0,
                    type: 'VIDEO' as any,
                    position: 0,
                    is_paid: false,
                    is_active: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // DELETE /modules/{moduleId}
    fastify.delete('/modules/:moduleId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Module Management'],
            summary: 'Delete a module',
            description: 'Delete a module (soft delete)',
            params: ModuleIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: DeleteModuleResponseSchema,
                404: DeleteModuleResponseSchema,
                500: DeleteModuleResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<DeleteModuleResponse> => {
        try {
            const moduleId = parseInt((request.params as any).moduleId, 10);

            const success = await coursesService.deleteModule(moduleId);

            if (!success) {
                reply.status(404);
                return {
                    success: false,
                    data: {
                        moduleId: 0,
                        deletedAt: new Date().toISOString()
                    },
                    message: "Module not found"
                };
            }

            return {
                success: true,
                data: {
                    moduleId,
                    deletedAt: new Date().toISOString()
                },
                message: "Module deleted successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    moduleId: 0,
                    deletedAt: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // DELETE /content/{contentId}
    fastify.delete('/content/:contentId', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Content Management'],
            summary: 'Delete content',
            description: 'Delete content (soft delete)',
            params: ContentIdParamSchema,
            security: [{ bearerAuth: [] }],
            response: {
                200: DeleteContentResponseSchema,
                404: DeleteContentResponseSchema,
                500: DeleteContentResponseSchema
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<DeleteContentResponse> => {
        try {
            const contentId = parseInt((request.params as any).contentId, 10);

            const success = await coursesService.deleteContent(contentId);

            if (!success) {
                reply.status(404);
                return {
                    success: false,
                    data: {
                        contentId: 0,
                        deletedAt: new Date().toISOString()
                    },
                    message: "Content not found"
                };
            }

            return {
                success: true,
                data: {
                    contentId,
                    deletedAt: new Date().toISOString()
                },
                message: "Content deleted successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: {
                    contentId: 0,
                    deletedAt: new Date().toISOString()
                },
                message: errorMessage
            };
        }
    });

    // GET course details by videoId (contentId)
    fastify.get('/video/:videoId/course-details', {
        preHandler: [authMiddleware, requireUser],
        schema: {
            tags: ['Courses'],
            summary: 'Get course details by video ID',
            description: 'Retrieve full course details with modules and all contents for a given video ID',
            params: {
                type: 'object',
                properties: {
                    videoId: { type: 'string', pattern: '^[0-9]+$' }
                },
                required: ['videoId']
            },
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: CourseWithModulesResponseSchema,
                        message: { type: 'string' }
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'null' },
                        message: { type: 'string' }
                    }
                },
                500: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'null' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<CourseWithModulesResponse> => {
        try {
            const videoId = parseInt((request.params as any).videoId, 10);

            const courseData = await coursesService.getCourseWithModulesAndContentByVideoId(videoId);

            if (!courseData) {
                reply.status(404);
                return {
                    success: false,
                    data: null as any,
                    message: 'Course not found for the given video ID'
                };
            }

            const data = serializeDates<any>(courseData);
            return {
                success: true,
                data,
                message: 'Course details retrieved successfully'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.status(500).send(createErrorResponse(errorMessage, 500));
            return {
                success: false,
                data: null as any,
                message: errorMessage
            };
        }
    });
}
