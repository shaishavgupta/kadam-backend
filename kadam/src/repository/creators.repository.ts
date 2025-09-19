import { db } from "../infra/db";
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
} from "../shared/types/creators.types";

export class CreatorRepository {
    async createCreator(creatorData: CreateCreatorRequest): Promise<Creator | null> {
        try {
            const result = await db.query(
                `INSERT INTO creators (name, bio, created_at, updated_at)
                 VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
                [creatorData.name, creatorData.bio]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Creator;
            }
            return null;
        } catch (error) {
            console.error("Error creating creator:", error);
            return null;
        }
    }

    async getCreatorById(id: number): Promise<Creator | null> {
        try {
            const result = await db.query(
                `SELECT * FROM creators WHERE id = $1`,
                [id]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Creator;
            }
            return null;
        } catch (error) {
            console.error("Error getting creator by ID:", error);
            return null;
        }
    }

    async getCreatorByName(name: string): Promise<Creator[]> {
        try {
            const result = await db.query(
                `SELECT * FROM creators WHERE name ILIKE $1`,
                [`%${name}%`]
            );
            return result.rows as Creator[];
        } catch (error) {
            console.error("Error getting creator by name:", error);
            return [];
        }
    }

    async updateCreator(id: number, creatorData: UpdateCreatorRequest): Promise<Creator | null> {
        try {
            const result = await db.query(
                `UPDATE creators SET name = $1, bio = $2, updated_at = NOW()
                 WHERE id = $3 RETURNING *`,
                [creatorData.name, creatorData.bio, id]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Creator;
            }
            return null;
        } catch (error) {
            console.error("Error updating creator:", error);
            return null;
        }
    }

    async deleteCreator(id: number): Promise<boolean> {
        try {
            const result = await db.query(
                `UPDATE creators SET is_active = false, updated_at = NOW() WHERE id = $1`,
                [id]
            );
            return (result.rowCount || 0) > 0;
        } catch (error) {
            console.error("Error deleting creator:", error);
            return false;
        }
    }

    async getAllCreators(page: number, limit: number): Promise<PaginatedCreatorsResponse> {
        try {
            const offset = (page - 1) * limit;

            const countResult = await db.query(
                `SELECT COUNT(*) as total FROM creators WHERE is_active = true`
            );
            const total = parseInt(countResult.rows[0].total as string);

            const result = await db.query(
                `SELECT * FROM creators WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
                [limit, offset]
            );

            return {
                creators: result.rows as Creator[],
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error("Error getting all creators:", error);
            return { creators: [], total: 0, page, limit, totalPages: 0 };
        }
    }

    async getCreatorQualifications(creatorId: number): Promise<Qualification[]> {
        try {
            const result = await db.query(
                `SELECT * FROM qualifications WHERE creator_id = $1 ORDER BY created_at DESC`,
                [creatorId]
            );
            return result.rows as Qualification[];
        } catch (error) {
            console.error("Error getting creator qualifications:", error);
            return [];
        }
    }

    async getCreatorAchievements(creatorId: number): Promise<Achievement[]> {
        try {
            const result = await db.query(
                `SELECT * FROM achievements WHERE creator_id = $1 ORDER BY created_at DESC`,
                [creatorId]
            );
            return result.rows as Achievement[];
        } catch (error) {
            console.error("Error getting creator achievements:", error);
            return [];
        }
    }

    async addQualification(creatorId: number, qualificationData: CreateQualificationRequest): Promise<Qualification | null> {
        try {
            const result = await db.query(
                `INSERT INTO qualifications (creator_id, title, institution, year, description, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
                [creatorId, qualificationData.title, qualificationData.institution, qualificationData.year, qualificationData.description]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Qualification;
            }
            return null;
        } catch (error) {
            console.error("Error adding qualification:", error);
            return null;
        }
    }

    async addAchievement(creatorId: number, achievementData: CreateAchievementRequest): Promise<Achievement | null> {
        try {
            const result = await db.query(
                `INSERT INTO achievements (creator_id, title, description, year, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
                [creatorId, achievementData.title, achievementData.description, achievementData.year]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Achievement;
            }
            return null;
        } catch (error) {
            console.error("Error adding achievement:", error);
            return null;
        }
    }

    async updateQualification(id: number, qualificationData: Partial<CreateQualificationRequest>): Promise<Qualification | null> {
        try {
            const result = await db.query(
                `UPDATE qualifications SET title = $1, institution = $2, year = $3, description = $4, updated_at = NOW()
                 WHERE id = $5 RETURNING *`,
                [qualificationData.title, qualificationData.institution, qualificationData.year, qualificationData.description, id]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Qualification;
            }
            return null;
        } catch (error) {
            console.error("Error updating qualification:", error);
            return null;
        }
    }

    async updateAchievement(id: number, achievementData: Partial<CreateAchievementRequest>): Promise<Achievement | null> {
        try {
            const result = await db.query(
                `UPDATE achievements SET title = $1, description = $2, year = $3, updated_at = NOW()
                 WHERE id = $4 RETURNING *`,
                [achievementData.title, achievementData.description, achievementData.year, id]
            );

            if (result.rows.length > 0) {
                return result.rows[0] as Achievement;
            }
            return null;
        } catch (error) {
            console.error("Error updating achievement:", error);
            return null;
        }
    }

    async deleteQualification(id: number): Promise<boolean> {
        try {
            const result = await db.query(
                `DELETE FROM qualifications WHERE id = $1`,
                [id]
            );
            return (result.rowCount || 0) > 0;
        } catch (error) {
            console.error("Error deleting qualification:", error);
            return false;
        }
    }

    async deleteAchievement(id: number): Promise<boolean> {
        try {
            const result = await db.query(
                `DELETE FROM achievements WHERE id = $1`,
                [id]
            );
            return (result.rowCount || 0) > 0;
        } catch (error) {
            console.error("Error deleting achievement:", error);
            return false;
        }
    }

    async searchCreators(name: string, page: number = 1, limit: number = 10): Promise<PaginatedCreatorsResponse> {
        try {
            const offset = (page - 1) * limit;

            const countResult = await db.query(
                `SELECT COUNT(*) as total FROM creators WHERE name ILIKE $1 AND is_active = true`,
                [`%${name}%`]
            );
            const total = parseInt(countResult.rows[0].total as string);

            const result = await db.query(
                `SELECT * FROM creators WHERE name ILIKE $1 AND is_active = true ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
                [`%${name}%`, limit, offset]
            );

            return {
                creators: result.rows as Creator[],
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error("Error searching creators:", error);
            return { creators: [], total: 0, page, limit, totalPages: 0 };
        }
    }

    async getCreatorStats(creatorId: number): Promise<CreatorStats | null> {
        try {
            const result = await db.query(
                `SELECT
                    COUNT(DISTINCT c.id) as total_courses,
                    COUNT(DISTINCT CASE WHEN c.is_published = true THEN c.id END) as published_courses,
                    COALESCE(AVG(r.rating), 0) as avg_rating,
                    COUNT(DISTINCT r.id) as num_ratings
                 FROM creators cr
                 LEFT JOIN courses c ON cr.id = c.creator_id
                 LEFT JOIN ratings r ON c.id = r.course_id
                 WHERE cr.id = $1`,
                [creatorId]
            );

            if (result.rows.length > 0) {
                const row = result.rows[0];
                return {
                    total_courses: parseInt(row.total_courses) || 0,
                    published_courses: parseInt(row.published_courses) || 0,
                    avg_rating: parseFloat(row.avg_rating) || 0,
                    num_ratings: parseInt(row.num_ratings) || 0
                };
            }
            return null;
        } catch (error) {
            console.error("Error getting creator stats:", error);
            return null;
        }
    }
}
