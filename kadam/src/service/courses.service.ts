import { CoursesRepository } from "../repository/courses.repository";
import { Category, Module, ContentWithModule, CreateCourseRequest, UpdateCourseRequest, Course, PublishCourseRequest, PaginatedCoursesResponse, Vector, ExploreCourse, ExploreResponse, Path, CreatePathRequest, UpdatePathRequest } from "../schemas/course";
import { UserCourse } from "../schemas/course";
import { ContentType, CourseListData, UserStats, CourseListItem } from "../schemas/course";

export class CoursesService {
    private repository: CoursesRepository;

    constructor() {
        this.repository = new CoursesRepository();
    }

    // Paths
    async getPaths(page: number = 1, limit: number = 10): Promise<{ paths: Path[]; total: number; page: number; limit: number; totalPages: number; }> {
        try {
            return await this.repository.getPaths(page, limit);
        } catch (error) {
            console.error("Error getting paths:", error);
            return { paths: [], total: 0, page, limit, totalPages: 0 };
        }
    }

    async getPathById(pathId: number): Promise<Path | null> {
        try {
            return await this.repository.getPathById(pathId);
        } catch (error) {
            console.error("Error getting path by id:", error);
            return null;
        }
    }

    async createPath(data: CreatePathRequest): Promise<Path | null> {
        try {
            return await this.repository.createPath(data);
        } catch (error) {
            console.error("Error creating path:", error);
            return null;
        }
    }

    async updatePath(pathId: number, data: UpdatePathRequest): Promise<Path | null> {
        try {
            return await this.repository.updatePath(pathId, data);
        } catch (error) {
            console.error("Error updating path:", error);
            return null;
        }
    }

    async deletePath(pathId: number): Promise<boolean> {
        try {
            return await this.repository.deletePath(pathId);
        } catch (error) {
            console.error("Error deleting path:", error);
            return false;
        }
    }


    async getHomePageCourseList(language: string): Promise<CourseListData> {
        try {
            return await this.repository.getHomePageCourseList(language);
        } catch (error) {
            console.error("Error getting course list:", error);
            return {
                keep_watching: [],
                for_you: [],
                top_10: [],
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

    async getCategories(): Promise<Category[]> {
        try {
            return await this.repository.getCategories();
        } catch (error) {
            console.error("Error getting categories:", error);
            return [];
        }
    }

    async getCategoriesByIds(categoryIds: number[]): Promise<Category[]> {
        try {
            return await this.repository.getCategoriesByIds(categoryIds);
        } catch (error) {
            console.error("Error getting categories by IDs:", error);
            return [];
        }
    }

    async createCourse(request: CreateCourseRequest & { creator_id: number }): Promise<{ courseId: number }> {
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

    async getCourseById(id: number, language: string): Promise<Course | null> {
        try {
            return await this.repository.getCourseById(id, language);
        } catch (error) {
            console.error("Error getting course by ID:", error);
            return null;
        }
    }

    async getNextCourses(courseId: number, language: string): Promise<Course[]> {
        try {
            return await this.repository.getNextCourses(courseId, language);
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

    async unpublishCourse(courseId: number, creatorId: string): Promise<boolean> {
        try {
            return await this.repository.unpublishCourse(courseId, creatorId);
        } catch (error) {
            console.error("Error unpublishing course:", error);
            return false;
        }
    }

    async getCoursesByCategory(categoryId: number, page: number = 1, limit: number = 10, language: string): Promise<PaginatedCoursesResponse> {
        try {
            return await this.repository.getCoursesByCategory(categoryId, page, limit, language);
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
    async fuzzySearchCourses(searchString: string, limit: number = 5, language: string): Promise<Course[]> {
        try {
            return await this.repository.fuzzySearchCourses(searchString, limit, language);
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

    async fuzzySearchCombined(searchString: string, limit: number = 5, language: string): Promise<{
        courses: Course[];
        contents: ContentWithModule[];
    }> {
        try {
            return await this.repository.fuzzySearchCombined(searchString, limit, language);
        } catch (error) {
            console.error("Error in fuzzy search combined:", error);
            return { courses: [], contents: [] };
        }
    }

    // Module Management Methods
    async getModulesByCourseId(courseId: number): Promise<Module[]> {
        try {
            return await this.repository.getModulesByCourseId(courseId);
        } catch (error) {
            console.error("Error getting modules by course ID:", error);
            return [];
        }
    }

    async createModule(courseId: number, moduleData: {
        name: string;
        description: string;
        position: number;
        is_paid: boolean;
        is_active: boolean;
        thumbnail_url?: string;
    }, createdBy: string): Promise<Module | null> {
        try {
            const moduleDataWithThumbnail = {
                ...moduleData,
                thumbnail_url: moduleData.thumbnail_url || ''
            };
            return await this.repository.createModule(courseId, moduleDataWithThumbnail, createdBy);
        } catch (error) {
            console.error("Error creating module:", error);
            return null;
        }
    }

    async updateModule(moduleId: number, moduleData: {
        name?: string;
        description?: string;
        position?: number;
        is_paid?: boolean;
        is_active?: boolean;
        thumbnail_url?: string;
    }, creatorId: string): Promise<Module | null> {
        try {
            return await this.repository.updateModule(moduleId, moduleData, creatorId);
        } catch (error) {
            console.error("Error updating module:", error);
            return null;
        }
    }

    async deleteModule(moduleId: number, creatorId: string): Promise<boolean> {
        try {
            return await this.repository.deleteModule(moduleId, creatorId);
        } catch (error) {
            console.error("Error deleting module:", error);
            return false;
        }
    }

    // Content Management Methods
    async getContentByModuleId(moduleId: number): Promise<ContentWithModule[]> {
        try {
            return await this.repository.getContentByModuleId(moduleId);
        } catch (error) {
            console.error("Error getting content by module ID:", error);
            return [];
        }
    }

    async createContent(moduleId: number, contentData: {
        name: string;
        description: string;
        content_type: ContentType;
        position: number;
        is_paid: boolean;
        is_active: boolean;
        url?: string;
        abs_url?: string;
        duration?: number;
        thumbnail_url?: string;
        category_id?: number;
        next_content_id?: number;
    }, createdBy: string): Promise<ContentWithModule | null> {
        try {
            return await this.repository.createContent(moduleId, contentData, createdBy);
        } catch (error) {
            console.error("Error creating content:", error);
            return null;
        }
    }

    async updateContent(contentId: number, contentData: {
        name?: string;
        description?: string;
        content_type?: ContentType;
        position?: number;
        is_paid?: boolean;
        is_active?: boolean;
        url?: string;
        abs_url?: string;
        duration?: number;
        thumbnail_url?: string;
        category_id?: number;
        next_content_id?: number;
    }, creatorId?: string): Promise<ContentWithModule | null> {
        try {
            return await this.repository.updateContent(contentId, contentData, creatorId ?? '');
        } catch (error) {
            console.error("Error updating content:", error);
            return null;
        }
    }

    async deleteContent(contentId: number, creatorId: string): Promise<boolean> {
        try {
            return await this.repository.deleteContent(contentId, creatorId);
        } catch (error) {
            console.error("Error deleting content:", error);
            return false;
        }
    }

    async getContentById(contentId: number): Promise<ContentWithModule | null> {
        try {
            return await this.repository.getContentById(contentId);
        } catch (error) {
            console.error("Error getting content by ID:", error);
            return null;
        }
    }

    // Enhanced Course Data Method
    async getCourseWithModulesAndContent(courseId: number): Promise<any> {
        try {
            return await this.repository.getCourseWithModulesAndContent(courseId);
        } catch (error) {
            console.error("Error getting course with modules and content:", error);
            return null;
        }
    }

    // Get course details by video ID (content ID)
    async getCourseWithModulesAndContentByVideoId(videoId: number): Promise<any> {
        try {
            return await this.repository.getCourseWithModulesAndContentByVideoId(videoId);
        } catch (error) {
            console.error("Error getting course with modules and content by video ID:", error);
            return null;
        }
    }

    async getApprovedCourseWithHierarchy(courseId: number, language: string): Promise<UserCourse | null> {
        try {
            return this.repository.getApprovedCourseWithHierarchy(courseId, language);
        } catch (error) {
            console.error("Error getting approved course with hierarchy:", error);
            throw error;
        }
    }

    async getExploreCourses(language: string): Promise<ExploreCourse[]> {
        try {
            return await this.repository.getExploreCourses(language);
        } catch (error) {
            console.error("Error getting explore courses:", error);
            return [];
        }
    }
}
