import { CreatorRepository } from "./repository";
import {
    Creator,
    CreateCreatorRequest,
    UpdateCreatorRequest,
    CreateQualificationRequest,
    CreateAchievementRequest,
    CreatorWithDetails
} from "./types";

export class CreatorService {
    private creatorRepository: CreatorRepository;

    constructor() {
        this.creatorRepository = new CreatorRepository();
    }

    /**
     * Create a new creator
     */
    async createCreator(creatorData: CreateCreatorRequest): Promise<{ creator?: Creator; error?: string }> {
        try {
            return await this.creatorRepository.createCreator(creatorData);
        } catch (error) {
            console.error("Error creating creator:", error);
            return { error: "Failed to create creator" };
        }
    }

    /**
     * Get creator by ID
     */
    async getCreatorById(id: number): Promise<{ creator?: Creator; error?: string }> {
        try {
            return await this.creatorRepository.findCreatorById(id);
        } catch (error) {
            console.error("Error getting creator by ID:", error);
            return { error: "Failed to get creator" };
        }
    }

    /**
     * Get creator by name
     */
    async getCreatorByName(name: string): Promise<{ creator?: Creator; error?: string }> {
        try {
            return await this.creatorRepository.findCreatorByName(name);
        } catch (error) {
            console.error("Error getting creator by name:", error);
            return { error: "Failed to get creator" };
        }
    }

    /**
     * Update creator details
     */
    async updateCreator(id: number, creatorData: UpdateCreatorRequest): Promise<{ creator?: Creator; error?: string }> {
        try {
            return await this.creatorRepository.updateCreator(id, creatorData);
        } catch (error) {
            console.error("Error updating creator:", error);
            return { error: "Failed to update creator" };
        }
    }

    /**
     * Delete creator
     */
    async deleteCreator(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            return await this.creatorRepository.deleteCreator(id);
        } catch (error) {
            console.error("Error deleting creator:", error);
            return { success: false, error: "Failed to delete creator" };
        }
    }

    /**
     * Get all creators with pagination
     */
    async getAllCreators(page: number = 1, limit: number = 10): Promise<{
        creators: Creator[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        error?: string
    }> {
        try {
            const result = await this.creatorRepository.getAllCreators(page, limit);
            const totalPages = Math.ceil(result.total / limit);

            return {
                creators: result.creators,
                total: result.total,
                page,
                limit,
                totalPages,
                error: result.error
            };
        } catch (error) {
            console.error("Error getting all creators:", error);
            return {
                creators: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
                error: "Failed to get creators"
            };
        }
    }

    /**
     * Get creator with all details (qualifications and achievements)
     */
    async getCreatorWithDetails(id: number): Promise<{ creatorWithDetails?: CreatorWithDetails; error?: string }> {
        try {
            return await this.creatorRepository.getCreatorWithDetails(id);
        } catch (error) {
            console.error("Error getting creator with details:", error);
            return { error: "Failed to get creator details" };
        }
    }

    /**
     * Create qualification
     */
    async createQualification(qualificationData: CreateQualificationRequest): Promise<{ qualification?: any; error?: string }> {
        try {
            return await this.creatorRepository.createQualification(qualificationData);
        } catch (error) {
            console.error("Error creating qualification:", error);
            return { error: "Failed to create qualification" };
        }
    }

    /**
     * Create achievement
     */
    async createAchievement(achievementData: CreateAchievementRequest): Promise<{ achievement?: any; error?: string }> {
        try {
            return await this.creatorRepository.createAchievement(achievementData);
        } catch (error) {
            console.error("Error creating achievement:", error);
            return { error: "Failed to create achievement" };
        }
    }

    /**
     * Add qualification to creator
     */
    async addQualificationToCreator(creatorId: number, qualificationData: CreateQualificationRequest): Promise<{ success: boolean; error?: string }> {
        try {
            // Create qualification
            const qualificationResult = await this.creatorRepository.createQualification(qualificationData);
            if (qualificationResult.error) {
                return { success: false, error: qualificationResult.error };
            }

            // Link qualification to creator
            const linkResult = await this.creatorRepository.linkQualificationToCreator(creatorId, qualificationResult.qualification!.id);
            if (!linkResult.success) {
                return { success: false, error: linkResult.error };
            }

            return { success: true };
        } catch (error) {
            console.error("Error adding qualification to creator:", error);
            return { success: false, error: "Failed to add qualification to creator" };
        }
    }

    /**
     * Add achievement to creator
     */
    async addAchievementToCreator(creatorId: number, achievementData: CreateAchievementRequest): Promise<{ success: boolean; error?: string }> {
        try {
            // Create achievement
            const achievementResult = await this.creatorRepository.createAchievement(achievementData);
            if (achievementResult.error) {
                return { success: false, error: achievementResult.error };
            }

            // Link achievement to creator
            const linkResult = await this.creatorRepository.linkAchievementToCreator(creatorId, achievementResult.achievement!.id);
            if (!linkResult.success) {
                return { success: false, error: linkResult.error };
            }

            return { success: true };
        } catch (error) {
            console.error("Error adding achievement to creator:", error);
            return { success: false, error: "Failed to add achievement to creator" };
        }
    }

    /**
     * Search creators by name
     */
    async searchCreatorsByName(name: string, page: number = 1, limit: number = 10): Promise<{
        creators: Creator[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        error?: string
    }> {
        try {
            const result = await this.creatorRepository.searchCreatorsByName(name, page, limit);
            const totalPages = Math.ceil(result.total / limit);

            return {
                creators: result.creators,
                total: result.total,
                page,
                limit,
                totalPages,
                error: result.error
            };
        } catch (error) {
            console.error("Error searching creators:", error);
            return {
                creators: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
                error: "Failed to search creators"
            };
        }
    }

    /**
     * Get creators by rating range
     */
    async getCreatorsByRating(minRating: number, maxRating: number, page: number = 1, limit: number = 10): Promise<{
        creators: Creator[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        error?: string
    }> {
        try {
            // This would need to be implemented in the repository
            // For now, we'll get all creators and filter by rating
            const allCreators = await this.creatorRepository.getAllCreators(page, limit);

            if (allCreators.error) {
                return {
                    creators: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 0,
                    error: allCreators.error
                };
            }

            const filteredCreators = allCreators.creators.filter(creator =>
                creator.rating !== null &&
                creator.rating !== undefined &&
                creator.rating >= minRating &&
                creator.rating <= maxRating
            );

            return {
                creators: filteredCreators,
                total: filteredCreators.length,
                page,
                limit,
                totalPages: Math.ceil(filteredCreators.length / limit),
            };
        } catch (error) {
            console.error("Error getting creators by rating:", error);
            return {
                creators: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
                error: "Failed to get creators by rating"
            };
        }
    }

    /**
     * Get top rated creators
     */
    async getTopRatedCreators(limit: number = 10): Promise<{ creators: Creator[]; error?: string }> {
        try {
            // Get all creators and sort by rating
            const allCreators = await this.creatorRepository.getAllCreators(1, 100); // Get more to have a good pool

            if (allCreators.error) {
                return {
                    creators: [],
                    error: allCreators.error
                };
            }

            const topRatedCreators = allCreators.creators
                .filter(creator => creator.rating !== null && creator.rating !== undefined)
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, limit);

            return {
                creators: topRatedCreators
            };
        } catch (error) {
            console.error("Error getting top rated creators:", error);
            return {
                creators: [],
                error: "Failed to get top rated creators"
            };
        }
    }
}
