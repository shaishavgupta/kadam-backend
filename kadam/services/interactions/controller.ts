import { api, APIError, ErrCode } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { InteractionsService } from "./service";
import {
    CreateLikeDTO, UpdateLikeDTO, ParentType, CreateCommentDTO, UpdateCommentDTO,
    CreateShareDTO, UpdateShareDTO, CreateSaveDTO, CreateViewDTO, UpdateViewDTO,
    CreateRatingDTO, UpdateRatingDTO
} from "./types";
import { ApiResponse } from "../shared/types/common";

const interactionsService = new InteractionsService();

// ===== LIKES ENDPOINTS =====
// Create a like
export const createLike = api(
    { expose: true, auth: true, method: "POST", path: "/interactions/likes" },
    async (data: CreateLikeDTO): Promise<ApiResponse<any>> => {
        try {
            const result = await interactionsService.createLike(data);
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.like,
                message: "Like created successfully"
            };
        } catch (error) {
            console.error("Create like error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get likes by user ID
export const getLikesByUserId = api(
    { expose: true, auth: true, method: "GET", path: "/interactions/likes/user" },
    async (data: void): Promise<ApiResponse<any[]>> => {
        try {
            const userId = getAuthData()?.userID;
            if (!userId) {
                throw new APIError(ErrCode.InvalidArgument, "User ID is required");
            }
            const result = await interactionsService.getLikeByUserId(parseInt(userId));
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.likes || [],
                message: "Likes retrieved successfully"
            };
        } catch (error) {
            console.error("Get likes by user ID error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get all likes
export const getAllLikes = api(
    { expose: true, auth: true, method: "GET", path: "/interactions/likes" },
    async (): Promise<ApiResponse<any[]>> => {
        try {
            const result = await interactionsService.getAllLikes();
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.likes || [],
                message: "All likes retrieved successfully"
            };
        } catch (error) {
            console.error("Get all likes error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Update a like
export const updateLike = api(
    { expose: true, auth: true, method: "PATCH", path: "/interactions/likes/:id" },
    async ({ id, ...data }: { id: number } & UpdateLikeDTO): Promise<ApiResponse> => {
        try {
            const result = await interactionsService.updateLike(id, data);
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                message: "Like updated successfully"
            };
        } catch (error) {
            console.error("Update like error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get likes count by parent id
export const getLikesCountByParentId = api(
    { expose: true, auth: true, method: "GET", path: "/interactions/likes/parent/:parentId/:parentType" },
    async ({ parentId, parentType }: { parentId: number, parentType: string }): Promise<ApiResponse<number>> => {
        try {
            const result = await interactionsService.getLikesCountByParent(parentId, parentType as ParentType);
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.likes || 0,
                message: "Likes count retrieved successfully"
            };
        } catch (error) {
            console.error("Get likes count error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// ===== COMMENTS ENDPOINTS =====
// Create a comment
export const createComment = api(
    { expose: true, auth: true, method: "POST", path: "/interactions/comments" },
    async (data: CreateCommentDTO): Promise<ApiResponse<any>> => {
        try {
            const comment = await interactionsService.createComment(data);
            return {
                success: true,
                data: comment,
                message: "Comment created successfully"
            };
        } catch (error) {
            console.error("Create comment error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Failed to create comment");
        }
    }
);

// Get comment by parent id
export const getCommentByParentId = api(
    { expose: true, auth: true, method: "GET", path: "/interactions/comments/parent/:parentId/:parentType" },
    async ({ parentId, parentType }: { parentId: number, parentType: string }): Promise<ApiResponse<any>> => {
        try {
            const comment = await interactionsService.getCommentByParentId(parentId, parentType as ParentType);
            return {
                success: true,
                data: comment,
                message: "Comment retrieved successfully"
            };
        } catch (error) {
            console.error("Get comment by parent ID error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Failed to get comment");
        }
    }
);

// Get user comments
export const getUserComments = api(
    { expose: true, auth: true, method: "GET", path: "/interactions/comments/user" },
    async (): Promise<ApiResponse<any[]>> => {
        try {
            const userId = getAuthData()?.userID;
            if (!userId) {
                throw new APIError(ErrCode.InvalidArgument, "User ID is required");
            }
            const comments = await interactionsService.listUserComments(parseInt(userId));
            return {
                success: true,
                data: comments,
                message: "User comments retrieved successfully"
            };
        } catch (error) {
            console.error("Get user comments error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Failed to get comments");
        }
    }
);

// Update a comment
export const updateComment = api(
    { expose: true, auth: true, method: "PATCH", path: "/interactions/comments/:id" },
    async ({ id, ...data }: { id: number } & UpdateCommentDTO): Promise<ApiResponse<any>> => {
        try {
            const comment = await interactionsService.updateComment(id, data);
            return {
                success: true,
                data: comment,
                message: "Comment updated successfully"
            };
        } catch (error) {
            console.error("Update comment error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Failed to update comment");
        }
    }
);

// ===== SHARES ENDPOINTS =====
// Create a share
export const createShare = api(
    { expose: true, auth: true, method: "POST", path: "/interactions/shares" },
    async (data: CreateShareDTO): Promise<ApiResponse<any>> => {
        try {
            const result = await interactionsService.createShare(data);
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.share,
                message: "Share created successfully"
            };
        } catch (error) {
            console.error("Create share error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get shares by user ID
export const getSharesByUserId = api(
    { expose: true, auth: true, method: "GET", path: "/interactions/shares/user" },
    async (): Promise<ApiResponse<any[]>> => {
        try {
            const userId = getAuthData()?.userID;
            if (!userId) {
                throw new APIError(ErrCode.InvalidArgument, "User ID is required");
            }
            const result = await interactionsService.getSharesByUserId(parseInt(userId));
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.shares || [],
                message: "Shares retrieved successfully"
            };
        } catch (error) {
            console.error("Get shares by user ID error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Update a share
export const updateShare = api(
    { expose: true, auth: true, method: "PATCH", path: "/interactions/shares/:id" },
    async ({ id, ...data }: { id: number } & UpdateShareDTO): Promise<ApiResponse> => {
        try {
            const result = await interactionsService.updateShare(id, data);
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                message: "Share updated successfully"
            };
        } catch (error) {
            console.error("Update share error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// ===== SAVES ENDPOINTS =====
// Create a save
export const createSave = api(
    { expose: true, auth: true, method: "POST", path: "/interactions/saves" },
    async (data: CreateSaveDTO): Promise<ApiResponse<any>> => {
        try {
            const result = await interactionsService.createSave(data);
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.save,
                message: "Save created successfully"
            };
        } catch (error) {
            console.error("Create save error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get saves by user ID
export const getSavesByUserId = api(
    { expose: true, auth: true, method: "GET", path: "/interactions/saves/user" },
    async (): Promise<ApiResponse<any[]>> => {
        try {
            const userId = getAuthData()?.userID;
            if (!userId) {
                throw new APIError(ErrCode.InvalidArgument, "User ID is required");
            }
            const result = await interactionsService.getSavesByUserId(parseInt(userId));
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.saves || [],
                message: "Saves retrieved successfully"
            };
        } catch (error) {
            console.error("Get saves by user ID error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Delete a save
export const deleteSave = api(
    { expose: true, auth: true, method: "DELETE", path: "/interactions/saves/:id" },
    async ({ id }: { id: number }): Promise<ApiResponse> => {
        try {
            const result = await interactionsService.deleteSave(id);
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                message: "Save deleted successfully"
            };
        } catch (error) {
            console.error("Delete save error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// ===== VIEWS ENDPOINTS =====
// Create a view
export const createView = api(
    { expose: true, auth: true, method: "POST", path: "/interactions/views" },
    async (data: CreateViewDTO): Promise<ApiResponse<any>> => {
        try {
            const result = await interactionsService.createView(data);
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.view,
                message: "View created successfully"
            };
        } catch (error) {
            console.error("Create view error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get views by user ID
export const getViewsByUserId = api(
    { expose: true, auth: true, method: "GET", path: "/interactions/views/user" },
    async (): Promise<ApiResponse<any[]>> => {
        try {
            const userId = getAuthData()?.userID;
            if (!userId) {
                throw new APIError(ErrCode.InvalidArgument, "User ID is required");
            }
            const result = await interactionsService.getViewsByUserId(parseInt(userId));
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.views || [],
                message: "Views retrieved successfully"
            };
        } catch (error) {
            console.error("Get views by user ID error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Update a view
export const updateView = api(
    { expose: true, auth: true, method: "PATCH", path: "/interactions/views/:id" },
    async ({ id, ...data }: { id: number } & UpdateViewDTO): Promise<ApiResponse> => {
        try {
            const result = await interactionsService.updateView(id, data);
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                message: "View updated successfully"
            };
        } catch (error) {
            console.error("Update view error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// ===== RATINGS ENDPOINTS =====
// Create a rating
export const createRating = api(
    { expose: true, auth: true, method: "POST", path: "/interactions/ratings" },
    async (data: CreateRatingDTO): Promise<ApiResponse<any>> => {
        try {
            const result = await interactionsService.createRating(data);
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.rating,
                message: "Rating created successfully"
            };
        } catch (error) {
            console.error("Create rating error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get ratings by user ID
export const getRatingsByUserId = api(
    { expose: true, auth: true, method: "GET", path: "/interactions/ratings/user" },
    async (): Promise<ApiResponse<any[]>> => {
        try {
            const userId = getAuthData()?.userID;
            if (!userId) {
                throw new APIError(ErrCode.InvalidArgument, "User ID is required");
            }
            const result = await interactionsService.getRatingsByUserId(parseInt(userId));
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.ratings || [],
                message: "Ratings retrieved successfully"
            };
        } catch (error) {
            console.error("Get ratings by user ID error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get ratings by course ID
export const getRatingsByCourseId = api(
    { expose: true, auth: true, method: "GET", path: "/interactions/ratings/course/:courseId" },
    async ({ courseId }: { courseId: number }): Promise<ApiResponse<any[]>> => {
        try {
            const result = await interactionsService.getRatingsByCourseId(courseId);
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                data: result.ratings || [],
                message: "Ratings retrieved successfully"
            };
        } catch (error) {
            console.error("Get ratings by course ID error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Update a rating
export const updateRating = api(
    { expose: true, auth: true, method: "PATCH", path: "/interactions/ratings/:id" },
    async ({ id, ...data }: { id: number } & UpdateRatingDTO): Promise<ApiResponse> => {
        try {
            const result = await interactionsService.updateRating(id, data);
            if (result.error) {
                throw new APIError(ErrCode.InvalidArgument, result.error);
            }
            return {
                success: true,
                message: "Rating updated successfully"
            };
        } catch (error) {
            console.error("Update rating error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);
