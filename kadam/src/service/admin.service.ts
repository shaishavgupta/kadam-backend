import { AdminRepository, UnapprovedCourse } from "../repository/admin.repository";
import { AdminConfigurations, AdminConfigurationRequest, AdminConfigurationResponse, DashboardData, Admin } from "../shared/types/admin.types";
import { UserRepository } from "../repository/users.repository";
import { CreatorRepository } from "../repository/creators.repository";
import { CoursesRepository } from "../repository/courses.repository";
import { PaginatedUsersResponse } from "../shared/types/users.types";
import { PaginatedCreatorsResponse } from "../shared/types/creators.types";
import { PaginatedCoursesResponse } from "../shared/types/courses.types";
import { CreateAdminRequest, CreateUserWithAuthRequest } from "../schemas/auth";
import { PlanType } from "../shared/enums";
import jwt from 'jsonwebtoken';
import { authConfig } from '../config';
import { UserType as UserTypeEnum } from "../shared/enums";

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
        try {
            return await this.adminRepository.getAdminById(adminId);
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

            return { entity: admin, newEntity: true };
        } catch (error) {
            console.error("Error creating admin user:", error);
            throw error;
        }
    }

    async getConfiguration(key: keyof typeof AdminConfigurations): Promise<AdminConfigurationResponse | null> {
        try {
            return await this.adminRepository.getAdminConfigurations(key);
        } catch (error) {
            console.error("Error getting configuration:", error);
            return null;
        }
    }

    async setConfiguration(config: AdminConfigurationRequest): Promise<AdminConfigurationResponse | null> {
        try {
            return await this.adminRepository.setAdminConfigurations(config);
        } catch (error) {
            console.error("Error setting configuration:", error);
            return null;
        }
    }

    async logActivity(activityData: any): Promise<boolean> {
        try {
            return await this.adminRepository.logAdminActivity(activityData);
        } catch (error) {
            console.error("Error logging activity:", error);
            return false;
        }
    }

    async getActivities(page: number = 1, limit: number = 10): Promise<any[]> { // Assuming a type for activities is not defined yet
        try {
            return await this.adminRepository.getAdminActivities(page, limit);
        } catch (error) {
            console.error("Error getting activities:", error);
            return [];
        }
    }

    async getDashboardData(): Promise<DashboardData> {
        // This is a placeholder. You should implement the logic to get the actual data.
        return {
            totalUsers: 0,
            totalCreators: 0,
            totalCourses: 0,
            totalRevenue: 0
        };
    }

    async getUsers(page: number, limit: number): Promise<PaginatedUsersResponse> {
        return this.userRepository.getAllUsers(page, limit);
    }

    async getCreators(page: number, limit: number): Promise<PaginatedCreatorsResponse> {
        return this.creatorRepository.getAllCreators(page, limit);
    }

    async getCourses(page: number, limit: number, rejected?: boolean, published?: boolean): Promise<any> {
        // Always return courses with hierarchical structure matching the given filters
        return this.adminRepository.getCoursesWithHierarchy(page, limit, rejected, published);
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
                { sub: admin.id, userType: UserTypeEnum.ADMIN },
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
        try {
            return await this.adminRepository.getUnapprovedCourses(page, limit);
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
        try {
            return await this.adminRepository.getAvailableCourses();
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
        try {
            return await this.adminRepository.getCourseStatus(courseId);
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
            return await this.adminRepository.approveCourse(courseId, adminId);
        } catch (error) {
            console.error("Error approving course:", error);
            return false;
        }
    }

    async rejectCourse(courseId: number, adminId: number, reason: string): Promise<boolean> {
        try {
            return await this.adminRepository.rejectCourse(courseId, adminId, reason);
        } catch (error) {
            console.error("Error rejecting course:", error);
            return false;
        }
    }

    async rejectModule(moduleId: number, adminId: number, reason: string): Promise<boolean> {
        try {
            return await this.adminRepository.rejectModule(moduleId, adminId, reason);
        } catch (error) {
            console.error("Error rejecting module:", error);
            return false;
        }
    }

    async rejectContent(contentId: number, adminId: number, reason: string): Promise<boolean> {
        try {
            return await this.adminRepository.rejectContent(contentId, adminId, reason);
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

            switch (type) {
                case 'course':
                    const courseSuccess = await this.adminRepository.rejectCourse(id, adminId, reason);
                    console.log(`Course rejection result: ${courseSuccess}`);
                    return {
                        success: courseSuccess,
                        message: courseSuccess ? 'Course rejected successfully' : 'Course not found or already processed',
                        cascadedUpdates: {
                            courseUpdated: courseSuccess
                        }
                    };

                case 'module':
                    const moduleResult = await this.adminRepository.rejectModuleWithCascade(id, adminId, reason);
                    console.log(`Module rejection result:`, moduleResult);
                    return {
                        success: moduleResult.success,
                        message: moduleResult.success ? 'Module rejected successfully (course also rejected)' : 'Module not found or already processed',
                        cascadedUpdates: {
                            moduleUpdated: moduleResult.success,
                            courseUpdated: moduleResult.courseUpdated
                        }
                    };

                case 'content':
                    const contentResult = await this.adminRepository.rejectContentWithCascade(id, adminId, reason);
                    console.log(`Content rejection result:`, contentResult);
                    return {
                        success: contentResult.success,
                        message: contentResult.success ? 'Content rejected successfully (module and course also rejected)' : 'Content not found or already processed',
                        cascadedUpdates: {
                            contentUpdated: contentResult.success,
                            moduleUpdated: contentResult.moduleUpdated,
                            courseUpdated: contentResult.courseUpdated
                        }
                    };

                default:
                    return {
                        success: false,
                        message: 'Invalid rejection type'
                    };
            }
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
            return await this.adminRepository.saveVideoMetadata(courseId, videos, adminId);
        } catch (error) {
            console.error("Error saving video metadata:", error);
            throw error;
        }
    }

    async reorderVideos(courseId: number, videoIds: number[], adminId: number): Promise<any[]> {
        try {
            return await this.adminRepository.reorderVideos(courseId, videoIds, adminId);
        } catch (error) {
            console.error("Error reordering videos:", error);
            throw error;
        }
    }

    async reorderContents(moduleId: number, contentIds: number[], adminId: number): Promise<any[]> {
        try {
            return await this.adminRepository.reorderContents(moduleId, contentIds, adminId);
        } catch (error) {
            console.error("Error reordering contents:", error);
            throw error;
        }
    }

    async softDeleteVideo(videoId: number, adminId: number): Promise<boolean> {
        try {
            return await this.adminRepository.softDeleteVideo(videoId, adminId);
        } catch (error) {
            console.error("Error soft deleting video:", error);
            return false;
        }
    }


    // Analytics
    async getCourseApprovalStats(): Promise<any> {
        try {
            return await this.adminRepository.getCourseApprovalStats();
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
        try {
            return await this.adminRepository.getCourseDetails(courseId);
        } catch (error) {
            console.error("Error getting course details:", error);
            return null;
        }
    }

    // Create contents for a course
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
            return await this.adminRepository.createContents(courseId, videos, adminId);
        } catch (error) {
            console.error("Error creating contents:", error);
            throw error;
        }
    }

    // Get course with modules and content
    async getCourseWithModulesAndContent(courseId: number): Promise<any> {
        try {
            return await this.adminRepository.getCourseWithModulesAndContent(courseId);
        } catch (error) {
            console.error("Error getting course with modules and content:", error);
            return null;
        }
    }

    // Individual module approval
    async approveModule(moduleId: number, adminId: number): Promise<boolean> {
        try {
            return await this.adminRepository.approveModule(moduleId, adminId);
        } catch (error) {
            console.error("Error approving module:", error);
            return false;
        }
    }

    // Individual content approval
    async approveContent(contentId: number, adminId: number): Promise<boolean> {
        try {
            return await this.adminRepository.approveContent(contentId, adminId);
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
}
