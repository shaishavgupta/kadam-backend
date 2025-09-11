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
    TagsSearchQuerySchema
} from '../schemas/course';

export default async function coursesRoutes(fastify: FastifyInstance) {
    const coursesService = new CoursesService();

    // Get course categories
    fastify.get('/categories', {
        schema: {
            tags: ['Courses'],
            summary: 'Get course categories',
            description: 'Retrieve all available course categories',
            response: {
                200: CategoriesResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = await coursesService.getCategories();
            return {
                success: true,
                data,
                message: "Categories retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get course contents
    fastify.get('/contents/:courseId', {
        schema: {
            tags: ['Courses'],
            summary: 'Get course contents',
            description: 'Retrieve all contents for a specific course',
            params: CourseIdParamSchema,
            response: {
                200: ContentsResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Params: CourseIdParam }>, reply: FastifyReply) => {
        try {
            const courseId = parseInt(request.params.courseId, 10);
            const data = await coursesService.getContentsByCourseId(courseId);
            return {
                success: true,
                data,
                message: "Contents retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get modules by creator
    fastify.get('/modules/creator/:creatorId', {
        schema: {
            tags: ['Courses'],
            summary: 'Get modules by creator',
            description: 'Retrieve all modules created by a specific creator',
            params: CourseCreatorIdParamSchema,
            response: {
                200: ModulesResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Params: CourseCreatorIdParam }>, reply: FastifyReply) => {
        try {
            const creatorId = parseInt(request.params.creatorId, 10);
            const data = await coursesService.getModulesByCreatorId(creatorId);
            return {
                success: true,
                data,
                message: "Modules retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Search tags
    fastify.get('/tags/search', {
        schema: {
            tags: ['Courses'],
            summary: 'Search tags',
            description: 'Search for tags based on content, course, or module names',
            querystring: TagsSearchQuerySchema,
            response: {
                200: TagsSearchResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Querystring: TagsSearchQuery }>, reply: FastifyReply) => {
        try {
            const { contentName, courseName, moduleName } = request.query;
            const data = await coursesService.searchTags(contentName, courseName, moduleName);
            return {
                success: true,
                data,
                message: "Tags retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Create course
    fastify.post('/courses', {
        schema: {
            tags: ['Courses'],
            summary: 'Create course',
            description: 'Create a new course',
            body: CreateCourseRequestSchema,
            response: {
                200: CourseResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Body: CreateCourseRequest }>, reply: FastifyReply) => {
        try {
            const data = await coursesService.createCourse(request.body);
            return {
                success: true,
                data,
                message: "Course created successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Update course
    fastify.patch('/courses/:id', {
        schema: {
            tags: ['Courses'],
            summary: 'Update course',
            description: 'Update an existing course',
            params: CourseIdParamSchema2,
            body: UpdateCourseRequestSchema,
            response: {
                200: CourseResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Params: CourseIdParam2, Body: UpdateCourseRequest }>, reply: FastifyReply) => {
        try {
            const courseId = parseInt(request.params.id, 10);
            const data = await coursesService.updateCourse(courseId, request.body);
            return {
                success: true,
                data,
                message: "Course updated successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get popular categories
    fastify.get('/courses/popular-categories', {
        schema: {
            tags: ['Courses'],
            summary: 'Get popular categories',
            description: 'Retrieve the most popular course categories',
            response: {
                200: PopularCategoriesResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = await coursesService.getPopularCategories();
            return {
                success: true,
                data,
                message: "Popular categories retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get courses by category
    fastify.get('/courses/category/:categoryId', {
        schema: {
            tags: ['Courses'],
            summary: 'Get courses by category',
            description: 'Retrieve all courses in a specific category',
            params: CategoryIdParamSchema,
            response: {
                200: CoursesByCategoryResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Params: CategoryIdParam }>, reply: FastifyReply) => {
        try {
            const categoryId = parseInt(request.params.categoryId, 10);
            const data = await coursesService.getCoursesByCategory(categoryId);
            return {
                success: true,
                data,
                message: "Courses retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Get currently enrolled courses
    fastify.get('/courses/currently-enrolled', {
        schema: {
            tags: ['Courses'],
            summary: 'Get currently enrolled courses',
            description: 'Retrieve courses currently enrolled by the authenticated user',
            response: {
                200: CurrentlyEnrolledCoursesResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // Assuming userId is available from auth middleware
            const userId = (request as any).user.id;
            const data = await coursesService.getCurrentlyEnrolledCourses(userId);
            return {
                success: true,
                data,
                message: "Currently enrolled courses retrieved successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
        }
    });

    // Publish course
    fastify.post('/courses/publish', {
        schema: {
            tags: ['Courses'],
            summary: 'Publish course',
            description: 'Publish a course to make it available to users',
            body: PublishCourseRequestSchema,
            response: {
                200: PublishCourseResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Body: PublishCourseRequest }>, reply: FastifyReply): Promise<PublishCourseResponse | void> => {
        try {
            const publishData = {
                ...request.body,
                published_at: request.body.published_at ? new Date(request.body.published_at) : undefined
            };
            const success = await coursesService.publishCourse(publishData);
            return {
                success,
                message: "Course published successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
            return { success: false, message: errorMessage };
        }
    });

    // Unpublish course
    fastify.post('/courses/:courseId/unpublish', {
        schema: {
            tags: ['Courses'],
            summary: 'Unpublish course',
            description: 'Unpublish a course to make it unavailable to users',
            params: CourseIdParamSchema,
            response: {
                200: UnpublishCourseResponseSchema
            }
        }
    }, async (request: FastifyRequest<{ Params: CourseIdParam }>, reply: FastifyReply): Promise<UnpublishCourseResponse | void> => {
        try {
            const courseId = parseInt(request.params.courseId, 10);
            const success = await coursesService.unpublishCourse(courseId);
            return {
                success,
                message: "Course unpublished successfully"
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            reply.code(500).send({ success: false, message: errorMessage });
            return { success: false, message: errorMessage };
        }
    });
}
