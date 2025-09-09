import { CoursesRepository } from "./repository";
import { ContentType, Tag, Category, Module, ContentWithModule, CreateCourseRequest, UpdateCourseRequest, Course, PublishCourseRequest } from "./types";
import { APIError, ErrCode } from "encore.dev/api";

export class CoursesService {
    private repository: CoursesRepository;

    constructor() {
        this.repository = new CoursesRepository();
    }

    // Get all contents by course_id with module information
    async getContentsByCourseId(courseId: number): Promise<ContentWithModule[]> {
        if (!courseId || courseId <= 0) {
            throw new APIError(ErrCode.InvalidArgument, "Invalid course ID");
        }

        return await this.repository.getContentsByCourseId(courseId);
    }

    // Get all modules by creator_id
    async getModulesByCreatorId(creatorId: number): Promise<Module[]> {
        if (!creatorId || creatorId <= 0) {
            throw new APIError(ErrCode.InvalidArgument, "Invalid creator ID");
        }

        return await this.repository.getModulesByCreatorId(creatorId);
    }

    // Get tags by content, course, and module names
    async getTagsByNames(contentName?: string, courseName?: string, moduleName?: string): Promise<Tag[]> {
        if (!contentName && !courseName && !moduleName) {
            throw new APIError(ErrCode.InvalidArgument, "At least one name parameter must be provided");
        }

        return await this.repository.getTagsByNames(contentName, courseName, moduleName);
    }

    // Get all categories
    async getAllCategories(): Promise<Category[]> {
        return await this.repository.getAllCategories();
    }

    // Create a new course
    async createCourse(request: CreateCourseRequest): Promise<{ courseId: number }> {
        // Validate required fields
        if (!request.name || request.name.trim().length === 0) {
            throw new APIError(ErrCode.InvalidArgument, "Course name is required");
        }

        if (!request.description || request.description.trim().length === 0) {
            throw new APIError(ErrCode.InvalidArgument, "Course description is required");
        }

        if (!request.creator_id || request.creator_id <= 0) {
            throw new APIError(ErrCode.InvalidArgument, "Valid creator ID is required");
        }

        if (!request.category_id || request.category_id <= 0) {
            throw new APIError(ErrCode.InvalidArgument, "Valid category ID is required");
        }

        if (!request.certificate_url || request.certificate_url.trim().length === 0) {
            throw new APIError(ErrCode.InvalidArgument, "Certificate URL is required");
        }

        if (request.price < 0) {
            throw new APIError(ErrCode.InvalidArgument, "Price cannot be negative");
        }

        if (!request.tags || request.tags.length === 0) {
            throw new APIError(ErrCode.InvalidArgument, "At least one tag is required");
        }

        // Validate contents if provided (direct content without modules)
        if (request.contents && request.contents.length > 0) {
            // Validate module names are unique within the course
            const moduleNames = new Set<string>();
            for (const content of request.contents) {
                if (!content.type || !Object.values(ContentType).includes(content.type)) {
                    throw new APIError(ErrCode.InvalidArgument, `Invalid content type: ${content.type}`);
                }

                if (content.position < 0) {
                    throw new APIError(ErrCode.InvalidArgument, "Content position cannot be negative");
                }

                if (content.module_name) {
                    if (moduleNames.has(content.module_name)) {
                        throw new APIError(ErrCode.InvalidArgument, `Module name "${content.module_name}" must be unique within the course`);
                    }
                    moduleNames.add(content.module_name);
                }
            }
        }

        const courseId = await this.repository.createCourse(
            request.name,
            request.description,
            request.creator_id,
            request.category_id,
            request.tags,
            request.is_paid,
            request.is_active,
            request.price,
            request.certificate_url,
            request.thumbnail_url,
            request.contents
        );

        // TODO: Generate course vector via OpenAI call
        // await this.generateAndUpdateCourseVector(courseId, request.name, request.description);

        return { courseId };
    }

    // Update a course
    async updateCourse(request: UpdateCourseRequest): Promise<void> {
        // Validate required fields
        if (!request.id || request.id <= 0) {
            throw new APIError(ErrCode.InvalidArgument, "Valid course ID is required");
        }

        if (!request.name || request.name.trim().length === 0) {
            throw new APIError(ErrCode.InvalidArgument, "Course name is required");
        }

        if (!request.description || request.description.trim().length === 0) {
            throw new APIError(ErrCode.InvalidArgument, "Course description is required");
        }

        if (!request.creator_id || request.creator_id <= 0) {
            throw new APIError(ErrCode.InvalidArgument, "Valid creator ID is required");
        }

        if (!request.category_id || request.category_id <= 0) {
            throw new APIError(ErrCode.InvalidArgument, "Valid category ID is required");
        }

        if (!request.certificate_url || request.certificate_url.trim().length === 0) {
            throw new APIError(ErrCode.InvalidArgument, "Certificate URL is required");
        }

        if (request.price < 0) {
            throw new APIError(ErrCode.InvalidArgument, "Price cannot be negative");
        }

        if (!request.tags || request.tags.length === 0) {
            throw new APIError(ErrCode.InvalidArgument, "At least one tag is required");
        }

        // Check if course exists
        const existingCourse = await this.repository.getCourseById(request.id);
        if (!existingCourse) {
            throw new APIError(ErrCode.NotFound, "Course not found");
        }

        // Validate contents if provided (direct content without modules)
        if (request.contents && request.contents.length > 0) {
            // Validate module names are unique within the course
            const moduleNames = new Set<string>();
            for (const content of request.contents) {
                if (!content.type || !Object.values(ContentType).includes(content.type)) {
                    throw new APIError(ErrCode.InvalidArgument, `Invalid content type: ${content.type}`);
                }

                if (content.position < 0) {
                    throw new APIError(ErrCode.InvalidArgument, "Content position cannot be negative");
                }

                if (content.module_name) {
                    if (moduleNames.has(content.module_name)) {
                        throw new APIError(ErrCode.InvalidArgument, `Module name "${content.module_name}" must be unique within the course`);
                    }
                    moduleNames.add(content.module_name);
                }
            }
        }

        await this.repository.updateCourse(
            request.id,
            request.name,
            request.description,
            request.creator_id,
            request.category_id,
            request.tags,
            request.is_paid,
            request.is_active,
            request.price,
            request.certificate_url,
            request.thumbnail_url,
            request.contents
        );

        // TODO: Generate course vector via OpenAI call
        // await this.generateAndUpdateCourseVector(request.id, request.name, request.description);
    }

    // Get courses by category_id
    async getCoursesByCategoryId(categoryId: number): Promise<Course[]> {
        return await this.repository.getCoursesByCategoryId(categoryId);
    }

    async getCurrentlyEnrolledCourses(userId: number): Promise<Course[]> {
        return await this.repository.getCurrentlyEnrolledCourses(userId);
    }

    // Publish course by updating published_at column
    async publishCourse(request: PublishCourseRequest): Promise<void> {
        // Validate course ID
        if (!request.course_id || request.course_id <= 0) {
            throw new APIError(ErrCode.InvalidArgument, "Valid course ID is required");
        }

        // Check if course exists
        const existingCourse = await this.repository.getCourseById(request.course_id);
        if (!existingCourse) {
            throw new APIError(ErrCode.NotFound, "Course not found");
        }

        // Check if course is already published
        if (existingCourse.published_at) {
            throw new APIError(ErrCode.AlreadyExists, "Course is already published");
        }

        await this.repository.publishCourse(request.course_id, request.published_at);
    }

    // Unpublish course by setting published_at to null
    async unpublishCourse(courseId: number): Promise<void> {
        // Validate course ID
        if (!courseId || courseId <= 0) {
            throw new APIError(ErrCode.InvalidArgument, "Valid course ID is required");
        }

        // Check if course exists
        const existingCourse = await this.repository.getCourseById(courseId);
        if (!existingCourse) {
            throw new APIError(ErrCode.NotFound, "Course not found");
        }

        // Check if course is already unpublished
        if (!existingCourse.published_at) {
            throw new APIError(ErrCode.FailedPrecondition, "Course is already unpublished");
        }

        await this.repository.unpublishCourse(courseId);
    }

    // TODO: Implement OpenAI integration for course vector generation
    private async generateAndUpdateCourseVector(courseId: number, name: string, description: string): Promise<void> {
        // This would integrate with OpenAI to generate embeddings
        // For now, we'll leave this as a placeholder
        console.log(`Generating course vector for course ${courseId}: ${name}`);
    }
}
