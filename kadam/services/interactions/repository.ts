import { interactionsDB } from "./db";
import {
    Like, CreateLikeDTO, UpdateLikeDTO, ParentType, Comment, CreateCommentDTO, UpdateCommentDTO,
    Share, CreateShareDTO, UpdateShareDTO, Save, CreateSaveDTO, View, CreateViewDTO, UpdateViewDTO,
    Rating, CreateRatingDTO, UpdateRatingDTO
} from "./types";

export class InteractionsRepository {

    async createLike(data: CreateLikeDTO): Promise<{ like?: Like; error?: string }> {
        try {
            const result = await interactionsDB.query`INSERT INTO likes (user_id, parent_id, parent_type, is_active)
                    VALUES (${data.user_id}, ${data.parent_id}, ${data.parent_type}, true)
                    RETURNING *`
            for await (const row of result) {
                return { like: row as Like };
            }
            return { error: "Failed to create like" };
        } catch (error) {
            console.error("Error creating like:", error);
            return { error: "Failed to create like" };
        }
    }

    async findLikesByUserId(userId: number): Promise<{ likes?: Like[]; error?: string }> {
        const likes: Like[] = [];
        const result = await interactionsDB.query`SELECT * FROM likes WHERE user_id = ${userId}`;
        for await (const row of result) {
            likes.push(row as Like);
        }
        return { likes };
    }

    async findAllLikes(): Promise<{ likes?: Like[]; error?: string }> {
        const likes: Like[] = [];
        const result = await interactionsDB.query`SELECT * FROM likes ORDER BY created_at DESC`;
        for await (const row of result) {
            likes.push(row as Like);
        }
        return { likes };
    }

    async updateLike(id: number, data: UpdateLikeDTO): Promise<{ success: boolean; error?: string }> {
        const result = await interactionsDB.query`UPDATE likes
       SET is_active = COALESCE(${data.is_active}, is_active),
           created_at = now()
       WHERE id = ${id}
       RETURNING *`
        for await (const row of result) {
            return { success: true };
        }
        return { success: false, error: "Failed to update like" };
    }

    async getLikesCountByParent(parentId: number, parentType: ParentType): Promise<{ likes?: number; error?: string }> {
        try {
            const result = await interactionsDB.query`SELECT count(*) as count FROM likes WHERE parent_id = ${parentId} AND parent_type = ${parentType}`;
            for await (const row of result) {
                return { likes: row.count as number };
            }
            return { likes: 0 };
        } catch (error) {
            console.error("Error getting likes count:", error);
            return { error: "Failed to get likes count" };
        }
    }

    async createComment(data: CreateCommentDTO): Promise<Comment> {
        const result = await interactionsDB.query`INSERT INTO comments (user_id, parent_id, parent_type, comment_text, is_active)
           VALUES (${data.user_id}, ${data.parent_id}, ${data.parent_type}, ${data.comment_text}, COALESCE(${data.is_active}, true))
           RETURNING *`;
        for await (const row of result) {
            return row as Comment;
        }
        throw new Error("Failed to create comment");
    }

    async getCommentByParentId(parentId: number, parentType: ParentType): Promise<Comment | null> {
        const result = await interactionsDB.query`SELECT * FROM comments WHERE parent_id = ${parentId} AND parent_type = ${parentType}`;
        for await (const row of result) {
            return row as Comment;
        }
        return null;
    }

    async listUserComments(userId: number): Promise<Comment[]> {
        const comments: Comment[] = [];
        const result = await interactionsDB.query`SELECT * FROM comments WHERE user_id = ${userId} ORDER BY created_at DESC`;
        for await (const row of result) {
            comments.push(row as Comment);
        }
        return comments;
    }

    async updateComment(id: number, data: UpdateCommentDTO): Promise<Comment | null> {
        const result = await interactionsDB.query`UPDATE comments
           SET comment_text = COALESCE(${data.comment_text}, comment_text),
               is_active = COALESCE(${data.is_active}, is_active),
               updated_at = now()
           WHERE id = ${id}
           RETURNING *`;
        for await (const row of result) {
            return row as Comment;
        }
        return null;
    }

    // Shares methods
    async createShare(data: CreateShareDTO): Promise<{ share?: Share; error?: string }> {
        try {
            const result = await interactionsDB.query`INSERT INTO shares (user_id, parent_id, parent_type, shared_url)
                    VALUES (${data.user_id}, ${data.parent_id}, ${data.parent_type}, ${data.shared_url})
                    RETURNING *`;
            for await (const row of result) {
                return { share: row as Share };
            }
            return { error: "Failed to create share" };
        } catch (error) {
            console.error("Error creating share:", error);
            return { error: "Failed to create share" };
        }
    }

    async getSharesByUserId(userId: number): Promise<{ shares?: Share[]; error?: string }> {
        try {
            const shares: Share[] = [];
            const result = await interactionsDB.query`SELECT * FROM shares WHERE user_id = ${userId} ORDER BY created_at DESC`;
            for await (const row of result) {
                shares.push(row as Share);
            }
            return { shares };
        } catch (error) {
            console.error("Error getting shares:", error);
            return { error: "Failed to get shares" };
        }
    }

    async updateShare(id: number, data: UpdateShareDTO): Promise<{ success: boolean; error?: string }> {
        try {
            const result = await interactionsDB.query`UPDATE shares
                SET shared_url = COALESCE(${data.shared_url}, shared_url)
                WHERE id = ${id}
                RETURNING *`;
            for await (const row of result) {
                return { success: true };
            }
            return { success: false, error: "Failed to update share" };
        } catch (error) {
            console.error("Error updating share:", error);
            return { success: false, error: "Failed to update share" };
        }
    }

    // Saves methods
    async createSave(data: CreateSaveDTO): Promise<{ save?: Save; error?: string }> {
        try {
            const result = await interactionsDB.query`INSERT INTO saves (user_id, parent_id, parent_type)
                    VALUES (${data.user_id}, ${data.parent_id}, ${data.parent_type})
                    RETURNING *`;
            for await (const row of result) {
                return { save: row as Save };
            }
            return { error: "Failed to create save" };
        } catch (error) {
            console.error("Error creating save:", error);
            return { error: "Failed to create save" };
        }
    }

    async getSavesByUserId(userId: number): Promise<{ saves?: Save[]; error?: string }> {
        try {
            const saves: Save[] = [];
            const result = await interactionsDB.query`SELECT * FROM saves WHERE user_id = ${userId} ORDER BY created_at DESC`;
            for await (const row of result) {
                saves.push(row as Save);
            }
            return { saves };
        } catch (error) {
            console.error("Error getting saves:", error);
            return { error: "Failed to get saves" };
        }
    }

    async deleteSave(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            const result = await interactionsDB.query`DELETE FROM saves WHERE id = ${id}`;
            let deleted = false;
            for await (const row of result) {
                deleted = true;
            }
            return { success: deleted };
        } catch (error) {
            console.error("Error deleting save:", error);
            return { success: false, error: "Failed to delete save" };
        }
    }

    // Views methods
    async createView(data: CreateViewDTO): Promise<{ view?: View; error?: string }> {
        try {
            const result = await interactionsDB.query`INSERT INTO views (user_id, parent_id, parent_type, duration)
                    VALUES (${data.user_id}, ${data.parent_id}, ${data.parent_type}, ${data.duration})
                    RETURNING *`;
            for await (const row of result) {
                return { view: row as View };
            }
            return { error: "Failed to create view" };
        } catch (error) {
            console.error("Error creating view:", error);
            return { error: "Failed to create view" };
        }
    }

    async getViewsByUserId(userId: number): Promise<{ views?: View[]; error?: string }> {
        try {
            const views: View[] = [];
            const result = await interactionsDB.query`SELECT * FROM views WHERE user_id = ${userId} ORDER BY created_at DESC`;
            for await (const row of result) {
                views.push(row as View);
            }
            return { views };
        } catch (error) {
            console.error("Error getting views:", error);
            return { error: "Failed to get views" };
        }
    }

    async updateView(id: number, data: UpdateViewDTO): Promise<{ success: boolean; error?: string }> {
        try {
            const result = await interactionsDB.query`UPDATE views
                SET duration = COALESCE(${data.duration}, duration)
                WHERE id = ${id}
                RETURNING *`;
            for await (const row of result) {
                return { success: true };
            }
            return { success: false, error: "Failed to update view" };
        } catch (error) {
            console.error("Error updating view:", error);
            return { success: false, error: "Failed to update view" };
        }
    }

    // Ratings methods
    async createRating(data: CreateRatingDTO): Promise<{ rating?: Rating; error?: string }> {
        try {
            const result = await interactionsDB.query`INSERT INTO ratings (user_id, course_id, rating, review)
                    VALUES (${data.user_id}, ${data.course_id}, ${data.rating}, ${data.review})
                    RETURNING *`;
            for await (const row of result) {
                return { rating: row as Rating };
            }
            return { error: "Failed to create rating" };
        } catch (error) {
            console.error("Error creating rating:", error);
            return { error: "Failed to create rating" };
        }
    }

    async getRatingsByUserId(userId: number): Promise<{ ratings?: Rating[]; error?: string }> {
        try {
            const ratings: Rating[] = [];
            const result = await interactionsDB.query`SELECT * FROM ratings WHERE user_id = ${userId} ORDER BY created_at DESC`;
            for await (const row of result) {
                ratings.push(row as Rating);
            }
            return { ratings };
        } catch (error) {
            console.error("Error getting ratings:", error);
            return { error: "Failed to get ratings" };
        }
    }

    async getRatingsByCourseId(courseId: number): Promise<{ ratings?: Rating[]; error?: string }> {
        try {
            const ratings: Rating[] = [];
            const result = await interactionsDB.query`SELECT * FROM ratings WHERE course_id = ${courseId} ORDER BY created_at DESC`;
            for await (const row of result) {
                ratings.push(row as Rating);
            }
            return { ratings };
        } catch (error) {
            console.error("Error getting ratings:", error);
            return { error: "Failed to get ratings" };
        }
    }

    async updateRating(id: number, data: UpdateRatingDTO): Promise<{ success: boolean; error?: string }> {
        try {
            const result = await interactionsDB.query`UPDATE ratings
                SET rating = COALESCE(${data.rating}, rating),
                    review = COALESCE(${data.review}, review)
                WHERE id = ${id}
                RETURNING *`;
            for await (const row of result) {
                return { success: true };
            }
            return { success: false, error: "Failed to update rating" };
        } catch (error) {
            console.error("Error updating rating:", error);
            return { success: false, error: "Failed to update rating" };
        }
    }
};
