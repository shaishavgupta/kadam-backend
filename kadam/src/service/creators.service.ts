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
import { cache } from "../infra/cache";
import { CACHE_TTL, CACHE_KEYS } from "../shared/constants/cache-keys";

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

            // Invalidate creator list caches since we added a new creator
            await cache.delete(CACHE_KEYS.CREATORS.ALL);

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
                // Invalidate creator list caches since we added a new creator
                await cache.delete(CACHE_KEYS.CREATORS.ALL);

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
            // Check cache first
            const cacheKey = CACHE_KEYS.CREATORS.BY_ID(id);
            const cachedCreator = await cache.get(cacheKey);

            if (cachedCreator) {
                return { creator: cachedCreator };
            }

            const creator = await this.creatorRepository.getCreatorById(id);
            if (creator) {
                // Cache the creator for 1 hour
                await cache.set(cacheKey, creator, CACHE_TTL.CREATOR);
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
            // Check cache first
            const cacheKey = CACHE_KEYS.CREATORS.BY_NAME(name);
            const cachedCreators = await cache.get(cacheKey);

            if (cachedCreators) {
                return { creators: cachedCreators };
            }

            const creators = await this.creatorRepository.getCreatorByName(name);
            if (creators && creators.length > 0) {
                // Cache the creators for 30 minutes
                await cache.set(cacheKey, creators, CACHE_TTL.CREATOR_NAME_SEARCH);
            }
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
                // Invalidate cache for this creator
                const cacheKey = CACHE_KEYS.CREATORS.BY_ID(id);
                await cache.delete(cacheKey);

                // Also invalidate name-based cache if name was updated
                if (creatorData.name) {
                    const nameCacheKey = CACHE_KEYS.CREATORS.BY_NAME(creatorData.name);
                    await cache.delete(nameCacheKey);
                }

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
                // Invalidate cache for this creator
                const cacheKey = CACHE_KEYS.CREATORS.BY_ID(id);
                await cache.delete(cacheKey);

                // Also invalidate any creator list caches
                await cache.delete(CACHE_KEYS.CREATORS.ALL);

                return { success: true };
            }
            return { success: false, error: "Failed to delete creator" };
        } catch (error) {
            console.error("Error deleting creator:", error);
            return { success: false, error: "Failed to delete creator" };
        }
    }

    async getAllCreators(page: number = 1, limit: number = 10): Promise<PaginatedCreatorsResponse> {
        try {
            // Check cache first
            const cacheKey = CACHE_KEYS.CREATORS.ALL_PAGINATED(page, limit);
            const cachedResponse = await cache.get(cacheKey);

            if (cachedResponse) {
                return cachedResponse;
            }

            const response = await this.creatorRepository.getAllCreators(page, limit);

            // Cache the response for 15 minutes
            await cache.set(cacheKey, response, CACHE_TTL.CREATOR_LISTS);

            return response;
        } catch (error) {
            console.error("Error getting all creators:", error);
            throw error;
        }
    }

    async getCreatorQualifications(creatorId: number): Promise<{ qualifications?: Qualification[]; error?: string }> {
        try {
            // Check cache first
            const cacheKey = CACHE_KEYS.CREATORS.QUALIFICATIONS(creatorId);
            const cachedQualifications = await cache.get(cacheKey);

            if (cachedQualifications) {
                return { qualifications: cachedQualifications };
            }

            const qualifications = await this.creatorRepository.getCreatorQualifications(creatorId);
            if (qualifications && qualifications.length > 0) {
                // Cache the qualifications for 30 minutes
                await cache.set(cacheKey, qualifications, CACHE_TTL.CREATOR_QUALIFICATIONS);
            }
            return { qualifications };
        } catch (error) {
            console.error("Error getting creator qualifications:", error);
            return { error: "Failed to get qualifications" };
        }
    }

    async getCreatorAchievements(creatorId: number): Promise<{ achievements?: Achievement[]; error?: string }> {
        try {
            // Check cache first
            const cacheKey = CACHE_KEYS.CREATORS.ACHIEVEMENTS(creatorId);
            const cachedAchievements = await cache.get(cacheKey);

            if (cachedAchievements) {
                return { achievements: cachedAchievements };
            }

            const achievements = await this.creatorRepository.getCreatorAchievements(creatorId);
            if (achievements && achievements.length > 0) {
                // Cache the achievements for 30 minutes
                await cache.set(cacheKey, achievements, CACHE_TTL.CREATOR_ACHIEVEMENTS);
            }
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
                // Invalidate qualifications cache for this creator
                const cacheKey = CACHE_KEYS.CREATORS.QUALIFICATIONS(creatorId);
                await cache.delete(cacheKey);

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
                // Invalidate achievements cache for this creator
                const cacheKey = CACHE_KEYS.CREATORS.ACHIEVEMENTS(creatorId);
                await cache.delete(cacheKey);

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
                // Invalidate qualifications cache for this creator
                const cacheKey = CACHE_KEYS.CREATORS.QUALIFICATIONS(qualification.creator_id);
                await cache.delete(cacheKey);

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
                // Invalidate achievements cache for this creator
                const cacheKey = CACHE_KEYS.CREATORS.ACHIEVEMENTS(achievement.creator_id);
                await cache.delete(cacheKey);

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
            // Get qualification first to know which creator's cache to invalidate
            const qualification = await this.creatorRepository.getQualificationById(id);
            const success = await this.creatorRepository.deleteQualification(id);

            if (success) {
                // Invalidate qualifications cache for this creator
                if (qualification) {
                    const cacheKey = CACHE_KEYS.CREATORS.QUALIFICATIONS(qualification.creator_id);
                    await cache.delete(cacheKey);
                }

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
            // Get achievement first to know which creator's cache to invalidate
            const achievement = await this.creatorRepository.getAchievementById(id);
            const success = await this.creatorRepository.deleteAchievement(id);

            if (success) {
                // Invalidate achievements cache for this creator
                if (achievement) {
                    const cacheKey = CACHE_KEYS.CREATORS.ACHIEVEMENTS(achievement.creator_id);
                    await cache.delete(cacheKey);
                }

                return { success: true };
            }
            return { success: false, error: "Failed to delete achievement" };
        } catch (error) {
            console.error("Error deleting achievement:", error);
            return { success: false, error: "Failed to delete achievement" };
        }
    }

    async searchCreators(name: string, page: number = 1, limit: number = 10): Promise<PaginatedCreatorsResponse> {
        try {
            // Check cache first
            const cacheKey = CACHE_KEYS.CREATORS.SEARCH(name, page, limit);
            const cachedResponse = await cache.get(cacheKey);

            if (cachedResponse) {
                return cachedResponse;
            }

            const response = await this.creatorRepository.searchCreators(name, page, limit);

            // Cache the response for 10 minutes
            await cache.set(cacheKey, response, CACHE_TTL.CREATOR_SEARCH);

            return response;
        } catch (error) {
            console.error("Error searching creators:", error);
            throw error;
        }
    }

    async getCreatorStats(creatorId: number): Promise<{ stats?: CreatorStats; error?: string }> {
        try {
            // Check cache first
            const cacheKey = CACHE_KEYS.CREATORS.STATS(creatorId);
            const cachedStats = await cache.get(cacheKey);

            if (cachedStats) {
                return { stats: cachedStats };
            }

            const stats = await this.creatorRepository.getCreatorStats(creatorId);
            if (stats) {
                // Cache the stats for 5 minutes (stats change frequently)
                await cache.set(cacheKey, stats, CACHE_TTL.CREATOR_STATS);
                return { stats };
            }
            return { error: "Failed to get creator stats" };
        } catch (error) {
            console.error("Error getting creator stats:", error);
            return { error: "Failed to get creator stats" };
        }
    }
}
