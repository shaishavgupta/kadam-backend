import { CreatorRepository } from "../repository/creators.repository";
import { UserRepository } from "../repository/users.repository";
import {
    Creator,
    Qualification,
    Achievement,
    CreateCreatorRequest,
    UpdateCreatorRequest,
    PaginatedCreatorsResponse,
    CreateQualificationRequest,
    CreateAchievementRequest,
    CreatorStats
} from "../schemas/creator";
import { CreateCreatorWithUserRequest, CreateUserWithAuthRequest } from "../schemas/auth";

export class CreatorService {
    private creatorRepository: CreatorRepository;
    private userRepository: UserRepository;

    constructor() {
        this.creatorRepository = new CreatorRepository();
        this.userRepository = new UserRepository();
    }

    /**
     * Create a new creator with user account
     */
    async getOrCreateCreator(creatorData: CreateCreatorWithUserRequest): Promise<{ entity: Creator, newEntity: boolean }> {
        try {
            // First create the base user
            const userData: CreateUserWithAuthRequest = {
                email: creatorData.email,
                name: creatorData.name,
                phone: creatorData.phone,
                bio: creatorData.bio,
                avatar_url: creatorData.avatar_url
            };

            const creator = await this.creatorRepository.createCreator(creatorData);

            // Then create creator-specific data
            const creatorResult = await this.creatorRepository.createCreator({
                name: creatorData.name,
                bio: creatorData.bio,
                profile_pic: creatorData.avatar_url
            });

            if (!creatorResult) {
                throw new Error("Failed to create creator");
            }

            return { entity: creatorResult, newEntity: true };
        } catch (error) {
            console.error("Error creating creator with user:", error);
            throw error;
        }
    }

    /**
     * Create a new creator without user account (legacy method)
     */
    async createCreator(creatorData: CreateCreatorRequest): Promise<{ creator?: Creator; error?: string }> {
        try {
            const creator = await this.creatorRepository.createCreator(creatorData);
            if (creator) {
                return { creator };
            }
            return { error: "Failed to create creator" };
        } catch (error) {
            console.error("Error creating creator:", error);
            return { error: "Failed to create creator" };
        }
    }

    async getCreatorById(id: number): Promise<{ creator?: Creator; error?: string }> {
        try {
            const creator = await this.creatorRepository.getCreatorById(id);
            if (creator) {
                return { creator };
            }
            return { error: "Creator not found" };
        } catch (error) {
            console.error("Error getting creator by ID:", error);
            return { error: "Failed to get creator" };
        }
    }

    async getCreatorByName(name: string): Promise<{ creators?: Creator[]; error?: string }> {
        try {
            const creators = await this.creatorRepository.getCreatorByName(name);
            return { creators };
        } catch (error) {
            console.error("Error getting creator by name:", error);
            return { error: "Failed to get creators" };
        }
    }

    async updateCreator(id: number, creatorData: UpdateCreatorRequest): Promise<{ creator?: Creator; error?: string }> {
        try {
            const creator = await this.creatorRepository.updateCreator(id, creatorData);
            if (creator) {
                return { creator };
            }
            return { error: "Failed to update creator" };
        } catch (error) {
            console.error("Error updating creator:", error);
            return { error: "Failed to update creator" };
        }
    }

    async deleteCreator(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            const success = await this.creatorRepository.deleteCreator(id);
            if (success) {
                return { success: true };
            }
            return { success: false, error: "Failed to delete creator" };
        } catch (error) {
            console.error("Error deleting creator:", error);
            return { success: false, error: "Failed to delete creator" };
        }
    }

    async getAllCreators(page: number = 1, limit: number = 10): Promise<PaginatedCreatorsResponse> {
        return this.creatorRepository.getAllCreators(page, limit);
    }

    async getCreatorQualifications(creatorId: number): Promise<{ qualifications?: Qualification[]; error?: string }> {
        try {
            const qualifications = await this.creatorRepository.getCreatorQualifications(creatorId);
            return { qualifications };
        } catch (error) {
            console.error("Error getting creator qualifications:", error);
            return { error: "Failed to get qualifications" };
        }
    }

    async getCreatorAchievements(creatorId: number): Promise<{ achievements?: Achievement[]; error?: string }> {
        try {
            const achievements = await this.creatorRepository.getCreatorAchievements(creatorId);
            return { achievements };
        } catch (error) {
            console.error("Error getting creator achievements:", error);
            return { error: "Failed to get achievements" };
        }
    }

    async addQualification(creatorId: number, qualificationData: CreateQualificationRequest): Promise<{ qualification?: Qualification; error?: string }> {
        try {
            const qualification = await this.creatorRepository.addQualification(creatorId, qualificationData);
            if (qualification) {
                return { qualification };
            }
            return { error: "Failed to add qualification" };
        } catch (error) {
            console.error("Error adding qualification:", error);
            return { error: "Failed to add qualification" };
        }
    }

    async addAchievement(creatorId: number, achievementData: CreateAchievementRequest): Promise<{ achievement?: Achievement; error?: string }> {
        try {
            const achievement = await this.creatorRepository.addAchievement(creatorId, achievementData);
            if (achievement) {
                return { achievement };
            }
            return { error: "Failed to add achievement" };
        } catch (error) {
            console.error("Error adding achievement:", error);
            return { error: "Failed to add achievement" };
        }
    }

    async updateQualification(id: number, qualificationData: Partial<CreateQualificationRequest>): Promise<{ qualification?: Qualification; error?: string }> {
        try {
            const qualification = await this.creatorRepository.updateQualification(id, qualificationData);
            if (qualification) {
                return { qualification };
            }
            return { error: "Failed to update qualification" };
        } catch (error) {
            console.error("Error updating qualification:", error);
            return { error: "Failed to update qualification" };
        }
    }

    async updateAchievement(id: number, achievementData: Partial<CreateAchievementRequest>): Promise<{ achievement?: Achievement; error?: string }> {
        try {
            const achievement = await this.creatorRepository.updateAchievement(id, achievementData);
            if (achievement) {
                return { achievement };
            }
            return { error: "Failed to update achievement" };
        } catch (error) {
            console.error("Error updating achievement:", error);
            return { error: "Failed to update achievement" };
        }
    }

    async deleteQualification(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            const success = await this.creatorRepository.deleteQualification(id);
            if (success) {
                return { success: true };
            }
            return { success: false, error: "Failed to delete qualification" };
        } catch (error) {
            console.error("Error deleting qualification:", error);
            return { success: false, error: "Failed to delete qualification" };
        }
    }

    async deleteAchievement(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            const success = await this.creatorRepository.deleteAchievement(id);
            if (success) {
                return { success: true };
            }
            return { success: false, error: "Failed to delete achievement" };
        } catch (error) {
            console.error("Error deleting achievement:", error);
            return { success: false, error: "Failed to delete achievement" };
        }
    }

    async searchCreators(name: string, page: number = 1, limit: number = 10): Promise<PaginatedCreatorsResponse> {
        return this.creatorRepository.searchCreators(name, page, limit);
    }

    async getCreatorStats(creatorId: number): Promise<{ stats?: CreatorStats; error?: string }> {
        try {
            const stats = await this.creatorRepository.getCreatorStats(creatorId);
            if (stats) {
                return { stats };
            }
            return { error: "Failed to get creator stats" };
        } catch (error) {
            console.error("Error getting creator stats:", error);
            return { error: "Failed to get creator stats" };
        }
    }
}
