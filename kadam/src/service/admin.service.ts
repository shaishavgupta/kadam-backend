import { AdminRepository } from "../repository/admin.repository";
import { AdminConfigurations, AdminConfigurationRequest, AdminConfigurationResponse, DashboardData } from "../shared/types/admin.types";
import { UserRepository } from "../repository/users.repository";
import { CreatorRepository } from "../repository/creators.repository";
import { CoursesRepository } from "../repository/courses.repository";
import { PaginatedUsersResponse } from "../shared/types/users.types";
import { PaginatedCreatorsResponse } from "../shared/types/creators.types";
import { PaginatedCoursesResponse } from "../shared/types/courses.types";

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
}
