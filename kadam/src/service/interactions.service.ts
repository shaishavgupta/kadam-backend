import {
    CreateLikeDTO, Like, Comment, CreateCommentDTO, UpdateCommentDTO,
    Share, CreateShareDTO, UpdateShareDTO, Save, CreateSaveDTO, UserEnrollment, CreateUserEnrollmentDTO, UpdateUserEnrollmentDTO, PathEnrollment
} from "../schemas/interaction";
import { ParentType } from "../shared/enums";
import { InteractionsRepository } from "../repository/interactions.repository";

export class InteractionsService {
    private interactionsRepository: InteractionsRepository;

    constructor() {
        this.interactionsRepository = new InteractionsRepository();
    }

    // Like operations
    async createLike(likeData: CreateLikeDTO, userId: number): Promise<Like> {
        try {
            const like = await this.interactionsRepository.createLike(likeData, userId);
            if (like) {
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
            return this.interactionsRepository.getLikedContentsByUserId(userId);
        } catch (error) {
            console.error("Error getting liked contents by user ID:", error);
            throw error;
        }
    }



    async getLikesCountByParentId(parentId: number, parentType: ParentType, userId: number): Promise<{ likesCount: number; isLiked: boolean }> {
        try {
            const likesCount = await this.interactionsRepository.getLikesCountByParentId(parentId, parentType);
            const isLiked = await this.isLikedByUser(parentId, parentType, userId);
            return { likesCount, isLiked };
        } catch (error) {
            console.error("Error getting likes count:", error);
            throw error;
        }
    }

    async isLikedByUser(parentId: number, parentType: ParentType, userId: number): Promise<boolean> {
        try {
            const like = await this.interactionsRepository.getLikeByUser(parentId, parentType, userId);
            return like ? true : false;
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
            return this.interactionsRepository.getCommentsByParentId(parentId, parentType);
        } catch (error) {
            console.error("Error getting comments by parent ID:", error);
            throw error;
        }
    }

    async getCommentsByUserId(userId: number): Promise<Comment[]> {
        try {
            return this.interactionsRepository.getCommentsByUserId(userId);
        } catch (error) {
            console.error("Error getting comments by user ID:", error);
            throw error;
        }
    }

    async updateComment(id: number, data: UpdateCommentDTO): Promise<Comment> {
        try {
            const comment = await this.interactionsRepository.updateComment(id, data);
            if (comment) {
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
            return this.interactionsRepository.getSharesByUserId(userId);
        } catch (error) {
            console.error("Error getting shares by user ID:", error);
            throw error;
        }
    }

    async updateShare(id: number, data: UpdateShareDTO): Promise<Share> {
        try {
            const share = await this.interactionsRepository.updateShare(id, data);
            if (share) {
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
            return this.interactionsRepository.getSavesByUserId(userId);
        } catch (error) {
            console.error("Error getting saves by user ID:", error);
            throw error;
        }
    }

    async getSavedContentsByUserId(userId: number) {
        try {
            return this.interactionsRepository.getSavedContentsByUserId(userId);
        } catch (error) {
            console.error("Error getting saved contents by user ID:", error);
            throw error;
        }
    }

    async deleteSave(id: number): Promise<boolean> {
        try {
            return await this.interactionsRepository.deleteSave(id);
        } catch (error) {
            console.error("Error deleting save:", error);
            throw error;
        }
    }

    async isSavedByUser(parentId: number, parentType: ParentType, userId: number): Promise<boolean> {
        try {
            const save = await this.interactionsRepository.getSaveByUser(parentId, parentType, userId);
            return save ? true : false;
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
            return await this.interactionsRepository.getUserEnrollmentsByUserId(userId);
        } catch (error) {
            console.error("Error getting user enrollments by user ID:", error);
            throw error;
        }
    }

    async getUserEnrollmentsByCourseId(courseId: number): Promise<UserEnrollment[]> {
        try {
            return await this.interactionsRepository.getUserEnrollmentsByCourseId(courseId);
        } catch (error) {
            console.error("Error getting user enrollments by course ID:", error);
            throw error;
        }
    }

    async updateUserEnrollment(id: number, enrollmentData: UpdateUserEnrollmentDTO): Promise<UserEnrollment> {
        try {
            const enrollment = await this.interactionsRepository.updateUserEnrollment(id, enrollmentData);
            if (enrollment) {
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
            return await this.interactionsRepository.deleteUserEnrollment(id);
        } catch (error) {
            console.error("Error deleting user enrollment:", error);
            throw error;
        }
    }

    // Path Enrollment operations
    async enrollInPath(userId: number, pathId: number): Promise<PathEnrollment | null> {
        try {
            return await this.interactionsRepository.enrollUserInPath(userId, pathId);
        } catch (error) {
            console.error("Error enrolling in path:", error);
            return null;
        }
    }

    async unenrollFromPath(userId: number, pathId: number): Promise<boolean> {
        try {
            return await this.interactionsRepository.unenrollUserFromPath(userId, pathId);
        } catch (error) {
            console.error("Error unenrolling from path:", error);
            return false;
        }
    }

    async getMyPathEnrollments(userId: number, page: number = 1, limit: number = 10): Promise<{ enrollments: PathEnrollment[]; total: number; page: number; limit: number; totalPages: number; }> {
        try {
            return await this.interactionsRepository.getUserPathEnrollments(userId, page, limit);
        } catch (error) {
            console.error("Error getting path enrollments:", error);
            return { enrollments: [], total: 0, page, limit, totalPages: 0 };
        }
    }


}
