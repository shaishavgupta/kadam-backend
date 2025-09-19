import { AdminConfigurations, AdminConfigurationRequest, AdminConfigurationResponse } from "../shared/types/admin.types";
import { db } from "../infra/db";

export class AdminRepository {
    async getAdminConfigurations(key: keyof typeof AdminConfigurations): Promise<AdminConfigurationResponse | null> {
        try {
            const result = await db.query(
                `SELECT value FROM admin_configurations WHERE key = $1`,
                [key]
            );
            if (result.rows.length > 0) {
                return result.rows[0].value;
            }
            return null;
        } catch (error) {
            console.error("Error getting admin configurations:", error);
            return null;
        }
    }

    async setAdminConfigurations(request: AdminConfigurationRequest): Promise<AdminConfigurationResponse | null> {
        try {
            const result = await db.query(
                `INSERT INTO admin_configurations (key, value) VALUES ($1, $2)
                 ON CONFLICT (key) DO UPDATE SET value = $2
                 RETURNING value`,
                [request.key, request.value]
            );
            if (result.rows.length > 0) {
                return result.rows[0].value;
            }
            return null;
        } catch (error) {
            console.error("Error setting admin configurations:", error);
            return null;
        }
    }

    async logAdminActivity(request: any): Promise<boolean> {
        try {
            await db.query(
                `INSERT INTO admin_activities (admin_id, activity_type, description, metadata)
                 VALUES ($1, $2, $3, $4)`,
                [request.admin_id, request.activity_type, request.description, request.metadata]
            );
            return true;
        } catch (error) {
            console.error("Error logging admin activity:", error);
            return false;
        }
    }

    async getAdminActivities(page: number = 1, limit: number = 10): Promise<any[]> {
        try {
            const offset = (page - 1) * limit;
            const result = await db.query(
                `SELECT * FROM admin_activities ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
                [limit, offset]
            );
            return result.rows;
        } catch (error) {
            console.error("Error getting admin activities:", error);
            return [];
        }
    }
}
