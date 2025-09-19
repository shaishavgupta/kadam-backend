import { db } from "../infra/db";
import {
    Like, CreateLikeDTO, UpdateLikeDTO, ParentType, Comment, CreateCommentDTO, UpdateCommentDTO,
    Share, CreateShareDTO, UpdateShareDTO, Save, CreateSaveDTO, View, CreateViewDTO, UpdateViewDTO,
    Rating, CreateRatingDTO, UpdateRatingDTO
} from "../shared/types/interactions.types";

export class InteractionsRepository {
    // Like operations
    async createLike(likeData: CreateLikeDTO): Promise<Like | null> {
        try {
            const result = await db.query(
                `INSERT INTO likes (user_id, parent_id, parent_type, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
                [likeData.user_id, likeData.parent_id, likeData.parent_type, true]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Like;
            }
            return null;
        } catch (error) {
            console.error("Error creating like:", error);
            return null;
        }
    }

    async getLikesByUserId(userId: number): Promise<Like[]> {
        try {
            const result = await db.query(
                `SELECT * FROM likes WHERE user_id = $1 ORDER BY created_at DESC`,
                [userId]
            );
            return result.rows as Like[];
        } catch (error) {
            console.error("Error getting likes by user ID:", error);
            return [];
        }
    }

    async getAllLikes(): Promise<Like[]> {
        try {
            const result = await db.query(
                `SELECT * FROM likes ORDER BY created_at DESC`
            );
            return result.rows as Like[];
        } catch (error) {
            console.error("Error getting all likes:", error);
            return [];
        }
    }

    async updateLike(id: number, likeData: UpdateLikeDTO): Promise<Like | null> {
        try {
            const result = await db.query(
                `UPDATE likes SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
                [likeData.is_active, id]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Like;
            }
            return null;
        } catch (error) {
            console.error("Error updating like:", error);
            return null;
        }
    }

    async getLikesCountByParentId(parentId: number, parentType: ParentType): Promise<number> {
        try {
            const result = await db.query(
                `SELECT COUNT(*) as count FROM likes WHERE parent_id = $1 AND parent_type = $2 AND is_active = true`,
                [parentId, parentType]
            );
            return parseInt(result.rows[0].count as string) || 0;
        } catch (error) {
            console.error("Error getting likes count:", error);
            return 0;
        }
    }

    // Comment operations
    async createComment(commentData: CreateCommentDTO): Promise<Comment | null> {
        try {
            const result = await db.query(
                `INSERT INTO comments (user_id, parent_id, parent_type, comment_text, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
                [commentData.user_id, commentData.parent_id, commentData.parent_type, commentData.comment_text, commentData.is_active || true]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Comment;
            }
            return null;
        } catch (error) {
            console.error("Error creating comment:", error);
            return null;
        }
    }

    async getCommentsByParentId(parentId: number, parentType: ParentType): Promise<Comment[]> {
        try {
            const result = await db.query(
                `SELECT * FROM comments WHERE parent_id = $1 AND parent_type = $2 ORDER BY created_at DESC`,
                [parentId, parentType]
            );
            return result.rows as Comment[];
        } catch (error) {
            console.error("Error getting comments by parent ID:", error);
            return [];
        }
    }

    async getCommentsByUserId(userId: number): Promise<Comment[]> {
        try {
            const result = await db.query(
                `SELECT * FROM comments WHERE user_id = $1 ORDER BY created_at DESC`,
                [userId]
            );
            return result.rows as Comment[];
        } catch (error) {
            console.error("Error getting comments by user ID:", error);
            return [];
        }
    }

    async updateComment(id: number, commentData: UpdateCommentDTO): Promise<Comment | null> {
        try {
            const result = await db.query(
                `UPDATE comments SET comment_text = $1, is_active = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
                [commentData.comment_text, commentData.is_active, id]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Comment;
            }
            return null;
        } catch (error) {
            console.error("Error updating comment:", error);
            return null;
        }
    }

    // Share operations
    async createShare(shareData: CreateShareDTO): Promise<Share | null> {
        try {
            const result = await db.query(
                `INSERT INTO shares (user_id, parent_id, parent_type, shared_url, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
                [shareData.user_id, shareData.parent_id, shareData.parent_type, shareData.shared_url]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Share;
            }
            return null;
        } catch (error) {
            console.error("Error creating share:", error);
            return null;
        }
    }

    async getSharesByUserId(userId: number): Promise<Share[]> {
        try {
            const result = await db.query(
                `SELECT * FROM shares WHERE user_id = $1 ORDER BY created_at DESC`,
                [userId]
            );
            return result.rows as Share[];
        } catch (error) {
            console.error("Error getting shares by user ID:", error);
            return [];
        }
    }

    async updateShare(id: number, shareData: UpdateShareDTO): Promise<Share | null> {
        try {
            const result = await db.query(
                `UPDATE shares SET shared_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
                [shareData.shared_url, id]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Share;
            }
            return null;
        } catch (error) {
            console.error("Error updating share:", error);
            return null;
        }
    }

    // Save operations
    async createSave(saveData: CreateSaveDTO): Promise<Save | null> {
        try {
            const result = await db.query(
                `INSERT INTO saves (user_id, parent_id, parent_type, created_at, updated_at)
                 VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
                [saveData.user_id, saveData.parent_id, saveData.parent_type]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Save;
            }
            return null;
        } catch (error) {
            console.error("Error creating save:", error);
            return null;
        }
    }

    async getSavesByUserId(userId: number): Promise<Save[]> {
        try {
            const result = await db.query(
                `SELECT * FROM saves WHERE user_id = $1 ORDER BY created_at DESC`,
                [userId]
            );
            return result.rows as Save[];
        } catch (error) {
            console.error("Error getting saves by user ID:", error);
            return [];
        }
    }

    async deleteSave(id: number): Promise<boolean> {
        try {
            const result = await db.query(
                `DELETE FROM saves WHERE id = $1`,
                [id]
            );
            return (result.rowCount || 0) > 0;
        } catch (error) {
            console.error("Error deleting save:", error);
            return false;
        }
    }

    // View operations
    async createView(viewData: CreateViewDTO): Promise<View | null> {
        try {
            const result = await db.query(
                `INSERT INTO views (user_id, parent_id, parent_type, duration, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
                [viewData.user_id, viewData.parent_id, viewData.parent_type, viewData.duration]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as View;
            }
            return null;
        } catch (error) {
            console.error("Error creating view:", error);
            return null;
        }
    }

    async getViewsByUserId(userId: number): Promise<View[]> {
        try {
            const result = await db.query(
                `SELECT * FROM views WHERE user_id = $1 ORDER BY created_at DESC`,
                [userId]
            );
            return result.rows as View[];
        } catch (error) {
            console.error("Error getting views by user ID:", error);
            return [];
        }
    }

    async updateView(id: number, viewData: UpdateViewDTO): Promise<View | null> {
        try {
            const result = await db.query(
                `UPDATE views SET duration = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
                [viewData.duration, id]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as View;
            }
            return null;
        } catch (error) {
            console.error("Error updating view:", error);
            return null;
        }
    }

    // Rating operations
    async createRating(ratingData: CreateRatingDTO): Promise<Rating | null> {
        try {
            const result = await db.query(
                `INSERT INTO ratings (user_id, course_id, rating, review, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
                [ratingData.user_id, ratingData.course_id, ratingData.rating, ratingData.review]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Rating;
            }
            return null;
        } catch (error) {
            console.error("Error creating rating:", error);
            return null;
        }
    }

    async getRatingsByUserId(userId: number): Promise<Rating[]> {
        try {
            const result = await db.query(
                `SELECT * FROM ratings WHERE user_id = $1 ORDER BY created_at DESC`,
                [userId]
            );
            return result.rows as Rating[];
        } catch (error) {
            console.error("Error getting ratings by user ID:", error);
            return [];
        }
    }

    async getRatingsByCourseId(courseId: number): Promise<Rating[]> {
        try {
            const result = await db.query(
                `SELECT * FROM ratings WHERE course_id = $1 ORDER BY created_at DESC`,
                [courseId]
            );
            return result.rows as Rating[];
        } catch (error) {
            console.error("Error getting ratings by course ID:", error);
            return [];
        }
    }

    async updateRating(id: number, ratingData: UpdateRatingDTO): Promise<Rating | null> {
        try {
            const result = await db.query(
                `UPDATE ratings SET rating = $1, review = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
                [ratingData.rating, ratingData.review, id]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Rating;
            }
            return null;
        } catch (error) {
            console.error("Error updating rating:", error);
            return null;
        }
    }
}
