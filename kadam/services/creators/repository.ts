import { creatorDB } from "./db";
import {
    Creator,
    Qualification,
    Achievement,
    CreateCreatorRequest,
    UpdateCreatorRequest,
    CreateQualificationRequest,
    CreateAchievementRequest,
    CreatorWithDetails,
    QualificationType,
    AchievementType
} from "./types";

export class CreatorRepository {

    /**
     * Validates creator data before database operations
     */
    private validateCreatorData(creatorData: CreateCreatorRequest | UpdateCreatorRequest): string[] {
        const errors: string[] = [];

        if ('name' in creatorData && creatorData.name) {
            if (creatorData.name.trim().length < 2) {
                errors.push("Name must be at least 2 characters long");
            }
            if (creatorData.name.trim().length > 100) {
                errors.push("Name must be less than 100 characters");
            }
        }

        if (creatorData.bio && creatorData.bio.length > 1000) {
            errors.push("Bio must be less than 1000 characters");
        }

        if (creatorData.rating !== undefined) {
            if (creatorData.rating < 0 || creatorData.rating > 5) {
                errors.push("Rating must be between 0 and 5");
            }
        }

        return errors;
    }

    /**
     * Validates qualification data
     */
    private validateQualificationData(qualificationData: CreateQualificationRequest): string[] {
        const errors: string[] = [];

        if (!qualificationData.name || qualificationData.name.trim().length < 2) {
            errors.push("Qualification name must be at least 2 characters long");
        }

        if (!qualificationData.institution || qualificationData.institution.trim().length < 2) {
            errors.push("Institution name must be at least 2 characters long");
        }

        if (!Object.values(QualificationType).includes(qualificationData.qualification_type)) {
            errors.push("Invalid qualification type. Must be 'degree', 'diploma', or 'certification'");
        }

        if (qualificationData.start_date && qualificationData.end_date) {
            const startDate = new Date(qualificationData.start_date);
            const endDate = new Date(qualificationData.end_date);
            if (startDate > endDate) {
                errors.push("Start date cannot be after end date");
            }
        }

        return errors;
    }

    /**
     * Validates achievement data
     */
    private validateAchievementData(achievementData: CreateAchievementRequest): string[] {
        const errors: string[] = [];

        if (!achievementData.title || achievementData.title.trim().length < 2) {
            errors.push("Achievement title must be at least 2 characters long");
        }

        if (!Object.values(AchievementType).includes(achievementData.types)) {
            errors.push("Invalid achievement type. Must be 'academic', 'sports', or 'professional'");
        }

        if (!achievementData.date_achieved) {
            errors.push("Date achieved is required");
        } else {
            const achievedDate = new Date(achievementData.date_achieved);
            const today = new Date();
            if (achievedDate > today) {
                errors.push("Date achieved cannot be in the future");
            }
        }

        return errors;
    }

    /**
     * Create a new creator
     */
    async createCreator(creatorData: CreateCreatorRequest): Promise<{ creator?: Creator; error?: string }> {
        try {
            // Validate input data
            const validationErrors = this.validateCreatorData(creatorData);
            if (validationErrors.length > 0) {
                return { error: validationErrors.join(", ") };
            }

            const rows = creatorDB.query`
        INSERT INTO creators (name, bio, profile_pic, rating)
        VALUES (${creatorData.name}, ${creatorData.bio || null}, ${creatorData.profile_pic || null}, ${creatorData.rating || null})
        RETURNING *
      `;

            for await (const row of rows) {
                return { creator: row as Creator };
            }

            return { error: "Failed to create creator" };
        } catch (error) {
            console.error("Error creating creator:", error);
            return { error: "Failed to create creator" };
        }
    }

    /**
     * Find creator by ID
     */
    async findCreatorById(id: number): Promise<{ creator?: Creator; error?: string }> {
        try {
            const rows = creatorDB.query`SELECT * FROM creators WHERE id = ${id}`;

            for await (const row of rows) {
                return { creator: row as Creator };
            }

            return { error: "Creator not found" };
        } catch (error) {
            console.error("Error finding creator by ID:", error);
            return { error: "Failed to find creator" };
        }
    }

    /**
     * Find creator by name
     */
    async findCreatorByName(name: string): Promise<{ creator?: Creator; error?: string }> {
        try {
            const rows = creatorDB.query`SELECT * FROM creators WHERE name ILIKE ${`%${name}%`}`;

            for await (const row of rows) {
                return { creator: row as Creator };
            }

            return { error: "Creator not found" };
        } catch (error) {
            console.error("Error finding creator by name:", error);
            return { error: "Failed to find creator" };
        }
    }

    /**
     * Update creator by ID
     */
    async updateCreator(id: number, creatorData: UpdateCreatorRequest): Promise<{ creator?: Creator; error?: string }> {
        try {
            // Validate input data
            const validationErrors = this.validateCreatorData(creatorData);
            if (validationErrors.length > 0) {
                return { error: validationErrors.join(", ") };
            }

            // Check if creator exists
            const existingCreator = await this.findCreatorById(id);
            if (!existingCreator.creator) {
                return { error: "Creator not found" };
            }

            const rows = creatorDB.query`
        UPDATE creators
        SET
          name = COALESCE(${creatorData.name}, name),
          bio = COALESCE(${creatorData.bio}, bio),
          profile_pic = COALESCE(${creatorData.profile_pic}, profile_pic),
          rating = COALESCE(${creatorData.rating}, rating),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;

            for await (const row of rows) {
                return { creator: row as Creator };
            }

            return { error: "Creator not found or update failed" };
        } catch (error) {
            console.error("Error updating creator:", error);
            return { error: "Failed to update creator" };
        }
    }

    /**
     * Delete creator by ID
     */
    async deleteCreator(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            const rows = creatorDB.query`
        DELETE FROM creators WHERE id = ${id}
        RETURNING id
      `;

            for await (const row of rows) {
                return { success: true };
            }

            return { success: false, error: "Creator not found" };
        } catch (error) {
            console.error("Error deleting creator:", error);
            return { success: false, error: "Failed to delete creator" };
        }
    }

    /**
     * Get all creators with pagination
     */
    async getAllCreators(page: number = 1, limit: number = 10): Promise<{ creators: Creator[]; total: number; error?: string }> {
        try {
            const offset = (page - 1) * limit;

            // Get total count
            const countRows = creatorDB.query`SELECT COUNT(*) as total FROM creators`;
            let total = 0;
            for await (const row of countRows) {
                total = parseInt(row.total as string);
                break;
            }

            // Get creators with pagination
            const rows = creatorDB.query`
        SELECT * FROM creators
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

            const creators: Creator[] = [];
            for await (const row of rows) {
                creators.push(row as Creator);
            }

            return { creators, total };
        } catch (error) {
            console.error("Error getting all creators:", error);
            return { creators: [], total: 0, error: "Failed to get creators" };
        }
    }

    /**
     * Get creator with all details (qualifications and achievements)
     */
    async getCreatorWithDetails(id: number): Promise<{ creatorWithDetails?: CreatorWithDetails; error?: string }> {
        try {
            // Get creator
            const creatorResult = await this.findCreatorById(id);
            if (!creatorResult.creator) {
                return { error: "Creator not found" };
            }

            // Get qualifications
            const qualificationRows = creatorDB.query`
        SELECT q.* FROM qualifications q
        INNER JOIN creator_qualifications cq ON q.id = cq.qualification_id
        WHERE cq.creator_id = ${id}
        ORDER BY q.created_at DESC
      `;

            const qualifications: Qualification[] = [];
            for await (const row of qualificationRows) {
                qualifications.push(row as Qualification);
            }

            // Get achievements
            const achievementRows = creatorDB.query`
        SELECT a.* FROM achievements a
        INNER JOIN creator_achievements ca ON a.id = ca.achievement_id
        WHERE ca.creator_id = ${id}
        ORDER BY a.date_achieved DESC
      `;

            const achievements: Achievement[] = [];
            for await (const row of achievementRows) {
                achievements.push(row as Achievement);
            }

            return {
                creatorWithDetails: {
                    creator: creatorResult.creator,
                    qualifications,
                    achievements
                }
            };
        } catch (error) {
            console.error("Error getting creator with details:", error);
            return { error: "Failed to get creator details" };
        }
    }

    /**
     * Create qualification
     */
    async createQualification(qualificationData: CreateQualificationRequest): Promise<{ qualification?: Qualification; error?: string }> {
        try {
            // Validate input data
            const validationErrors = this.validateQualificationData(qualificationData);
            if (validationErrors.length > 0) {
                return { error: validationErrors.join(", ") };
            }

            const rows = creatorDB.query`
        INSERT INTO qualifications (name, institution, qualification_type, start_date, end_date, grade)
        VALUES (${qualificationData.name}, ${qualificationData.institution}, ${qualificationData.qualification_type}, ${qualificationData.start_date || null}, ${qualificationData.end_date || null}, ${qualificationData.grade || null})
        RETURNING *
      `;

            for await (const row of rows) {
                return { qualification: row as Qualification };
            }

            return { error: "Failed to create qualification" };
        } catch (error) {
            console.error("Error creating qualification:", error);
            return { error: "Failed to create qualification" };
        }
    }

    /**
     * Create achievement
     */
    async createAchievement(achievementData: CreateAchievementRequest): Promise<{ achievement?: Achievement; error?: string }> {
        try {
            // Validate input data
            const validationErrors = this.validateAchievementData(achievementData);
            if (validationErrors.length > 0) {
                return { error: validationErrors.join(", ") };
            }

            const rows = creatorDB.query`
        INSERT INTO achievements (title, description, types, date_achieved)
        VALUES (${achievementData.title}, ${achievementData.description || null}, ${achievementData.types}, ${achievementData.date_achieved})
        RETURNING *
      `;

            for await (const row of rows) {
                return { achievement: row as Achievement };
            }

            return { error: "Failed to create achievement" };
        } catch (error) {
            console.error("Error creating achievement:", error);
            return { error: "Failed to create achievement" };
        }
    }

    /**
     * Link qualification to creator
     */
    async linkQualificationToCreator(creatorId: number, qualificationId: number): Promise<{ success: boolean; error?: string }> {
        try {
            // Check if creator exists
            const creatorResult = await this.findCreatorById(creatorId);
            if (!creatorResult.creator) {
                return { success: false, error: "Creator not found" };
            }

            const rows = creatorDB.query`
        INSERT INTO creator_qualifications (qualification_id, creator_id)
        VALUES (${qualificationId}, ${creatorId})
        ON CONFLICT (qualification_id, creator_id) DO NOTHING
        RETURNING id
      `;

            for await (const row of rows) {
                return { success: true };
            }

            return { success: false, error: "Failed to link qualification" };
        } catch (error) {
            console.error("Error linking qualification to creator:", error);
            return { success: false, error: "Failed to link qualification" };
        }
    }

    /**
     * Link achievement to creator
     */
    async linkAchievementToCreator(creatorId: number, achievementId: number): Promise<{ success: boolean; error?: string }> {
        try {
            // Check if creator exists
            const creatorResult = await this.findCreatorById(creatorId);
            if (!creatorResult.creator) {
                return { success: false, error: "Creator not found" };
            }

            const rows = creatorDB.query`
        INSERT INTO creator_achievements (achievement_id, creator_id)
        VALUES (${achievementId}, ${creatorId})
        ON CONFLICT (achievement_id, creator_id) DO NOTHING
        RETURNING id
      `;

            for await (const row of rows) {
                return { success: true };
            }

            return { success: false, error: "Failed to link achievement" };
        } catch (error) {
            console.error("Error linking achievement to creator:", error);
            return { success: false, error: "Failed to link achievement" };
        }
    }

    /**
     * Search creators by name
     */
    async searchCreatorsByName(name: string, page: number = 1, limit: number = 10): Promise<{ creators: Creator[]; total: number; error?: string }> {
        try {
            const offset = (page - 1) * limit;

            // Get total count
            const countRows = creatorDB.query`SELECT COUNT(*) as total FROM creators WHERE name ILIKE ${`%${name}%`}`;
            let total = 0;
            for await (const row of countRows) {
                total = parseInt(row.total as string);
                break;
            }

            // Get creators with pagination
            const rows = creatorDB.query`
        SELECT * FROM creators
        WHERE name ILIKE ${`%${name}%`}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

            const creators: Creator[] = [];
            for await (const row of rows) {
                creators.push(row as Creator);
            }

            return { creators, total };
        } catch (error) {
            console.error("Error searching creators:", error);
            return { creators: [], total: 0, error: "Failed to search creators" };
        }
    }
}
