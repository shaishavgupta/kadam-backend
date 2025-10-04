import {
    CreateLikeDTO, Like, UpdateLikeDTO, Comment, CreateCommentDTO, UpdateCommentDTO,
    Share, CreateShareDTO, UpdateShareDTO, Save, CreateSaveDTO, View, CreateViewDTO, UpdateViewDTO
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

    async getLikesByUserId(userId: number): Promise<Like[]> {
        try {
            return this.interactionsRepository.getLikesByUserId(userId);
        } catch (error) {
            console.error("Error getting likes by user ID:", error);
            throw error;
        }
    }

    async getAllLikes(): Promise<Like[]> {
        try {
            return this.interactionsRepository.getAllLikes();
        } catch (error) {
            console.error("Error getting all likes:", error);
            throw error;
        }
    }

    async updateLike(id: number, data: UpdateLikeDTO): Promise<Like> {
        try {
            const like = await this.interactionsRepository.updateLike(id, data);
            if (like) {
                return like;
            }
            throw new Error("Failed to update like");
        } catch (error) {
            console.error("Error updating like:", error);
            throw error;
        }
    }

    async getLikesCountByParentId(parentId: number, parentType: ParentType): Promise<number> {
        try {
            return this.interactionsRepository.getLikesCountByParentId(parentId, parentType);
        } catch (error) {
            console.error("Error getting likes count:", error);
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

    async deleteSave(id: number): Promise<boolean> {
        try {
            return await this.interactionsRepository.deleteSave(id);
        } catch (error) {
            console.error("Error deleting save:", error);
            throw error;
        }
    }

    // View operations
    async createView(data: CreateViewDTO, userId: number): Promise<View> {
        try {
            const view = await this.interactionsRepository.createView(data, userId);
            if (view) {
                return view;
            }
            throw new Error("Failed to create view");
        } catch (error) {
            console.error("Error creating view:", error);
            throw error;
        }
    }

    async getViewsByUserId(userId: number): Promise<View[]> {
        try {
            return this.interactionsRepository.getViewsByUserId(userId);
        } catch (error) {
            console.error("Error getting views by user ID:", error);
            throw error;
        }
    }

    async updateView(id: number, data: UpdateViewDTO): Promise<View> {
        try {
            const view = await this.interactionsRepository.updateView(id, data);
            if (view) {
                return view;
            }
            throw new Error("Failed to update view");
        } catch (error) {
            console.error("Error updating view:", error);
            throw error;
        }
    }

}
