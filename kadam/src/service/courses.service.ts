import { CoursesRepository } from "../repository/courses.repository";
import { Tag, Category, Module, ContentWithModule, CreateCourseRequest, UpdateCourseRequest, Course, PublishCourseRequest } from "../shared/types/courses.types";

export class CoursesService {
    private repository: CoursesRepository;

    constructor() {
        this.repository = new CoursesRepository();
    }

        async getContentsByCourseId(courseId: number): Promise<ContentWithModule[]> {
        try {
            return await this.repository.getContentsByCourseId(courseId);
        } catch (error) {
            console.error("Error getting contents by course ID:", error);
            return [];
        }
    }

        async getModulesByCreatorId(creatorId: number): Promise<Module[]> {
        try {
            return await this.repository.getModulesByCreatorId(creatorId);
        } catch (error) {
            console.error("Error getting modules by creator ID:", error);
            return [];
        }
    }

        async searchTags(contentName?: string, courseName?: string, moduleName?: string): Promise<Tag[]> {
        try {
            return await this.repository.searchTags(contentName, courseName, moduleName);
        } catch (error) {
            console.error("Error searching tags:", error);
            return [];
        }
    }

        async getCategories(): Promise<Category[]> {
        try {
            return await this.repository.getCategories();
        } catch (error) {
            console.error("Error getting categories:", error);
            return [];
        }
    }

        async createCourse(request: CreateCourseRequest): Promise<{ courseId: number }> {
        try {
            const course = await this.repository.createCourse(request);
            if (course) {
                return { courseId: course.id };
            }
            throw new Error("Failed to create course");
        } catch (error) {
            console.error("Error creating course:", error);
            throw error;
        }
    }

        async updateCourse(id: number, request: UpdateCourseRequest): Promise<Course | null> {
        try {
            return await this.repository.updateCourse(id, request);
        } catch (error) {
            console.error("Error updating course:", error);
            return null;
        }
    }

        async getCourseById(id: number): Promise<Course | null> {
        try {
            return await this.repository.getCourseById(id);
        } catch (error) {
            console.error("Error getting course by ID:", error);
            return null;
        }
    }

        async publishCourse(request: PublishCourseRequest): Promise<boolean> {
        try {
            return await this.repository.publishCourse(request.course_id);
        } catch (error) {
            console.error("Error publishing course:", error);
            return false;
        }
    }

        async unpublishCourse(courseId: number): Promise<boolean> {
        try {
            return await this.repository.unpublishCourse(courseId);
        } catch (error) {
            console.error("Error unpublishing course:", error);
            return false;
        }
    }

        async getCoursesByCategory(categoryId: number): Promise<Course[]> {
        try {
            return await this.repository.getCoursesByCategory(categoryId);
        } catch (error) {
            console.error("Error getting courses by category:", error);
            return [];
        }
    }

            async getCurrentlyEnrolledCourses(userId: number): Promise<Course[]> {
        try {
            return await this.repository.getCurrentlyEnrolledCourses(userId);
        } catch (error) {
            console.error("Error getting currently enrolled courses:", error);
            return [];
        }
    }

        async getPopularCategories(): Promise<Category[]> {
        try {
            return await this.repository.getPopularCategories();
        } catch (error) {
            console.error("Error getting popular categories:", error);
            return [];
        }
    }
}
