import {
    CreateLikeDTO, Like, UpdateLikeDTO, ParentType, Comment, CreateCommentDTO, UpdateCommentDTO,
    Share, CreateShareDTO, UpdateShareDTO, Save, CreateSaveDTO, View, CreateViewDTO, UpdateViewDTO,
    Rating, CreateRatingDTO, UpdateRatingDTO
} from "./types";
import { InteractionsRepository } from "./repository";

export class InteractionsService {
    private interactionsRepository: InteractionsRepository;
    constructor() {
        this.interactionsRepository = new InteractionsRepository();
    }

    async createLike(data: CreateLikeDTO): Promise<{ like?: Like; error?: string }> {
        return await this.interactionsRepository.createLike(data);
    }

    async getLikeByUserId(userId: number): Promise<{ likes?: Like[]; error?: string }> {
        return await this.interactionsRepository.findLikesByUserId(userId);
    }

    async getAllLikes(): Promise<{ likes?: Like[]; error?: string }> {
        return await this.interactionsRepository.findAllLikes();
    }

    async updateLike(id: number, data: UpdateLikeDTO): Promise<{ success: boolean; error?: string }> {
        return await this.interactionsRepository.updateLike(id, data);
    }

    async getLikesCountByParent(parentId: number, parentType: ParentType): Promise<{ likes?: number; error?: string }> {
        return await this.interactionsRepository.getLikesCountByParent(parentId, parentType);
    }

    async createComment(data: CreateCommentDTO): Promise<Comment> {
        return await this.interactionsRepository.createComment(data);
    }

    async getCommentByParentId(parentId: number, parentType: ParentType): Promise<Comment | null> {
        return await this.interactionsRepository.getCommentByParentId(parentId, parentType);
    }

    async listUserComments(userId: number): Promise<Comment[]> {
        return await this.interactionsRepository.listUserComments(userId);
    }

    async updateComment(id: number, data: UpdateCommentDTO): Promise<Comment | null> {
        return await this.interactionsRepository.updateComment(id, data);
    }

    // Shares methods
    async createShare(data: CreateShareDTO): Promise<{ share?: Share; error?: string }> {
        return await this.interactionsRepository.createShare(data);
    }

    async getSharesByUserId(userId: number): Promise<{ shares?: Share[]; error?: string }> {
        return await this.interactionsRepository.getSharesByUserId(userId);
    }

    async updateShare(id: number, data: UpdateShareDTO): Promise<{ success: boolean; error?: string }> {
        return await this.interactionsRepository.updateShare(id, data);
    }

    // Saves methods
    async createSave(data: CreateSaveDTO): Promise<{ save?: Save; error?: string }> {
        return await this.interactionsRepository.createSave(data);
    }

    async getSavesByUserId(userId: number): Promise<{ saves?: Save[]; error?: string }> {
        return await this.interactionsRepository.getSavesByUserId(userId);
    }

    async deleteSave(id: number): Promise<{ success: boolean; error?: string }> {
        return await this.interactionsRepository.deleteSave(id);
    }

    // Views methods
    async createView(data: CreateViewDTO): Promise<{ view?: View; error?: string }> {
        return await this.interactionsRepository.createView(data);
    }

    async getViewsByUserId(userId: number): Promise<{ views?: View[]; error?: string }> {
        return await this.interactionsRepository.getViewsByUserId(userId);
    }

    async updateView(id: number, data: UpdateViewDTO): Promise<{ success: boolean; error?: string }> {
        return await this.interactionsRepository.updateView(id, data);
    }

    // Ratings methods
    async createRating(data: CreateRatingDTO): Promise<{ rating?: Rating; error?: string }> {
        return await this.interactionsRepository.createRating(data);
    }

    async getRatingsByUserId(userId: number): Promise<{ ratings?: Rating[]; error?: string }> {
        return await this.interactionsRepository.getRatingsByUserId(userId);
    }

    async getRatingsByCourseId(courseId: number): Promise<{ ratings?: Rating[]; error?: string }> {
        return await this.interactionsRepository.getRatingsByCourseId(courseId);
    }

    async updateRating(id: number, data: UpdateRatingDTO): Promise<{ success: boolean; error?: string }> {
        return await this.interactionsRepository.updateRating(id, data);
    }
}
