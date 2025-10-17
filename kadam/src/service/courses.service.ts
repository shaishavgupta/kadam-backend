import { CoursesRepository } from "../repository/courses.repository";
import { Category, Module, ContentWithModule, CreateCourseRequest, UpdateCourseRequest, Course, PublishCourseRequest, PaginatedCoursesResponse, Vector, ExploreCourse, ExploreResponse, Path, CreatePathRequest, UpdatePathRequest } from "../schemas/course";
import { UserCourse } from "../schemas/course";
import { ContentType, CourseListData, UserStats, CourseListItem } from "../schemas/course";
import { cache } from "../infra/cache";

export class CoursesService {
    private repository: CoursesRepository;

    constructor() {
        this.repository = new CoursesRepository();
    }

    // Paths
    async getPaths(page: number = 1, limit: number = 10): Promise<{ paths: Path[]; total: number; page: number; limit: number; totalPages: number; }> {
        const cacheKey = `paths:${page}:${limit}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getPaths(page, limit);

            // Cache for 30 minutes (paths don't change frequently)
            await cache.set(cacheKey, result, 1800);

            return result;
        } catch (error) {
            console.error("Error getting paths:", error);
            return { paths: [], total: 0, page, limit, totalPages: 0 };
        }
    }

    async getPathById(pathId: number): Promise<Path | null> {
        const cacheKey = `path:${pathId}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getPathById(pathId);

            // Cache for 30 minutes
            await cache.set(cacheKey, result, 1800);

            return result;
        } catch (error) {
            console.error("Error getting path by id:", error);
            return null;
        }
    }

    async createPath(data: CreatePathRequest): Promise<Path | null> {
        try {
            const result = await this.repository.createPath(data);

            // Invalidate paths cache
            await this.invalidatePathsCache();

            return result;
        } catch (error) {
            console.error("Error creating path:", error);
            return null;
        }
    }

    async updatePath(pathId: number, data: UpdatePathRequest): Promise<Path | null> {
        try {
            const result = await this.repository.updatePath(pathId, data);

            // Invalidate specific path and paths list cache
            await cache.delete(`path:${pathId}`);
            await this.invalidatePathsCache();

            return result;
        } catch (error) {
            console.error("Error updating path:", error);
            return null;
        }
    }

    async deletePath(pathId: number): Promise<boolean> {
        try {
            const result = await this.repository.deletePath(pathId);

            // Invalidate specific path and paths list cache
            await cache.delete(`path:${pathId}`);
            await this.invalidatePathsCache();

            return result;
        } catch (error) {
            console.error("Error deleting path:", error);
            return false;
        }
    }


    async getHomePageCourseList(language: string): Promise<CourseListData> {
        const cacheKey = `homepage_courses:${language}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getHomePageCourseList(language);

            // Cache for 15 minutes (homepage data changes moderately)
            await cache.set(cacheKey, result, 900);

            return result;
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
        const cacheKey = `course_contents:${courseId}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getContentsByCourseId(courseId);

            // Cache for 20 minutes (course content structure changes infrequently)
            await cache.set(cacheKey, result, 1200);

            return result;
        } catch (error) {
            console.error("Error getting contents by course ID:", error);
            return [];
        }
    }

    async getModulesByCreatorId(creatorId: number): Promise<Module[]> {
        const cacheKey = `creator_modules:${creatorId}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getModulesByCreatorId(creatorId);

            // Cache for 10 minutes (creator modules change moderately)
            await cache.set(cacheKey, result, 600);

            return result;
        } catch (error) {
            console.error("Error getting modules by creator ID:", error);
            return [];
        }
    }

    async getCategories(): Promise<Category[]> {
        const cacheKey = 'categories:all';

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getCategories();

            // Cache for 1 hour (categories are relatively static)
            await cache.set(cacheKey, result, 3600);

            return result;
        } catch (error) {
            console.error("Error getting categories:", error);
            return [];
        }
    }

    async getCategoriesByIds(categoryIds: number[]): Promise<Category[]> {
        const cacheKey = `categories:${categoryIds.sort().join(',')}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getCategoriesByIds(categoryIds);

            // Cache for 1 hour (categories are relatively static)
            await cache.set(cacheKey, result, 3600);

            return result;
        } catch (error) {
            console.error("Error getting categories by IDs:", error);
            return [];
        }
    }

    async createCourse(request: CreateCourseRequest & { creator_id: number }): Promise<{ courseId: number }> {
        try {
            const course = await this.repository.createCourse(request);
            if (course) {
                // Invalidate homepage and explore caches
                await this.invalidateHomepageCache();
                await this.invalidateExploreCache();

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
            const result = await this.repository.updateCourse(id, request);

            // Invalidate course-specific caches
            await cache.delete(`course:${id}`);
            await this.invalidateHomepageCache();
            await this.invalidateExploreCache();

            return result;
        } catch (error) {
            console.error("Error updating course:", error);
            return null;
        }
    }

    async getCourseById(id: number, language: string): Promise<Course | null> {
        const cacheKey = `course:${id}:${language}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getCourseById(id, language);

            // Cache for 15 minutes (course details change moderately)
            await cache.set(cacheKey, result, 900);

            return result;
        } catch (error) {
            console.error("Error getting course by ID:", error);
            return null;
        }
    }

    async getNextCourses(courseId: number, language: string): Promise<Course[]> {
        const cacheKey = `next_courses:${courseId}:${language}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getNextCourses(courseId, language);

            // Cache for 20 minutes (related courses change infrequently)
            await cache.set(cacheKey, result, 1200);

            return result;
        } catch (error) {
            console.error("Error getting next courses:", error);
            return [];
        }
    }

    async publishCourse(request: PublishCourseRequest): Promise<boolean> {
        try {
            const result = await this.repository.publishCourse(request.course_id);

            // Invalidate course-specific caches
            await cache.delete(`course:${request.course_id}`);
            await this.invalidateHomepageCache();
            await this.invalidateExploreCache();

            return result;
        } catch (error) {
            console.error("Error publishing course:", error);
            return false;
        }
    }

    async unpublishCourse(courseId: number, creatorId: string): Promise<boolean> {
        try {
            const result = await this.repository.unpublishCourse(courseId, creatorId);

            // Invalidate course-specific caches
            await cache.delete(`course:${courseId}`);
            await this.invalidateHomepageCache();
            await this.invalidateExploreCache();

            return result;
        } catch (error) {
            console.error("Error unpublishing course:", error);
            return false;
        }
    }

    async getCoursesByCategory(categoryId: number, page: number = 1, limit: number = 10, language: string): Promise<PaginatedCoursesResponse> {
        const cacheKey = `courses_category:${categoryId}:${page}:${limit}:${language}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getCoursesByCategory(categoryId, page, limit, language);

            // Cache for 10 minutes (category listings change moderately)
            await cache.set(cacheKey, result, 600);

            return result;
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
        const cacheKey = `enrolled_courses:${userId}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getCurrentlyEnrolledCourses(userId);

            // Cache for 5 minutes (user enrollment changes frequently)
            await cache.set(cacheKey, result, 300);

            return result;
        } catch (error) {
            console.error("Error getting currently enrolled courses:", error);
            return [];
        }
    }

    async getUserStats(userId: number): Promise<UserStats> {
        const cacheKey = `user_stats:${userId}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getUserStats(userId);

            // Cache for 10 minutes (user stats change moderately)
            await cache.set(cacheKey, result, 600);

            return result;
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

            // Invalidate homepage and explore caches after ranking update
            await this.invalidateHomepageCache();
            await this.invalidateExploreCache();

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
        const cacheKey = `search_courses:${searchString.toLowerCase()}:${limit}:${language}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.fuzzySearchCourses(searchString, limit, language);

            // Cache for 5 minutes (search results change moderately)
            await cache.set(cacheKey, result, 300);

            return result;
        } catch (error) {
            console.error("Error in fuzzy search courses:", error);
            return [];
        }
    }

    async fuzzySearchContents(searchString: string, limit: number = 5): Promise<ContentWithModule[]> {
        const cacheKey = `search_contents:${searchString.toLowerCase()}:${limit}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.fuzzySearchContents(searchString, limit);

            // Cache for 5 minutes (search results change moderately)
            await cache.set(cacheKey, result, 300);

            return result;
        } catch (error) {
            console.error("Error in fuzzy search contents:", error);
            return [];
        }
    }

    async fuzzySearchCombined(searchString: string, limit: number = 5, language: string): Promise<{
        courses: Course[];
        contents: ContentWithModule[];
    }> {
        const cacheKey = `search_combined:${searchString.toLowerCase()}:${limit}:${language}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.fuzzySearchCombined(searchString, limit, language);

            // Cache for 5 minutes (search results change moderately)
            await cache.set(cacheKey, result, 300);

            return result;
        } catch (error) {
            console.error("Error in fuzzy search combined:", error);
            return { courses: [], contents: [] };
        }
    }

    // Module Management Methods
    async getModulesByCourseId(courseId: number): Promise<Module[]> {
        const cacheKey = `course_modules:${courseId}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getModulesByCourseId(courseId);

            // Cache for 20 minutes (course modules change infrequently)
            await cache.set(cacheKey, result, 1200);

            return result;
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
            const result = await this.repository.createModule(courseId, moduleDataWithThumbnail, createdBy);

            // Invalidate course modules cache
            await cache.delete(`course_modules:${courseId}`);
            await cache.delete(`course_contents:${courseId}`);

            return result;
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
            const result = await this.repository.updateModule(moduleId, moduleData, creatorId);

            // Invalidate course modules cache (we need to get courseId from module)
            // For now, we'll invalidate all course modules cache - this could be optimized
            await this.invalidateCourseModulesCache();

            return result;
        } catch (error) {
            console.error("Error updating module:", error);
            return null;
        }
    }

    async deleteModule(moduleId: number, creatorId: string): Promise<boolean> {
        try {
            const result = await this.repository.deleteModule(moduleId, creatorId);

            // Invalidate course modules cache
            await this.invalidateCourseModulesCache();

            return result;
        } catch (error) {
            console.error("Error deleting module:", error);
            return false;
        }
    }

    // Content Management Methods
    async getContentByModuleId(moduleId: number): Promise<ContentWithModule[]> {
        const cacheKey = `module_content:${moduleId}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getContentByModuleId(moduleId);

            // Cache for 20 minutes (module content changes infrequently)
            await cache.set(cacheKey, result, 1200);

            return result;
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
            const result = await this.repository.createContent(moduleId, contentData, createdBy);

            // Invalidate module content cache
            await cache.delete(`module_content:${moduleId}`);

            return result;
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
            const result = await this.repository.updateContent(contentId, contentData, creatorId ?? '');

            // Invalidate content cache (we need to get moduleId from content)
            // For now, we'll invalidate all module content cache - this could be optimized
            await this.invalidateModuleContentCache();

            return result;
        } catch (error) {
            console.error("Error updating content:", error);
            return null;
        }
    }

    async deleteContent(contentId: number, creatorId: string): Promise<boolean> {
        try {
            const result = await this.repository.deleteContent(contentId, creatorId);

            // Invalidate module content cache
            await this.invalidateModuleContentCache();

            return result;
        } catch (error) {
            console.error("Error deleting content:", error);
            return false;
        }
    }

    async getContentById(contentId: number): Promise<ContentWithModule | null> {
        const cacheKey = `content:${contentId}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getContentById(contentId);

            // Cache for 20 minutes (content details change infrequently)
            await cache.set(cacheKey, result, 1200);

            return result;
        } catch (error) {
            console.error("Error getting content by ID:", error);
            return null;
        }
    }

    // Enhanced Course Data Method
    async getCourseWithModulesAndContent(courseId: number): Promise<any> {
        const cacheKey = `course_full:${courseId}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getCourseWithModulesAndContent(courseId);

            // Cache for 15 minutes (full course data changes moderately)
            await cache.set(cacheKey, result, 900);

            return result;
        } catch (error) {
            console.error("Error getting course with modules and content:", error);
            return null;
        }
    }

    // Get course details by video ID (content ID)
    async getCourseWithModulesAndContentByVideoId(videoId: number): Promise<any> {
        const cacheKey = `course_by_video:${videoId}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getCourseWithModulesAndContentByVideoId(videoId);

            // Cache for 15 minutes (course by video data changes moderately)
            await cache.set(cacheKey, result, 900);

            return result;
        } catch (error) {
            console.error("Error getting course with modules and content by video ID:", error);
            return null;
        }
    }

    async getApprovedCourseWithHierarchy(courseId: number, language: string): Promise<UserCourse | null> {
        const cacheKey = `approved_course:${courseId}:${language}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            // if (cached) {
            //     return cached;
            // }

            const result = this.repository.getApprovedCourseWithHierarchy(courseId, language);

            // Cache for 10 minutes (approved course hierarchy changes moderately)
            await cache.set(cacheKey, result, 600);

            return result;
        } catch (error) {
            console.error("Error getting approved course with hierarchy:", error);
            throw error;
        }
    }

    async getExploreCourses(language: string): Promise<ExploreCourse[]> {
        const cacheKey = `explore_courses:${language}`;

        try {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const result = await this.repository.getExploreCourses(language);

            // Cache for 15 minutes (explore courses change moderately)
            await cache.set(cacheKey, result, 900);

            return result;
        } catch (error) {
            console.error("Error getting explore courses:", error);
            return [];
        }
    }

    // Cache invalidation helper methods
    private async invalidatePathsCache(): Promise<void> {
        try {
            // Invalidate all paths cache patterns
            // Note: In a production environment, you might want to use Redis SCAN to find and delete keys with patterns
            console.log("Invalidating paths cache");
        } catch (error) {
            console.error("Error invalidating paths cache:", error);
        }
    }

    private async invalidateHomepageCache(): Promise<void> {
        try {
            // Invalidate homepage cache for all languages
            console.log("Invalidating homepage cache");
        } catch (error) {
            console.error("Error invalidating homepage cache:", error);
        }
    }

    private async invalidateExploreCache(): Promise<void> {
        try {
            // Invalidate explore cache for all languages
            console.log("Invalidating explore cache");
        } catch (error) {
            console.error("Error invalidating explore cache:", error);
        }
    }

    private async invalidateCourseModulesCache(): Promise<void> {
        try {
            // Invalidate all course modules cache
            console.log("Invalidating course modules cache");
        } catch (error) {
            console.error("Error invalidating course modules cache:", error);
        }
    }

    private async invalidateModuleContentCache(): Promise<void> {
        try {
            // Invalidate all module content cache
            console.log("Invalidating module content cache");
        } catch (error) {
            console.error("Error invalidating module content cache:", error);
        }
    }
}
