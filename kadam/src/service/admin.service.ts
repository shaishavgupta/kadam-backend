import { AdminRepository, UnapprovedCourse } from "../repository/admin.repository";
import { AdminConfigurations, AdminConfigurationRequest, AdminConfigurationResponse, DashboardData, Admin } from "../shared/types/admin.types";
import { UserRepository } from "../repository/users.repository";
import { CreatorRepository } from "../repository/creators.repository";
import { CoursesRepository } from "../repository/courses.repository";
import { PaginatedUsersResponse } from "../schemas/user";
import { PaginatedCreatorsResponse } from "../schemas/creator";
import { PaginatedCoursesResponse } from "../schemas/course";
import { CreateAdminRequest, CreateUserWithAuthRequest } from "../schemas/auth";
import { Language, PlanType } from "../shared/enums";
import jwt from 'jsonwebtoken';
import { authConfig } from '../config';
import { UserType as UserTypeEnum } from "../shared/enums";
import { cache } from "../infra/cache";
import { CACHE_KEYS, CACHE_TTL } from "../shared/constants/cache-keys";

export class AdminService {
    private adminRepository: AdminRepository;
    private userRepository: UserRepository;
    private creatorRepository: CreatorRepository;
    private coursesRepository: CoursesRepository;

    constructor() {
        this.adminRepository = new AdminRepository();
        this.userRepository = new UserRepository();
        this.creatorRepository = new CreatorRepository();
        this.coursesRepository = new CoursesRepository();
    }


    /**
     * Create a new admin user
     */
    async getAdminById(adminId: number): Promise<Admin & { created_at: Date; updated_at: Date; last_active_at?: Date; profile_pic?: string } | null> {
        const cacheKey = CACHE_KEYS.ADMIN.BY_ID(adminId);

        try {
            // Try to get from cache first
            const cachedAdmin = await cache.get(cacheKey);
            if (cachedAdmin) {
                return cachedAdmin;
            }

            // If not in cache, fetch from database
            const admin = await this.adminRepository.getAdminById(adminId);

            // Cache the result for 1 hour
            if (admin) {
                await cache.set(cacheKey, admin, CACHE_TTL.LONG);
            }

            return admin;
        } catch (error) {
            console.error("Error getting admin by ID:", error);
            return null;
        }
    }

    async getOrCreateAdmin(adminData: CreateAdminRequest): Promise<{ entity: Admin, newEntity: boolean }> {
        try {
            // First create the base user
            const userData: CreateUserWithAuthRequest = {
                email: adminData.email,
                name: adminData.name,
                phone: adminData.phone,
                plan_type: PlanType.PRO // Admins get PRO plan
            };

            const admin = await this.adminRepository.createAdmin(adminData);

            // Then create admin-specific data
            // Note: This would need to be implemented in AdminRepository
            // const admin = await this.adminRepository.createAdmin({
            //     user_id: user.id,
            //     role: adminData.role,
            //     permissions: adminData.permissions
            // });

            // Invalidate admin-related caches since we created a new admin
            await cache.delete(CACHE_KEYS.ADMIN.DASHBOARD_DATA);
            await cache.delete(CACHE_KEYS.USERS.ALL);

            return { entity: admin, newEntity: true };
        } catch (error) {
            console.error("Error creating admin user:", error);
            throw error;
        }
    }

    async getConfiguration(key: keyof typeof AdminConfigurations): Promise<AdminConfigurationResponse | null> {
        const cacheKey = CACHE_KEYS.CONFIG.BY_KEY(key);

        try {
            // Try to get from cache first
            const cachedConfig = await cache.get(cacheKey);
            if (cachedConfig) {
                return cachedConfig;
            }

            // If not in cache, fetch from database
            const config = await this.adminRepository.getAdminConfigurations(key);

            // Cache the result for 30 minutes
            if (config) {
                await cache.set(cacheKey, config, CACHE_TTL.MEDIUM);
            }

            return config;
        } catch (error) {
            console.error("Error getting configuration:", error);
            return null;
        }
    }

    async setConfiguration(config: AdminConfigurationRequest): Promise<AdminConfigurationResponse | null> {
        try {
            const result = await this.adminRepository.setAdminConfigurations(config);

            // Invalidate related cache
            const cacheKey = CACHE_KEYS.CONFIG.BY_KEY(config.key);
            await cache.delete(cacheKey);

            return result;
        } catch (error) {
            console.error("Error setting configuration:", error);
            return null;
        }
    }

    async logActivity(activityData: any): Promise<boolean> {
        try {
            const result = await this.adminRepository.logAdminActivity(activityData);

            // Invalidate activities cache
            await cache.delete(CACHE_KEYS.ADMIN.ACTIVITIES_ALL);

            return result;
        } catch (error) {
            console.error("Error logging activity:", error);
            return false;
        }
    }

    async getActivities(page: number = 1, limit: number = 10): Promise<any[]> { // Assuming a type for activities is not defined yet
        const cacheKey = CACHE_KEYS.ADMIN.ACTIVITIES(page, limit);

        try {
            // Try to get from cache first
            const cachedActivities = await cache.get(cacheKey);
            if (cachedActivities) {
                return cachedActivities;
            }

            // If not in cache, fetch from database
            const activities = await this.adminRepository.getAdminActivities(page, limit);

            // Cache the result for 10 minutes
            await cache.set(cacheKey, activities, CACHE_TTL.VERY_SHORT);

            return activities;
        } catch (error) {
            console.error("Error getting activities:", error);
            return [];
        }
    }

    async getDashboardData(): Promise<DashboardData> {
        const cacheKey = CACHE_KEYS.ADMIN.DASHBOARD_DATA;

        try {
            // Try to get from cache first
            const cachedData = await cache.get(cacheKey);
            if (cachedData) {
                return cachedData;
            }

            // This is a placeholder. You should implement the logic to get the actual data.
            const dashboardData = {
                totalUsers: 0,
                totalCreators: 0,
                totalCourses: 0,
                totalRevenue: 0
            };

            // Cache the result for 15 minutes
            await cache.set(cacheKey, dashboardData, CACHE_TTL.SHORT);

            return dashboardData;
        } catch (error) {
            console.error("Error getting dashboard data:", error);
            return {
                totalUsers: 0,
                totalCreators: 0,
                totalCourses: 0,
                totalRevenue: 0
            };
        }
    }

    async getUsers(page: number, limit: number): Promise<PaginatedUsersResponse> {
        const cacheKey = CACHE_KEYS.USERS.PAGINATED(page, limit);

        try {
            // Try to get from cache first
            const cachedUsers = await cache.get(cacheKey);
            if (cachedUsers) {
                return cachedUsers;
            }

            // If not in cache, fetch from database
            const users = await this.userRepository.getAllUsers(page, limit);

            // Cache the result for 5 minutes
            await cache.set(cacheKey, users, CACHE_TTL.QUICK);

            return users;
        } catch (error) {
            console.error("Error getting users:", error);
            throw error;
        }
    }

    async deleteUser(userId: number, adminId: number): Promise<boolean> {
        try {
            await this.userRepository.deleteUser(userId);

            // Invalidate users cache
            await cache.delete(CACHE_KEYS.USERS.ALL);
            // Also invalidate dashboard data as user count changes
            await cache.delete(CACHE_KEYS.ADMIN.DASHBOARD_DATA);

            return true;
        } catch (error) {
            console.error("Error deleting user:", error);
            return false;
        }
    }

    async getCreators(page: number, limit: number): Promise<PaginatedCreatorsResponse> {
        const cacheKey = CACHE_KEYS.CREATORS.PAGINATED(page, limit);

        try {
            // Try to get from cache first
            const cachedCreators = await cache.get(cacheKey);
            if (cachedCreators) {
                return cachedCreators;
            }

            // If not in cache, fetch from database
            const creators = await this.creatorRepository.getAllCreators(page, limit);

            // Cache the result for 5 minutes
            await cache.set(cacheKey, creators, CACHE_TTL.QUICK);

            return creators;
        } catch (error) {
            console.error("Error getting creators:", error);
            throw error;
        }
    }

    async deleteCreator(creatorId: number, adminId: number): Promise<boolean> {
        try {
            await this.creatorRepository.deleteCreator(creatorId);

            // Invalidate creators cache
            await cache.delete(CACHE_KEYS.CREATORS.ALL);
            // Also invalidate dashboard data as creator count changes
            await cache.delete(CACHE_KEYS.ADMIN.DASHBOARD_DATA);

            return true;
        } catch (error) {
            console.error("Error deleting creator:", error);
            return false;
        }
    }

    async getCourses(page: number, limit: number, rejected?: boolean, published?: boolean): Promise<any> {
        const cacheKey = CACHE_KEYS.COURSES.PAGINATED(page, limit, rejected, published);

        try {
            // Try to get from cache first
            const cachedCourses = await cache.get(cacheKey);
            if (cachedCourses) {
                return cachedCourses;
            }

            // If not in cache, fetch from database
            // Always return courses with hierarchical structure matching the given filters
            const courses = await this.adminRepository.getCoursesWithHierarchy(page, limit, rejected, published);

            // Cache the result for 5 minutes
            await cache.set(cacheKey, courses, CACHE_TTL.QUICK);

            return courses;
        } catch (error) {
            console.error("Error getting courses:", error);
            throw error;
        }
    }

    // Enhanced Admin Authentication
    async authenticateAdmin(email: string, password: string): Promise<{ admin: Admin; jwtToken: string } | null> {
        try {
            const admin = await this.adminRepository.authenticateAdmin(email, password);
            if (!admin) {
                return null;
            }

            // Generate JWT token for session management
            const jwtToken = jwt.sign(
                { sub: admin.id, userType: UserTypeEnum.ADMIN, language: Language.ENGLISH },
                authConfig.JWT_SECRET,
                { expiresIn: '24h' }
            );

            return {
                admin,
                jwtToken
            };
        } catch (error) {
            console.error("Error authenticating admin:", error);
            return null;
        }
    }

    // Course Management
    async getUnapprovedCourses(page: number = 1, limit: number = 10): Promise<{
        courses: UnapprovedCourse[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const cacheKey = CACHE_KEYS.COURSES.UNAPPROVED(page, limit);

        try {
            // Try to get from cache first
            const cachedCourses = await cache.get(cacheKey);
            if (cachedCourses) {
                return cachedCourses;
            }

            // If not in cache, fetch from database
            const result = await this.adminRepository.getUnapprovedCourses(page, limit);

            // Cache the result for 2 minutes
            await cache.set(cacheKey, result, CACHE_TTL.IMMEDIATE);

            return result;
        } catch (error) {
            console.error("Error getting unapproved courses:", error);
            return {
                courses: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            };
        }
    }

    async getAvailableCourses(): Promise<Array<{
        id: number;
        name: string;
        creator_published_at?: Date;
        approved_at?: Date;
        rejected_at?: Date;
    }>> {
        const cacheKey = CACHE_KEYS.COURSES.AVAILABLE;

        try {
            // Try to get from cache first
            const cachedCourses = await cache.get(cacheKey);
            if (cachedCourses) {
                return cachedCourses;
            }

            // If not in cache, fetch from database
            const courses = await this.adminRepository.getAvailableCourses();

            // Cache the result for 3 minutes
            await cache.set(cacheKey, courses, CACHE_TTL.FAST);

            return courses;
        } catch (error) {
            console.error("Error getting available courses:", error);
            return [];
        }
    }

    async getCourseStatus(courseId: number): Promise<{
        exists: boolean;
        name?: string;
        creator_published_at?: Date;
        approved_at?: Date;
        rejected_at?: Date;
        canBeApproved: boolean;
        reason?: string;
    }> {
        const cacheKey = CACHE_KEYS.COURSES.STATUS(courseId);

        try {
            // Try to get from cache first
            const cachedStatus = await cache.get(cacheKey);
            if (cachedStatus) {
                return cachedStatus;
            }

            // If not in cache, fetch from database
            const status = await this.adminRepository.getCourseStatus(courseId);

            // Cache the result for 1 minute
            await cache.set(cacheKey, status, CACHE_TTL.INSTANT);

            return status;
        } catch (error) {
            console.error("Error getting course status:", error);
            return {
                exists: false,
                canBeApproved: false,
                reason: 'Service error'
            };
        }
    }

    async approveCourse(courseId: number, adminId: number): Promise<boolean> {
        try {
            const result = await this.adminRepository.approveCourse(courseId, adminId);

            if (result) {
                // Invalidate related caches
                await cache.delete(CACHE_KEYS.COURSES.STATUS(courseId));
                await cache.delete(CACHE_KEYS.COURSES.DETAILS(courseId));
                await cache.delete(CACHE_KEYS.COURSES.MODULES_CONTENT(courseId));
                await cache.delete(CACHE_KEYS.COURSES.UNAPPROVED_ALL);
                await cache.delete(CACHE_KEYS.COURSES.AVAILABLE);
                await cache.delete(CACHE_KEYS.COURSES.ALL);
                await cache.delete(CACHE_KEYS.COURSES.APPROVAL_STATS);
            }

            return result;
        } catch (error) {
            console.error("Error approving course:", error);
            return false;
        }
    }

    async rejectCourse(courseId: number, adminId: number, reason: string): Promise<boolean> {
        try {
            const result = await this.adminRepository.rejectCourse(courseId, adminId, reason);

            if (result) {
                // Invalidate related caches
                await cache.delete(CACHE_KEYS.COURSES.STATUS(courseId));
                await cache.delete(CACHE_KEYS.COURSES.DETAILS(courseId));
                await cache.delete(CACHE_KEYS.COURSES.MODULES_CONTENT(courseId));
                await cache.delete(CACHE_KEYS.COURSES.UNAPPROVED_ALL);
                await cache.delete(CACHE_KEYS.COURSES.AVAILABLE);
                await cache.delete(CACHE_KEYS.COURSES.ALL);
                await cache.delete(CACHE_KEYS.COURSES.APPROVAL_STATS);
            }

            return result;
        } catch (error) {
            console.error("Error rejecting course:", error);
            return false;
        }
    }

    async rejectModule(moduleId: number, adminId: number, reason: string): Promise<boolean> {
        try {
            const result = await this.adminRepository.rejectModule(moduleId, adminId, reason);

            if (result) {
                // Invalidate related caches
                await cache.delete(CACHE_KEYS.COURSES.ALL);
                await cache.delete(CACHE_KEYS.COURSES.UNAPPROVED_ALL);
                await cache.delete(CACHE_KEYS.COURSES.AVAILABLE);
                await cache.delete('admin_course_approval_stats');
            }

            return result;
        } catch (error) {
            console.error("Error rejecting module:", error);
            return false;
        }
    }

    async rejectContent(contentId: number, adminId: number, reason: string): Promise<boolean> {
        try {
            const result = await this.adminRepository.rejectContent(contentId, adminId, reason);

            if (result) {
                // Invalidate related caches
                await cache.delete(CACHE_KEYS.COURSES.ALL);
                await cache.delete(CACHE_KEYS.COURSES.UNAPPROVED_ALL);
                await cache.delete(CACHE_KEYS.COURSES.AVAILABLE);
                await cache.delete('admin_course_approval_stats');
            }

            return result;
        } catch (error) {
            console.error("Error rejecting content:", error);
            return false;
        }
    }

    // Unified reject method for course, module, or content
    async rejectItem(type: 'course' | 'module' | 'content', id: number, adminId: number, reason: string): Promise<{
        success: boolean;
        message: string;
        cascadedUpdates?: {
            courseUpdated?: boolean;
            moduleUpdated?: boolean;
            contentUpdated?: boolean;
        };
    }> {
        try {
            console.log(`Attempting to reject ${type} with ID ${id}, adminId: ${adminId}, reason: ${reason}`);

            let result: any;

            switch (type) {
                case 'course':
                    const courseSuccess = await this.adminRepository.rejectCourse(id, adminId, reason);
                    console.log(`Course rejection result: ${courseSuccess}`);
                    result = {
                        success: courseSuccess,
                        message: courseSuccess ? 'Course rejected successfully' : 'Course not found or already processed',
                        cascadedUpdates: {
                            courseUpdated: courseSuccess
                        }
                    };
                    break;

                case 'module':
                    const moduleResult = await this.adminRepository.rejectModuleWithCascade(id, adminId, reason);
                    console.log(`Module rejection result:`, moduleResult);
                    result = {
                        success: moduleResult.success,
                        message: moduleResult.success ? 'Module rejected successfully (course also rejected)' : 'Module not found or already processed',
                        cascadedUpdates: {
                            moduleUpdated: moduleResult.success,
                            courseUpdated: moduleResult.courseUpdated
                        }
                    };
                    break;

                case 'content':
                    const contentResult = await this.adminRepository.rejectContentWithCascade(id, adminId, reason);
                    console.log(`Content rejection result:`, contentResult);
                    result = {
                        success: contentResult.success,
                        message: contentResult.success ? 'Content rejected successfully (module and course also rejected)' : 'Content not found or already processed',
                        cascadedUpdates: {
                            contentUpdated: contentResult.success,
                            moduleUpdated: contentResult.moduleUpdated,
                            courseUpdated: contentResult.courseUpdated
                        }
                    };
                    break;

                default:
                    result = {
                        success: false,
                        message: 'Invalid rejection type'
                    };
            }

            // Invalidate related caches if operation was successful
            if (result.success) {
                await cache.delete(CACHE_KEYS.COURSES.ALL);
                await cache.delete(CACHE_KEYS.COURSES.UNAPPROVED_ALL);
                await cache.delete(CACHE_KEYS.COURSES.AVAILABLE);
                await cache.delete('admin_course_approval_stats');

                if (type === 'course') {
                    await cache.delete(CACHE_KEYS.COURSES.STATUS(id));
                    await cache.delete(CACHE_KEYS.COURSES.DETAILS(id));
                    await cache.delete(CACHE_KEYS.COURSES.MODULES_CONTENT(id));
                }
            }

            return result;
        } catch (error) {
            console.error(`Error rejecting ${type}:`, error);
            return {
                success: false,
                message: `Error rejecting ${type}`
            };
        }
    }

    // Video Management
    async saveVideoMetadata(
        courseId: number,
        videos: Array<{
            name: string;
            description?: string;
            url: string;
            abs_url?: string;
            position: number;
            is_paid: boolean;
            is_active: boolean;
            duration?: number;
            thumbnail_url?: string;
            module_name?: string;
        }>,
        adminId: number
    ): Promise<any[]> {
        try {
            const result = await this.adminRepository.saveVideoMetadata(courseId, videos, adminId);

            // Invalidate related caches
            await cache.delete(CACHE_KEYS.COURSES.DETAILS(courseId));
            await cache.delete(CACHE_KEYS.COURSES.MODULES_CONTENT(courseId));
            await cache.delete(CACHE_KEYS.COURSES.ALL);

            return result;
        } catch (error) {
            console.error("Error saving video metadata:", error);
            throw error;
        }
    }

    async reorderVideos(courseId: number, videoIds: number[], adminId: number): Promise<any[]> {
        try {
            const result = await this.adminRepository.reorderVideos(courseId, videoIds, adminId);

            // Invalidate related caches
            await cache.delete(CACHE_KEYS.COURSES.DETAILS(courseId));
            await cache.delete(CACHE_KEYS.COURSES.MODULES_CONTENT(courseId));
            await cache.delete(CACHE_KEYS.COURSES.ALL);

            return result;
        } catch (error) {
            console.error("Error reordering videos:", error);
            throw error;
        }
    }

    async reorderContents(moduleId: number, contentIds: number[], adminId: number): Promise<any[]> {
        try {
            const result = await this.adminRepository.reorderContents(moduleId, contentIds, adminId);

            // Invalidate related caches
            await cache.delete(CACHE_KEYS.COURSES.ALL);
            await cache.delete(CACHE_KEYS.COURSES.MODULES_CONTENT_ALL);

            return result;
        } catch (error) {
            console.error("Error reordering contents:", error);
            throw error;
        }
    }

    async softDeleteVideo(videoId: number, adminId: number): Promise<boolean> {
        try {
            const result = await this.adminRepository.softDeleteVideo(videoId, adminId);

            if (result) {
                // Invalidate related caches
                await cache.delete(CACHE_KEYS.COURSES.ALL);
                await cache.delete(CACHE_KEYS.COURSES.MODULES_CONTENT_ALL);
            }

            return result;
        } catch (error) {
            console.error("Error soft deleting video:", error);
            return false;
        }
    }


    // Analytics
    async getCourseApprovalStats(): Promise<any> {
        const cacheKey = 'admin_course_approval_stats';

        try {
            // Try to get from cache first
            const cachedStats = await cache.get(cacheKey);
            if (cachedStats) {
                return cachedStats;
            }

            // If not in cache, fetch from database
            const stats = await this.adminRepository.getCourseApprovalStats();

            // Cache the result for 10 minutes (600 seconds)
            await cache.set(cacheKey, stats, 600);

            return stats;
        } catch (error) {
            console.error("Error getting course approval stats:", error);
            return {
                total_courses: 0,
                approved_courses: 0,
                rejected_courses: 0,
                pending_courses: 0,
                approval_rate_percentage: 0
            };
        }
    }

    async getCourseDetails(courseId: number): Promise<any> {
        const cacheKey = CACHE_KEYS.COURSES.DETAILS(courseId);

        try {
            // Try to get from cache first
            const cachedDetails = await cache.get(cacheKey);
            if (cachedDetails) {
                return cachedDetails;
            }

            // If not in cache, fetch from database
            const details = await this.adminRepository.getCourseDetails(courseId);

            // Cache the result for 5 minutes (300 seconds)
            if (details) {
                await cache.set(cacheKey, details, 300);
            }

            return details;
        } catch (error) {
            console.error("Error getting course details:", error);
            return null;
        }
    }

    // Create contents for a module
    async createContents(courseId: number, videos: Array<{
        title: string;
        description?: string;
        duration?: number;
        position: number;
        is_paid: boolean;
        is_active: boolean;
        module_id?: number;
        url: string;
        abs_url?: string;
        thumbnail_url?: string;
    }>, adminId: number): Promise<Array<any>> {
        try {
            const result = await this.adminRepository.createContents(courseId, videos, adminId);

            // Invalidate related caches
            await cache.delete(CACHE_KEYS.COURSES.DETAILS(courseId));
            await cache.delete(CACHE_KEYS.COURSES.MODULES_CONTENT(courseId));
            await cache.delete(CACHE_KEYS.COURSES.ALL);

            return result;
        } catch (error) {
            console.error("Error creating contents:", error);
            throw error;
        }
    }

    // Get course with modules and content
    async getCourseWithModulesAndContent(courseId: number): Promise<any> {
        const cacheKey = CACHE_KEYS.COURSES.MODULES_CONTENT(courseId);

        try {
            // Try to get from cache first
            const cachedCourse = await cache.get(cacheKey);
            if (cachedCourse) {
                return cachedCourse;
            }

            // If not in cache, fetch from database
            const course = await this.adminRepository.getCourseWithModulesAndContent(courseId);

            // Cache the result for 3 minutes (180 seconds)
            if (course) {
                await cache.set(cacheKey, course, 180);
            }

            return course;
        } catch (error) {
            console.error("Error getting course with modules and content:", error);
            return null;
        }
    }

    // Individual module approval
    async approveModule(moduleId: number, adminId: number): Promise<boolean> {
        try {
            const result = await this.adminRepository.approveModule(moduleId, adminId);

            if (result) {
                // Invalidate related caches
                await cache.delete(CACHE_KEYS.COURSES.ALL);
                await cache.delete(CACHE_KEYS.COURSES.MODULES_CONTENT_ALL);
                await cache.delete('admin_course_approval_stats');
            }

            return result;
        } catch (error) {
            console.error("Error approving module:", error);
            return false;
        }
    }

    // Individual content approval
    async approveContent(contentId: number, adminId: number): Promise<boolean> {
        try {
            const result = await this.adminRepository.approveContent(contentId, adminId);

            if (result) {
                // Invalidate related caches
                await cache.delete(CACHE_KEYS.COURSES.ALL);
                await cache.delete(CACHE_KEYS.COURSES.MODULES_CONTENT_ALL);
                await cache.delete('admin_course_approval_stats');
            }

            return result;
        } catch (error) {
            console.error("Error approving content:", error);
            return false;
        }
    }

    // Helper function to generate S3 URLs in new hierarchical structure
    generateS3Urls(courseId: number, moduleId: number, contentId: number, fileName: string): {
        videoUrl: string;
        thumbnailUrl: string;
    } {
        const bucket = process.env.AWS_S3_COURSES_BUCKET || 'kadam-courses';
        const videoUrl = `s3://${bucket}/RawVideos/${courseId}/${moduleId}/${contentId}/Video.${fileName.split('.').pop()}`;
        const thumbnailUrl = `s3://${bucket}/RawVideos/${courseId}/${moduleId}/${contentId}/Thumbnail.${fileName.split('.').pop()}`;

        return { videoUrl, thumbnailUrl };
    }

    // Cache invalidation helper methods
    private async invalidateActivitiesCache(): Promise<void> {
        try {
            // Invalidate all admin activities cache patterns
            await cache.delete(CACHE_KEYS.ADMIN.ACTIVITIES_ALL);
            console.log("Invalidated admin activities cache");
        } catch (error) {
            console.error("Error invalidating activities cache:", error);
        }
    }

    private async invalidateUsersCache(): Promise<void> {
        try {
            // Invalidate all users cache patterns
            await cache.delete(CACHE_KEYS.USERS.ALL);
            console.log("Invalidated admin users cache");
        } catch (error) {
            console.error("Error invalidating users cache:", error);
        }
    }

    private async invalidateCreatorsCache(): Promise<void> {
        try {
            // Invalidate all creators cache patterns
            await cache.delete(CACHE_KEYS.CREATORS.ALL);
            console.log("Invalidated admin creators cache");
        } catch (error) {
            console.error("Error invalidating creators cache:", error);
        }
    }

    private async invalidateCoursesCache(): Promise<void> {
        try {
            // Invalidate all courses cache patterns
            await cache.delete(CACHE_KEYS.COURSES.ALL);
            await cache.delete(CACHE_KEYS.COURSES.UNAPPROVED_ALL);
            await cache.delete('admin_available_courses');
            await cache.delete('admin_course_approval_stats');
            console.log("Invalidated admin courses cache");
        } catch (error) {
            console.error("Error invalidating courses cache:", error);
        }
    }

    async deleteCourse(courseId: number, adminId: number): Promise<{
        success: boolean;
        cascadedDeletes?: {
            modulesDeleted: number;
            contentsDeleted: number;
            enrollmentsDeleted: number;
        };
        message?: string;
    }> {
        try {
            console.log(`Admin ${adminId} attempting to delete course ${courseId}`);

            const result = await this.adminRepository.deleteCourse(courseId, adminId);

            if (result.success) {
                console.log(`Successfully deleted course ${courseId} via admin service`);

                // Invalidate related caches
                await cache.delete(CACHE_KEYS.COURSES.STATUS(courseId));
                await cache.delete(CACHE_KEYS.COURSES.DETAILS(courseId));
                await cache.delete(CACHE_KEYS.COURSES.MODULES_CONTENT(courseId));
                await cache.delete(CACHE_KEYS.COURSES.UNAPPROVED_ALL);
                await cache.delete(CACHE_KEYS.COURSES.AVAILABLE);
                await cache.delete(CACHE_KEYS.COURSES.ALL);
                await cache.delete('admin_course_approval_stats');
            } else {
                console.log(`Failed to delete course ${courseId}: ${result.message}`);
            }

            return result;
        } catch (error) {
            console.error("Error in admin service deleteCourse:", error);
            return {
                success: false,
                message: 'Service error occurred while deleting course'
            };
        }
    }

    /**
     * Cache invalidation methods for course-related data
     */

    /**
     * Invalidate all course-related cache entries
     */
    async invalidateCourseCache(courseId: number): Promise<void> {
        try {
            const patterns = [
                `course:${courseId}:*`,           // Course by ID with language
                `course_full:${courseId}`,        // Full course data
                `course_modules:${courseId}`,    // Course modules
                `course_contents:${courseId}`,   // Course contents
                `course_modules_content:${courseId}`, // Course with modules and content
                `admin_course_details:${courseId}`,   // Admin course details
                `admin_course_modules_content:${courseId}`, // Admin course modules content
                `admin_course_status:${courseId}`,    // Admin course status
            ];

            // Delete specific keys and patterns
            for (const pattern of patterns) {
                if (pattern.includes('*')) {
                    await cache.deletePattern(pattern);
                } else {
                    await cache.delete(pattern);
                }
            }

            // Invalidate related cache patterns
            await this.invalidateCourseListCache();
            await this.invalidateHomePageCache();
            await this.invalidateExploreCache();
            await this.invalidateAdminCoursesCache();

            console.log(`Cache invalidated for course ${courseId}`);
        } catch (error) {
            console.error(`Error invalidating cache for course ${courseId}:`, error);
        }
    }

    /**
     * Invalidate module-related cache entries
     */
    async invalidateModuleCache(moduleId: number, courseId?: number): Promise<void> {
        try {
            const patterns = [
                `module_content:${moduleId}`,    // Module content
            ];

            // Add course-specific patterns if courseId is provided
            if (courseId) {
                patterns.push(`course_modules:${courseId}`);    // Course modules
            }

            // Delete specific keys and patterns
            for (const pattern of patterns) {
                if (pattern.includes('*')) {
                    await cache.deletePattern(pattern);
                } else {
                    await cache.delete(pattern);
                }
            }

            // If courseId is provided, also invalidate course cache
            if (courseId) {
                await this.invalidateCourseCache(courseId);
            }

            console.log(`Cache invalidated for module ${moduleId}`);
        } catch (error) {
            console.error(`Error invalidating cache for module ${moduleId}:`, error);
        }
    }

    /**
     * Invalidate content-related cache entries
     */
    async invalidateContentCache(contentId: number, moduleId?: number, courseId?: number): Promise<void> {
        try {
            const patterns = [
                `content:${contentId}`,          // Content by ID
            ];

            // Add module-specific patterns if moduleId is provided
            if (moduleId) {
                patterns.push(`module_content:${moduleId}`);     // Module content
            }

            // Add course-specific patterns if courseId is provided
            if (courseId) {
                patterns.push(`course_contents:${courseId}`);    // Course contents
            }

            // Delete specific keys and patterns
            for (const pattern of patterns) {
                if (pattern.includes('*')) {
                    await cache.deletePattern(pattern);
                } else {
                    await cache.delete(pattern);
                }
            }

            // If moduleId is provided, invalidate module cache
            if (moduleId) {
                await this.invalidateModuleCache(moduleId, courseId);
            }

            console.log(`Cache invalidated for content ${contentId}`);
        } catch (error) {
            console.error(`Error invalidating cache for content ${contentId}:`, error);
        }
    }

    /**
     * Invalidate course list cache (home page, explore, etc.)
     */
    async invalidateCourseListCache(): Promise<void> {
        try {
            const patterns = [
                'home_page_courses:*',           // Home page courses
                'explore_courses:*',             // Explore courses
                'course_list:*',                 // Course lists
                'next_courses:*',                // Next courses
                'courses_by_category:*',         // Courses by category
                'currently_enrolled:*',          // Currently enrolled courses
                'user_stats:*',                  // User statistics
            ];

            // Delete pattern-based keys
            for (const pattern of patterns) {
                await cache.deletePattern(pattern);
            }

            console.log('Course list cache invalidated');
        } catch (error) {
            console.error('Error invalidating course list cache:', error);
        }
    }

    /**
     * Invalidate home page cache
     */
    async invalidateHomePageCache(): Promise<void> {
        try {
            const patterns = [
                'home_page_courses:*',
                'keep_watching:*',
                'for_you:*',
                'top_10:*',
                'latest:*',
            ];

            for (const pattern of patterns) {
                await cache.deletePattern(pattern);
            }

            console.log('Home page cache invalidated');
        } catch (error) {
            console.error('Error invalidating home page cache:', error);
        }
    }

    /**
     * Invalidate explore cache
     */
    async invalidateExploreCache(): Promise<void> {
        try {
            const patterns = [
                'explore_courses:*',
                'explore:*',
            ];

            for (const pattern of patterns) {
                await cache.deletePattern(pattern);
            }

            console.log('Explore cache invalidated');
        } catch (error) {
            console.error('Error invalidating explore cache:', error);
        }
    }

    /**
     * Invalidate admin courses cache
     */
    async invalidateAdminCoursesCache(): Promise<void> {
        try {
            const patterns = [
                'admin_courses:*',
                'admin_unapproved_courses:*',
                'admin_available_courses',
                'admin_course_approval_stats',
            ];

            for (const pattern of patterns) {
                if (pattern.includes('*')) {
                    await cache.deletePattern(pattern);
                } else {
                    await cache.delete(pattern);
                }
            }

            console.log('Admin courses cache invalidated');
        } catch (error) {
            console.error('Error invalidating admin courses cache:', error);
        }
    }

    /**
     * Invalidate thumbnail-related cache
     */
    async invalidateThumbnailCache(courseId: number, moduleId?: number, contentId?: number): Promise<void> {
        try {
            // Invalidate course cache as thumbnails are part of course data
            await this.invalidateCourseCache(courseId);

            // Also invalidate related caches
            await this.invalidateCourseListCache();
            await this.invalidateHomePageCache();

            console.log(`Thumbnail cache invalidated for course ${courseId}`);
        } catch (error) {
            console.error(`Error invalidating thumbnail cache for course ${courseId}:`, error);
        }
    }
}
