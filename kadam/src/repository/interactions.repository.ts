import { db } from "../infra/db";
import {
    Like, CreateLikeDTO, UpdateLikeDTO, Comment, CreateCommentDTO, UpdateCommentDTO,
    Share, CreateShareDTO, UpdateShareDTO, Save, CreateSaveDTO, UserEnrollment, CreateUserEnrollmentDTO, UpdateUserEnrollmentDTO
} from "../schemas/interaction";
import { ParentType } from "../shared/enums";

export class InteractionsRepository {
    // Like operations
    async createLike(likeData: CreateLikeDTO, userId: number): Promise<Like | null> {
        try {
            const result = await db.query(
                `INSERT INTO likes (user_id, parent_id, parent_type, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
                [userId, likeData.parent_id, likeData.parent_type, true]
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
    async createComment(commentData: CreateCommentDTO, userId: number): Promise<Comment | null> {
        try {
            const result = await db.query(
                `INSERT INTO comments (user_id, parent_id, parent_type, comment_text, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
                [userId, commentData.parent_id, commentData.parent_type, commentData.comment_text, commentData.is_active || true]
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
    async createShare(shareData: CreateShareDTO, userId: number): Promise<Share | null> {
        try {
            const result = await db.query(
                `INSERT INTO shares (user_id, parent_id, parent_type, shared_url, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
                [userId, shareData.parent_id, shareData.parent_type, shareData.shared_url]
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
    async createSave(saveData: CreateSaveDTO, userId: number): Promise<Save | null> {
        try {
            const result = await db.query(
                `INSERT INTO saves (user_id, parent_id, parent_type, created_at, updated_at)
                 VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
                [userId, saveData.parent_id, saveData.parent_type]
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

    // User Enrollment operations
    async createUserEnrollment(enrollmentData: CreateUserEnrollmentDTO, userId: number): Promise<UserEnrollment | null> {
        try {
            // First try to update existing enrollment
            const getResult = await db.query(
                `SELECT * FROM user_enrollments
                 WHERE user_id = $1 AND course_id = $2 AND module_id = $3 AND content_id = $4`,
                [userId, enrollmentData.course_id, enrollmentData.module_id, enrollmentData.content_id]
            );

            // If update affected rows, return the updated record
            if (getResult.rows.length > 0) {
                return getResult.rows[0] as UserEnrollment;
            }

            // If no rows were updated, insert new enrollment
            const insertResult = await db.query(
                `INSERT INTO user_enrollments (user_id, course_id, module_id, content_id, progress, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
                [userId, enrollmentData.course_id, enrollmentData.module_id, enrollmentData.content_id, enrollmentData.progress || 0]
            );

            if (insertResult.rows.length > 0) {
                return insertResult.rows[0] as UserEnrollment;
            }
            return null;
        } catch (error) {
            console.error("Error creating user enrollment:", error);
            return null;
        }
    }

    async getUserEnrollmentsByUserId(userId: number): Promise<UserEnrollment[]> {
        try {
            const result = await db.query(
                `SELECT * FROM user_enrollments WHERE user_id = $1 ORDER BY created_at DESC`,
                [userId]
            );
            return result.rows as UserEnrollment[];
        } catch (error) {
            console.error("Error getting user enrollments by user ID:", error);
            return [];
        }
    }

    async getUserEnrollmentsByCourseId(courseId: number): Promise<UserEnrollment[]> {
        try {
            const result = await db.query(
                `SELECT * FROM user_enrollments WHERE course_id = $1 ORDER BY created_at DESC`,
                [courseId]
            );
            return result.rows as UserEnrollment[];
        } catch (error) {
            console.error("Error getting user enrollments by course ID:", error);
            return [];
        }
    }

    async updateUserEnrollment(id: number, enrollmentData: UpdateUserEnrollmentDTO): Promise<UserEnrollment | null> {
        try {
            const updateFields = [];
            const values = [];
            let paramCount = 1;

            if (enrollmentData.completed_at !== undefined) {
                updateFields.push(`completed_at = $${paramCount}`);
                values.push(enrollmentData.completed_at);
                paramCount++;
            }
            if (enrollmentData.progress !== undefined) {
                updateFields.push(`progress = $${paramCount}`);
                values.push(enrollmentData.progress);
                paramCount++;
            }

            if (updateFields.length === 0) {
                return null;
            }

            values.push(id);

            const result = await db.query(
                `UPDATE user_enrollments SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                values
            );

            if (result.rows.length > 0) {
                return result.rows[0] as UserEnrollment;
            }
            return null;
        } catch (error) {
            console.error("Error updating user enrollment:", error);
            return null;
        }
    }

    async deleteUserEnrollment(id: number): Promise<boolean> {
        try {
            const result = await db.query(
                `DELETE FROM user_enrollments WHERE id = $1`,
                [id]
            );
            return (result.rowCount || 0) > 0;
        } catch (error) {
            console.error("Error deleting user enrollment:", error);
            return false;
        }
    }


}
