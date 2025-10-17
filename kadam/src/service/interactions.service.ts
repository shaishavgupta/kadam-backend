import {
    CreateLikeDTO, Like, Comment, CreateCommentDTO, UpdateCommentDTO,
    Share, CreateShareDTO, UpdateShareDTO, Save, CreateSaveDTO, UserEnrollment, CreateUserEnrollmentDTO, UpdateUserEnrollmentDTO, PathEnrollment
} from "../schemas/interaction";
import { ParentType } from "../shared/enums";
import { InteractionsRepository } from "../repository/interactions.repository";
import { cache } from "../infra/cache";

// Cache key constants
const CACHE_KEYS = {
    // User-specific cache keys
    LIKED_CONTENTS_BY_USER: (userId: number) => `liked_contents:user:${userId}`,
    COMMENTS_BY_USER: (userId: number) => `comments:user:${userId}`,
    SHARES_BY_USER: (userId: number) => `shares:user:${userId}`,
    SAVES_BY_USER: (userId: number) => `saves:user:${userId}`,
    SAVED_CONTENTS_BY_USER: (userId: number) => `saved_contents:user:${userId}`,
    USER_ENROLLMENTS_BY_USER: (userId: number) => `user_enrollments:user:${userId}`,
    PATH_ENROLLMENTS_BY_USER: (userId: number, page: number, limit: number) => `path_enrollments:user:${userId}:page:${page}:limit:${limit}`,

    // Content-specific cache keys
    COMMENTS_BY_PARENT: (parentType: ParentType, parentId: number) => `comments:${parentType}:${parentId}`,
    USER_ENROLLMENTS_BY_COURSE: (courseId: number) => `user_enrollments:course:${courseId}`,

    // Count and status cache keys
    LIKES_COUNT_BY_PARENT: (parentType: ParentType, parentId: number, userId: number) => `likes_count:${parentType}:${parentId}:${userId}`,
    IS_LIKED_BY_USER: (parentType: ParentType, parentId: number, userId: number) => `is_liked:${parentType}:${parentId}:${userId}`,
    IS_SAVED_BY_USER: (parentType: ParentType, parentId: number, userId: number) => `is_saved:${parentType}:${parentId}:${userId}`,
} as const;

export class InteractionsService {
    private interactionsRepository: InteractionsRepository;

    constructor() {
        this.interactionsRepository = new InteractionsRepository();
    }

    // Helper method to invalidate related caches
    private async invalidateUserCaches(userId: number, parentId?: number, parentType?: ParentType) {
        try {
            const keysToDelete = [
                CACHE_KEYS.LIKED_CONTENTS_BY_USER(userId),
                CACHE_KEYS.COMMENTS_BY_USER(userId),
                CACHE_KEYS.SHARES_BY_USER(userId),
                CACHE_KEYS.SAVES_BY_USER(userId),
                CACHE_KEYS.SAVED_CONTENTS_BY_USER(userId),
                CACHE_KEYS.USER_ENROLLMENTS_BY_USER(userId),
                // Note: PATH_ENROLLMENTS_BY_USER uses pagination, so we'll need to handle this differently
            ];

            // Add parent-specific cache keys if provided
            if (parentId && parentType) {
                keysToDelete.push(
                    CACHE_KEYS.LIKES_COUNT_BY_PARENT(parentType, parentId, userId),
                    CACHE_KEYS.IS_LIKED_BY_USER(parentType, parentId, userId),
                    CACHE_KEYS.IS_SAVED_BY_USER(parentType, parentId, userId),
                    CACHE_KEYS.COMMENTS_BY_PARENT(parentType, parentId)
                );
            }

            // Delete cache keys
            for (const key of keysToDelete) {
                await cache.delete(key);
            }
        } catch (error) {
            console.error("Error invalidating caches:", error);
        }
    }

    // Like operations
    async createLike(likeData: CreateLikeDTO, userId: number): Promise<Like> {
        try {
            const like = await this.interactionsRepository.createLike(likeData, userId);
            if (like) {
                await this.invalidateUserCaches(userId, likeData.parent_id, likeData.parent_type);
                return like;
            }
            throw new Error("Failed to create like");
        } catch (error) {
            console.error("Error creating like:", error);
            throw error;
        }
    }

    async getLikedContentsByUserId(userId: number) {
        try {
            const cacheKey = CACHE_KEYS.LIKED_CONTENTS_BY_USER(userId);

            // Try to get from cache first
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // If not in cache, fetch from database
            const result = await this.interactionsRepository.getLikedContentsByUserId(userId);

            // Cache the result for 15 minutes (900 seconds)
            await cache.set(cacheKey, result, 900);

            return result;
        } catch (error) {
            console.error("Error getting liked contents by user ID:", error);
            throw error;
        }
    }



    async getLikesCountByParentId(parentId: number, parentType: ParentType, userId: number): Promise<{ likesCount: number; isLiked: boolean }> {
        try {
            const cacheKey = CACHE_KEYS.LIKES_COUNT_BY_PARENT(parentType, parentId, userId);

            // Try to get from cache first
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // If not in cache, fetch from database
            const likesCount = await this.interactionsRepository.getLikesCountByParentId(parentId, parentType);
            const isLiked = await this.isLikedByUser(parentId, parentType, userId);
            const result = { likesCount, isLiked };

            // Cache the result for 5 minutes (300 seconds)
            await cache.set(cacheKey, result, 300);

            return result;
        } catch (error) {
            console.error("Error getting likes count:", error);
            throw error;
        }
    }

    async isLikedByUser(parentId: number, parentType: ParentType, userId: number): Promise<boolean> {
        try {
            const cacheKey = CACHE_KEYS.IS_LIKED_BY_USER(parentType, parentId, userId);

            // Try to get from cache first
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult !== null) {
                return cachedResult;
            }

            // If not in cache, fetch from database
            const like = await this.interactionsRepository.getLikeByUser(parentId, parentType, userId);
            const result = like ? true : false;

            // Cache the result for 5 minutes (300 seconds)
            await cache.set(cacheKey, result, 300);

            return result;
        } catch (error) {
            console.error("Error checking if liked by user:", error);
            throw error;
        }
    }



    // Comment operations
    async createComment(data: CreateCommentDTO, userId: number): Promise<Comment> {
        try {
            const comment = await this.interactionsRepository.createComment(data, userId);
            if (comment) {
                // Invalidate related caches
                await this.invalidateUserCaches(userId, data.parent_id, data.parent_type);
                return comment;
            }
            throw new Error("Failed to create comment");
        } catch (error) {
            console.error("Error creating comment:", error);
            throw error;
        }
    }

    async getCommentsByParentId(parentId: number, parentType: ParentType): Promise<Comment[]> {
        try {
            const cacheKey = CACHE_KEYS.COMMENTS_BY_PARENT(parentType, parentId);

            // Try to get from cache first
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // If not in cache, fetch from database
            const result = await this.interactionsRepository.getCommentsByParentId(parentId, parentType);

            // Cache the result for 10 minutes (600 seconds)
            await cache.set(cacheKey, result, 600);

            return result;
        } catch (error) {
            console.error("Error getting comments by parent ID:", error);
            throw error;
        }
    }

    async getCommentsByUserId(userId: number): Promise<Comment[]> {
        try {
            const cacheKey = CACHE_KEYS.COMMENTS_BY_USER(userId);

            // Try to get from cache first
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // If not in cache, fetch from database
            const result = await this.interactionsRepository.getCommentsByUserId(userId);

            // Cache the result for 15 minutes (900 seconds)
            await cache.set(cacheKey, result, 900);

            return result;
        } catch (error) {
            console.error("Error getting comments by user ID:", error);
            throw error;
        }
    }

    async updateComment(id: number, data: UpdateCommentDTO): Promise<Comment> {
        try {
            const comment = await this.interactionsRepository.updateComment(id, data);
            if (comment) {
                // Invalidate related caches - we need to get the parent info from the comment
                await this.invalidateUserCaches(comment.user_id, comment.parent_id, comment.parent_type);
                return comment;
            }
            throw new Error("Failed to update comment");
        } catch (error) {
            console.error("Error updating comment:", error);
            throw error;
        }
    }

    // Share operations
    async createShare(data: CreateShareDTO, userId: number): Promise<Share> {
        try {
            const share = await this.interactionsRepository.createShare(data, userId);
            if (share) {
                // Invalidate related caches
                await this.invalidateUserCaches(userId);
                return share;
            }
            throw new Error("Failed to create share");
        } catch (error) {
            console.error("Error creating share:", error);
            throw error;
        }
    }

    async getSharesByUserId(userId: number): Promise<Share[]> {
        try {
            const cacheKey = CACHE_KEYS.SHARES_BY_USER(userId);

            // Try to get from cache first
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // If not in cache, fetch from database
            const result = await this.interactionsRepository.getSharesByUserId(userId);

            // Cache the result for 15 minutes (900 seconds)
            await cache.set(cacheKey, result, 900);

            return result;
        } catch (error) {
            console.error("Error getting shares by user ID:", error);
            throw error;
        }
    }

    async updateShare(id: number, data: UpdateShareDTO): Promise<Share> {
        try {
            const share = await this.interactionsRepository.updateShare(id, data);
            if (share) {
                // Invalidate related caches
                await this.invalidateUserCaches(share.user_id);
                return share;
            }
            throw new Error("Failed to update share");
        } catch (error) {
            console.error("Error updating share:", error);
            throw error;
        }
    }

    // Save operations
    async createSave(data: CreateSaveDTO, userId: number): Promise<Save> {
        try {
            const save = await this.interactionsRepository.createSave(data, userId);
            if (save) {
                // Invalidate related caches
                await this.invalidateUserCaches(userId, data.parent_id, data.parent_type);
                return save;
            }
            throw new Error("Failed to create save");
        } catch (error) {
            console.error("Error creating save:", error);
            throw error;
        }
    }

    async getSavesByUserId(userId: number): Promise<Save[]> {
        try {
            const cacheKey = CACHE_KEYS.SAVES_BY_USER(userId);

            // Try to get from cache first
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // If not in cache, fetch from database
            const result = await this.interactionsRepository.getSavesByUserId(userId);

            // Cache the result for 15 minutes (900 seconds)
            await cache.set(cacheKey, result, 900);

            return result;
        } catch (error) {
            console.error("Error getting saves by user ID:", error);
            throw error;
        }
    }

    async getSavedContentsByUserId(userId: number) {
        try {
            const cacheKey = CACHE_KEYS.SAVED_CONTENTS_BY_USER(userId);

            // Try to get from cache first
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // If not in cache, fetch from database
            const result = await this.interactionsRepository.getSavedContentsByUserId(userId);

            // Cache the result for 15 minutes (900 seconds)
            await cache.set(cacheKey, result, 900);

            return result;
        } catch (error) {
            console.error("Error getting saved contents by user ID:", error);
            throw error;
        }
    }

    async deleteSave(id: number): Promise<boolean> {
        try {
            const deletedSave = await this.interactionsRepository.deleteSave(id);

            if (deletedSave) {
                // Invalidate related caches with the deleted save information
                await this.invalidateUserCaches(deletedSave.user_id, deletedSave.parent_id, deletedSave.parent_type);
                return true;
            }

            return false;
        } catch (error) {
            console.error("Error deleting save:", error);
            throw error;
        }
    }

    async isSavedByUser(parentId: number, parentType: ParentType, userId: number): Promise<boolean> {
        try {
            const cacheKey = CACHE_KEYS.IS_SAVED_BY_USER(parentType, parentId, userId);

            // Try to get from cache first
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult !== null) {
                return cachedResult;
            }

            // If not in cache, fetch from database
            const save = await this.interactionsRepository.getSaveByUser(parentId, parentType, userId);
            const result = save ? true : false;

            // Cache the result for 5 minutes (300 seconds)
            await cache.set(cacheKey, result, 300);

            return result;
        } catch (error) {
            console.error("Error checking if saved by user:", error);
            throw error;
        }
    }

    // User Enrollment operations
    async createUserEnrollment(enrollmentData: CreateUserEnrollmentDTO, userId: number): Promise<UserEnrollment> {
        try {
            const enrollment = await this.interactionsRepository.createUserEnrollment(enrollmentData, userId);
            if (enrollment) {
                // Invalidate related caches
                await this.invalidateUserCaches(userId);
                // Also invalidate course-specific caches
                await cache.delete(CACHE_KEYS.USER_ENROLLMENTS_BY_COURSE(enrollmentData.course_id));
                return enrollment;
            }
            throw new Error("Failed to create user enrollment");
        } catch (error) {
            console.error("Error creating user enrollment:", error);
            throw error;
        }
    }


    async getUserEnrollmentsByUserId(userId: number): Promise<UserEnrollment[]> {
        try {
            const cacheKey = CACHE_KEYS.USER_ENROLLMENTS_BY_USER(userId);

            // Try to get from cache first
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // If not in cache, fetch from database
            const result = await this.interactionsRepository.getUserEnrollmentsByUserId(userId);

            // Cache the result for 20 minutes (1200 seconds)
            await cache.set(cacheKey, result, 1200);

            return result;
        } catch (error) {
            console.error("Error getting user enrollments by user ID:", error);
            throw error;
        }
    }

    async getUserEnrollmentsByCourseId(courseId: number): Promise<UserEnrollment[]> {
        try {
            const cacheKey = CACHE_KEYS.USER_ENROLLMENTS_BY_COURSE(courseId);

            // Try to get from cache first
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // If not in cache, fetch from database
            const result = await this.interactionsRepository.getUserEnrollmentsByCourseId(courseId);

            // Cache the result for 15 minutes (900 seconds)
            await cache.set(cacheKey, result, 900);

            return result;
        } catch (error) {
            console.error("Error getting user enrollments by course ID:", error);
            throw error;
        }
    }

    async updateUserEnrollment(id: number, enrollmentData: UpdateUserEnrollmentDTO): Promise<UserEnrollment> {
        try {
            const enrollment = await this.interactionsRepository.updateUserEnrollment(id, enrollmentData);
            if (enrollment) {
                // Invalidate related caches
                await this.invalidateUserCaches(enrollment.user_id);
                // Also invalidate course-specific caches
                await cache.delete(CACHE_KEYS.USER_ENROLLMENTS_BY_COURSE(enrollment.course_id));
                return enrollment;
            }
            throw new Error("Failed to update user enrollment");
        } catch (error) {
            console.error("Error updating user enrollment:", error);
            throw error;
        }
    }

    async deleteUserEnrollment(id: number): Promise<boolean> {
        try {
            const deletedEnrollment = await this.interactionsRepository.deleteUserEnrollment(id);

            if (deletedEnrollment) {
                // Invalidate related caches with the deleted enrollment information
                await this.invalidateUserCaches(deletedEnrollment.user_id);
                // Also invalidate course-specific caches
                await cache.delete(CACHE_KEYS.USER_ENROLLMENTS_BY_COURSE(deletedEnrollment.course_id));
                return true;
            }

            return false;
        } catch (error) {
            console.error("Error deleting user enrollment:", error);
            throw error;
        }
    }

    // Path Enrollment operations
    async enrollInPath(userId: number, pathId: number): Promise<PathEnrollment | null> {
        try {
            const result = await this.interactionsRepository.enrollUserInPath(userId, pathId);
            if (result) {
                // Invalidate path enrollment caches for this user
                await this.invalidateUserCaches(userId);
            }
            return result;
        } catch (error) {
            console.error("Error enrolling in path:", error);
            return null;
        }
    }

    async unenrollFromPath(userId: number, pathId: number): Promise<boolean> {
        try {
            const result = await this.interactionsRepository.unenrollUserFromPath(userId, pathId);
            if (result) {
                // Invalidate path enrollment caches for this user
                await this.invalidateUserCaches(userId);
            }
            return result;
        } catch (error) {
            console.error("Error unenrolling from path:", error);
            return false;
        }
    }

    async getMyPathEnrollments(userId: number, page: number = 1, limit: number = 10): Promise<{ enrollments: PathEnrollment[]; total: number; page: number; limit: number; totalPages: number; }> {
        try {
            const cacheKey = CACHE_KEYS.PATH_ENROLLMENTS_BY_USER(userId, page, limit);

            // Try to get from cache first
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // If not in cache, fetch from database
            const result = await this.interactionsRepository.getUserPathEnrollments(userId, page, limit);

            // Cache the result for 10 minutes (600 seconds)
            await cache.set(cacheKey, result, 600);

            return result;
        } catch (error) {
            console.error("Error getting path enrollments:", error);
            return { enrollments: [], total: 0, page, limit, totalPages: 0 };
        }
    }


}
