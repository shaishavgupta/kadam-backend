import { AdminConfigurations, AdminConfigurationRequest, AdminConfigurationResponse } from "../shared/types/admin_types";
import { adminDB } from "./db";

export class AdminRepository {

    async getAdminConfigurations(
        key: keyof typeof AdminConfigurations
    ): Promise<any> {
        const rows = await adminDB.query`
          SELECT value FROM admin_configurations WHERE key = ${key}
        `;

        for await (const row of rows) {
            if (!row.value) return null;

            try {
                // if value is stored as JSON string
                return JSON.parse(row.value);
            } catch {
                // if value is already primitive/string
                return row.value;
            }
        }

        return null;
    }

    async insertAdminConfiguration(
        config: AdminConfigurationRequest
    ): Promise<AdminConfigurationResponse> {
        const result = await adminDB.queryRow`
            INSERT INTO admin_configurations (key, value, created_by, updated_by)
            VALUES (${config.key}, ${JSON.stringify(config.value)}, ${config.created_by}, ${config.updated_by})
            RETURNING id, key, value, created_at, updated_at, created_by, updated_by
        `;

        if (!result) {
            throw new Error("Failed to insert admin configuration");
        }

        return {
            id: result.id,
            key: result.key,
            value: result.value,
            created_at: result.created_at,
            updated_at: result.updated_at,
            created_by: result.created_by,
            updated_by: result.updated_by
        };
    }

    async updateAdminConfiguration(
        key: string,
        config: Omit<AdminConfigurationRequest, 'key'>
    ): Promise<AdminConfigurationResponse> {
        const result = await adminDB.queryRow`
            UPDATE admin_configurations
            SET value = ${JSON.stringify(config.value)},
                updated_by = ${config.updated_by},
                updated_at = now()
            WHERE key = ${key}
            RETURNING id, key, value, created_at, updated_at, created_by, updated_by
        `;

        if (!result) {
            throw new Error("Admin configuration not found or failed to update");
        }

        return {
            id: result.id,
            key: result.key,
            value: result.value,
            created_at: result.created_at,
            updated_at: result.updated_at,
            created_by: result.created_by,
            updated_by: result.updated_by
        };
    }

    async upsertAdminConfiguration(
        config: AdminConfigurationRequest
    ): Promise<AdminConfigurationResponse> {
        const result = await adminDB.queryRow`
            INSERT INTO admin_configurations (key, value, created_by, updated_by)
            VALUES (${config.key}, ${JSON.stringify(config.value)}, ${config.created_by}, ${config.updated_by})
            ON CONFLICT (key)
            DO UPDATE SET
                value = ${JSON.stringify(config.value)},
                updated_by = ${config.updated_by},
                updated_at = now()
            RETURNING id, key, value, created_at, updated_at, created_by, updated_by
        `;

        if (!result) {
            throw new Error("Failed to upsert admin configuration");
        }

        return {
            id: result.id,
            key: result.key,
            value: result.value,
            created_at: result.created_at,
            updated_at: result.updated_at,
            created_by: result.created_by,
            updated_by: result.updated_by
        };
    }
}
