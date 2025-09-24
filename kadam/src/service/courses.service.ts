import { CoursesRepository } from "../repository/courses.repository";
import { Tag, Category, Module, ContentWithModule, CreateCourseRequest, UpdateCourseRequest, Course, PublishCourseRequest, PaginatedCoursesResponse, Vector } from "../shared/types/courses.types";
import { CourseListData, UserStats } from "../schemas/course";

export class CoursesService {
    private repository: CoursesRepository;

    constructor() {
        this.repository = new CoursesRepository();
    }

    async getCourseList(): Promise<CourseListData> {
        try {
            return await this.repository.getCourseList();
        } catch (error) {
            console.error("Error getting course list:", error);
            return {
                keep_watching: [],
                for_you: [],
                top_10: [],
                popular: [],
                latest: []
            };
        }
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

    async getNextCourses(courseId: number): Promise<Course[]> {
        try {
            return await this.repository.getNextCourses(courseId);
        } catch (error) {
            console.error("Error getting next courses:", error);
            return [];
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

    async getCoursesByCategory(categoryId: number, page: number = 1, limit: number = 10): Promise<PaginatedCoursesResponse> {
        try {
            return await this.repository.getCoursesByCategory(categoryId, page, limit);
        } catch (error) {
            console.error("Error getting courses by category:", error);
            return {
                courses: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            };
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

    async getUserStats(userId: number): Promise<UserStats> {
        try {
            return await this.repository.getUserStats(userId);
        } catch (error) {
            console.error("Error getting user stats:", error);
            return {
                total_courses_started: 0,
                total_hours_spent: 0,
                avg_hours_per_day: 0
            };
        }
    }

    async calculateAndUpdateCourseRankings(): Promise<void> {
        try {
            console.log('🔄 Starting course ranking calculation service...');
            await this.repository.calculateAndUpdateCourseRankings();
            console.log('✅ Course ranking calculation completed successfully');
        } catch (error) {
            console.error("Error calculating course rankings:", error);
            throw error;
        }
    }

    // Vector operations
    async createVector(string: string, vector: number[], source: 'contents' | 'courses', sourceId: number): Promise<Vector> {
        try {
            return await this.repository.createVector(string, vector, source, sourceId);
        } catch (error) {
            console.error("Error creating vector:", error);
            throw error;
        }
    }

    async updateVector(id: number, string: string, vector: number[]): Promise<Vector | null> {
        try {
            return await this.repository.updateVector(id, string, vector);
        } catch (error) {
            console.error("Error updating vector:", error);
            return null;
        }
    }

    async getVectorBySourceId(source: 'contents' | 'courses', sourceId: number): Promise<Vector | null> {
        try {
            return await this.repository.getVectorBySourceId(source, sourceId);
        } catch (error) {
            console.error("Error getting vector by source ID:", error);
            return null;
        }
    }

    async searchSimilarVectors(queryVector: number[], source: 'contents' | 'courses', limit: number = 10): Promise<Vector[]> {
        try {
            return await this.repository.searchSimilarVectors(queryVector, source, limit);
        } catch (error) {
            console.error("Error searching similar vectors:", error);
            return [];
        }
    }

    async deleteVector(id: number): Promise<boolean> {
        try {
            return await this.repository.deleteVector(id);
        } catch (error) {
            console.error("Error deleting vector:", error);
            return false;
        }
    }

    async deleteVectorBySourceId(source: 'contents' | 'courses', sourceId: number): Promise<boolean> {
        try {
            return await this.repository.deleteVectorBySourceId(source, sourceId);
        } catch (error) {
            console.error("Error deleting vector by source ID:", error);
            return false;
        }
    }

    // Search methods
    async fuzzySearchCourses(searchString: string, limit: number = 5): Promise<Course[]> {
        try {
            return await this.repository.fuzzySearchCourses(searchString, limit);
        } catch (error) {
            console.error("Error in fuzzy search courses:", error);
            return [];
        }
    }

    async fuzzySearchContents(searchString: string, limit: number = 5): Promise<ContentWithModule[]> {
        try {
            return await this.repository.fuzzySearchContents(searchString, limit);
        } catch (error) {
            console.error("Error in fuzzy search contents:", error);
            return [];
        }
    }

    async fuzzySearchCombined(searchString: string, limit: number = 5): Promise<{
        courses: Course[];
        contents: ContentWithModule[];
    }> {
        try {
            return await this.repository.fuzzySearchCombined(searchString, limit);
        } catch (error) {
            console.error("Error in fuzzy search combined:", error);
            return { courses: [], contents: [] };
        }
    }
}
