import { api } from "encore.dev/api";
import { ApiResponse } from "../shared/types/common";
import { CreatorService } from "./service";
import {
    CreateCreatorRequest,
    UpdateCreatorRequest,
    CreateQualificationRequest,
    CreateAchievementRequest,
    Creator,
    CreatorWithDetails,
    QualificationType,
    AchievementType
} from "./types";

const creatorService = new CreatorService();

interface PaginatedResponse<T> {
    success: boolean;
    data: {
        items: T[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    message: string;
    error?: string;
}

/**
 * Get creator by ID
 */
export const getCreatorById = api(
    { expose: true, method: "GET", path: "/creators/:id" },
    async ({ id }: { id: string }): Promise<ApiResponse<Creator>> => {
        try {
            const creatorId = parseInt(id);
            if (isNaN(creatorId)) {
                return {
                    success: false,
                    message: "Invalid creator ID",
                    error: "INVALID_ID"
                };
            }

            const result = await creatorService.getCreatorById(creatorId);

            if (result.error) {
                return {
                    success: false,
                    message: result.error,
                    error: "CREATOR_NOT_FOUND"
                };
            }

            return {
                success: true,
                data: result.creator,
                message: "Creator retrieved successfully"
            };
        } catch (error) {
            console.error("Get creator by ID API error:", error);
            return {
                success: false,
                message: "Internal server error",
                error: "INTERNAL_ERROR"
            };
        }
    }
);

/**
 * Get creator with all details (qualifications and achievements)
 */
export const getCreatorWithDetails = api(
    { expose: true, method: "GET", path: "/creators/:id/details" },
    async ({ id }: { id: string }): Promise<ApiResponse<CreatorWithDetails>> => {
        try {
            const creatorId = parseInt(id);
            if (isNaN(creatorId)) {
                return {
                    success: false,
                    message: "Invalid creator ID",
                    error: "INVALID_ID"
                };
            }

            const result = await creatorService.getCreatorWithDetails(creatorId);

            if (result.error) {
                return {
                    success: false,
                    message: result.error,
                    error: "CREATOR_NOT_FOUND"
                };
            }

            return {
                success: true,
                data: result.creatorWithDetails,
                message: "Creator details retrieved successfully"
            };
        } catch (error) {
            console.error("Get creator details API error:", error);
            return {
                success: false,
                message: "Internal server error",
                error: "INTERNAL_ERROR"
            };
        }
    }
);

/**
 * Update creator details
 */
export const updateCreator = api(
    { expose: true, method: "PATCH", path: "/creators/:id" },
    async ({ id, ...creatorData }: { id: string } & UpdateCreatorRequest): Promise<ApiResponse<Creator>> => {
        try {
            const creatorId = parseInt(id);
            if (isNaN(creatorId)) {
                return {
                    success: false,
                    message: "Invalid creator ID",
                    error: "INVALID_ID"
                };
            }

            const result = await creatorService.updateCreator(creatorId, creatorData);

            if (result.error) {
                return {
                    success: false,
                    message: result.error,
                    error: "UPDATE_FAILED"
                };
            }

            return {
                success: true,
                data: result.creator,
                message: "Creator updated successfully"
            };
        } catch (error) {
            console.error("Update creator API error:", error);
            return {
                success: false,
                message: "Internal server error",
                error: "INTERNAL_ERROR"
            };
        }
    }
);

/**
 * Get all creators with pagination
 */
export const getAllCreators = api(
    { expose: true, method: "GET", path: "/creators" },
    async ({ page = "1", limit = "10" }: { page?: string; limit?: string }): Promise<PaginatedResponse<Creator>> => {
        try {
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);

            if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
                return {
                    success: false,
                    data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
                    message: "Invalid pagination parameters",
                    error: "INVALID_PARAMS"
                };
            }

            const result = await creatorService.getAllCreators(pageNum, limitNum);

            if (result.error) {
                return {
                    success: false,
                    data: { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
                    message: result.error,
                    error: "FETCH_FAILED"
                };
            }

            return {
                success: true,
                data: {
                    items: result.creators,
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages
                },
                message: "Creators retrieved successfully"
            };
        } catch (error) {
            console.error("Get all creators API error:", error);
            return {
                success: false,
                data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
                message: "Internal server error",
                error: "INTERNAL_ERROR"
            };
        }
    }
);

/**
 * Create new creator
 */
export const createCreator = api(
    { expose: true, method: "POST", path: "/creators" },
    async (req: CreateCreatorRequest): Promise<ApiResponse<Creator>> => {
        try {
            const result = await creatorService.createCreator(req);

            if (result.error) {
                return {
                    success: false,
                    message: result.error,
                    error: "CREATION_FAILED"
                };
            }

            return {
                success: true,
                data: result.creator,
                message: "Creator created successfully"
            };
        } catch (error) {
            console.error("Create creator API error:", error);
            return {
                success: false,
                message: "Internal server error",
                error: "INTERNAL_ERROR"
            };
        }
    }
);

/**
 * Delete creator
 */
export const deleteCreator = api(
    { expose: true, method: "DELETE", path: "/creators/:id" },
    async ({ id }: { id: string }): Promise<ApiResponse> => {
        try {
            const creatorId = parseInt(id);
            if (isNaN(creatorId)) {
                return {
                    success: false,
                    message: "Invalid creator ID",
                    error: "INVALID_ID"
                };
            }

            const result = await creatorService.deleteCreator(creatorId);

            if (result.error) {
                return {
                    success: false,
                    message: result.error,
                    error: "DELETE_FAILED"
                };
            }

            return {
                success: true,
                message: "Creator deleted successfully"
            };
        } catch (error) {
            console.error("Delete creator API error:", error);
            return {
                success: false,
                message: "Internal server error",
                error: "INTERNAL_ERROR"
            };
        }
    }
);

/**
 * Search creators by name
 */
export const searchCreatorsByName = api(
    { expose: true, method: "GET", path: "/creators/search" },
    async ({ name, page = "1", limit = "10" }: { name: string; page?: string; limit?: string }): Promise<PaginatedResponse<Creator>> => {
        try {
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);

            if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
                return {
                    success: false,
                    data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
                    message: "Invalid pagination parameters",
                    error: "INVALID_PARAMS"
                };
            }

            if (!name || name.trim().length < 2) {
                return {
                    success: false,
                    data: { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
                    message: "Search term must be at least 2 characters long",
                    error: "INVALID_SEARCH_TERM"
                };
            }

            const result = await creatorService.searchCreatorsByName(name.trim(), pageNum, limitNum);

            if (result.error) {
                return {
                    success: false,
                    data: { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
                    message: result.error,
                    error: "SEARCH_FAILED"
                };
            }

            return {
                success: true,
                data: {
                    items: result.creators,
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages
                },
                message: "Creators search completed successfully"
            };
        } catch (error) {
            console.error("Search creators API error:", error);
            return {
                success: false,
                data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
                message: "Internal server error",
                error: "INTERNAL_ERROR"
            };
        }
    }
);

/**
 * Get top rated creators
 */
export const getTopRatedCreators = api(
    { expose: true, method: "GET", path: "/creators/top-rated" },
    async ({ limit = "10" }: { limit?: string }): Promise<ApiResponse<Creator[]>> => {
        try {
            const limitNum = parseInt(limit);

            if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                return {
                    success: false,
                    message: "Invalid limit parameter (must be between 1 and 100)",
                    error: "INVALID_PARAMS"
                };
            }

            const result = await creatorService.getTopRatedCreators(limitNum);

            if (result.error) {
                return {
                    success: false,
                    message: result.error,
                    error: "FETCH_FAILED"
                };
            }

            return {
                success: true,
                data: result.creators,
                message: "Top rated creators retrieved successfully"
            };
        } catch (error) {
            console.error("Get top rated creators API error:", error);
            return {
                success: false,
                message: "Internal server error",
                error: "INTERNAL_ERROR"
            };
        }
    }
);

/**
 * Add qualification to creator
 */
export const addQualificationToCreator = api(
    { expose: true, method: "POST", path: "/creators/:id/qualifications" },
    async ({ id, ...qualificationData }: { id: string } & CreateQualificationRequest): Promise<ApiResponse> => {
        try {
            const creatorId = parseInt(id);
            if (isNaN(creatorId)) {
                return {
                    success: false,
                    message: "Invalid creator ID",
                    error: "INVALID_ID"
                };
            }

            const result = await creatorService.addQualificationToCreator(creatorId, qualificationData);

            if (result.error) {
                return {
                    success: false,
                    message: result.error,
                    error: "QUALIFICATION_ADD_FAILED"
                };
            }

            return {
                success: true,
                message: "Qualification added to creator successfully"
            };
        } catch (error) {
            console.error("Add qualification API error:", error);
            return {
                success: false,
                message: "Internal server error",
                error: "INTERNAL_ERROR"
            };
        }
    }
);

/**
 * Add achievement to creator
 */
export const addAchievementToCreator = api(
    { expose: true, method: "POST", path: "/creators/:id/achievements" },
    async ({ id, ...achievementData }: { id: string } & CreateAchievementRequest): Promise<ApiResponse> => {
        try {
            const creatorId = parseInt(id);
            if (isNaN(creatorId)) {
                return {
                    success: false,
                    message: "Invalid creator ID",
                    error: "INVALID_ID"
                };
            }

            const result = await creatorService.addAchievementToCreator(creatorId, achievementData);

            if (result.error) {
                return {
                    success: false,
                    message: result.error,
                    error: "ACHIEVEMENT_ADD_FAILED"
                };
            }

            return {
                success: true,
                message: "Achievement added to creator successfully"
            };
        } catch (error) {
            console.error("Add achievement API error:", error);
            return {
                success: false,
                message: "Internal server error",
                error: "INTERNAL_ERROR"
            };
        }
    }
);

/**
 * Health check endpoint
 */
export const healthCheck = api(
    { expose: true, method: "GET", path: "/creators/health" },
    async (): Promise<ApiResponse> => {
        return {
            success: true,
            message: "Creator service is healthy"
        };
    }
);

/**
 * Get enum values for frontend
 */
export const getEnums = api(
    { expose: true, method: "GET", path: "/creators/enums" },
    async (): Promise<ApiResponse<{
        qualificationTypes: typeof QualificationType;
        achievementTypes: typeof AchievementType;
    }>> => {
        return {
            success: true,
            data: {
                qualificationTypes: QualificationType,
                achievementTypes: AchievementType
            },
            message: "Enums retrieved successfully"
        };
    }
);
