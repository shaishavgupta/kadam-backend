import { AdminRepository, AdminToken, UnapprovedCourse, RejectedVideo } from "../repository/admin.repository";
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

    async getCourses(page: number, limit: number): Promise<PaginatedCoursesResponse> {
        return this.coursesRepository.getAllCourses(page, limit);
    }

    // Enhanced Admin Authentication
    async authenticateAdmin(token: string): Promise<{ admin: AdminToken; jwtToken: string } | null> {
        try {
            const adminToken = await this.adminRepository.authenticateAdmin(token);
            if (!adminToken) {
                return null;
            }

            // Generate JWT token for session management
            const jwtToken = jwt.sign(
                {
                    sub: adminToken.id,
                    email: adminToken.email,
                    role: adminToken.role,
                    userType: 'admin'
                },
                authConfig.JWT_SECRET,
                { expiresIn: '24h' }
            );

            return {
                admin: adminToken,
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

    async approveCourse(courseId: number, adminEmail: string): Promise<boolean> {
        try {
            return await this.adminRepository.approveCourse(courseId, adminEmail);
        } catch (error) {
            console.error("Error approving course:", error);
            return false;
        }
    }

    async rejectCourse(courseId: number, adminEmail: string, reason: string): Promise<boolean> {
        try {
            return await this.adminRepository.rejectCourse(courseId, adminEmail, reason);
        } catch (error) {
            console.error("Error rejecting course:", error);
            return false;
        }
    }

    // Video Management
    async saveVideoMetadata(
        courseId: number,
        videos: Array<{
            name: string;
            description?: string;
            url: string;
            position: number;
            is_paid: boolean;
            is_active: boolean;
            duration?: number;
            thumbnail_url?: string;
            module_name?: string;
        }>,
        adminEmail: string
    ): Promise<any[]> {
        try {
            return await this.adminRepository.saveVideoMetadata(courseId, videos, adminEmail);
        } catch (error) {
            console.error("Error saving video metadata:", error);
            throw error;
        }
    }

    async reorderVideos(courseId: number, videoIds: number[], adminEmail: string): Promise<any[]> {
        try {
            return await this.adminRepository.reorderVideos(courseId, videoIds, adminEmail);
        } catch (error) {
            console.error("Error reordering videos:", error);
            throw error;
        }
    }

    async softDeleteVideo(videoId: number, adminEmail: string): Promise<boolean> {
        try {
            return await this.adminRepository.softDeleteVideo(videoId, adminEmail);
        } catch (error) {
            console.error("Error soft deleting video:", error);
            return false;
        }
    }

    // Rejected Content
    async getRejectedVideos(page: number = 1, limit: number = 10): Promise<{
        videos: RejectedVideo[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            return await this.adminRepository.getRejectedVideos(page, limit);
        } catch (error) {
            console.error("Error getting rejected videos:", error);
            return {
                videos: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            };
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
}
