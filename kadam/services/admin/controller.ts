import { api, APIError, ErrCode } from "encore.dev/api";
import { ApiResponse } from "../shared/types/common";
import { AdminConfigurations, AdminConfigurationRequest, AdminConfigurationResponse } from "../shared/types/admin_types";
import { AdminService } from "./services";

/**
 * Get Login Page Content
*/
const adminService = new AdminService();

export const getAdminConfgurations = api<{ key: string }, ApiResponse<any>>(
    { expose: false, auth: false, method: "GET", path: "/configurations" },
    async ({ key }) => {
        try {
            const data = await adminService.getAdminConfigurations(
                key as keyof typeof AdminConfigurations
            );

            return {
                success: true,
                data: data,
                message: "Admin configuration retrieved successfully",
            };
        } catch (error) {
            console.error("Get admin configurations error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

/**
 * Insert Admin Configuration
 */
export const insertAdminConfiguration = api<AdminConfigurationRequest, ApiResponse<AdminConfigurationResponse>>(
    { expose: false, auth: false, method: "POST", path: "/configurations" },
    async (config) => {
        try {
            const data = await adminService.insertAdminConfiguration(config);

            return {
                success: true,
                data: data,
                message: "Admin configuration created successfully",
            };
        } catch (error) {
            console.error("Insert admin configuration error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

/**
 * Update Admin Configuration
 */
export const updateAdminConfiguration = api<{ key: string } & Omit<AdminConfigurationRequest, 'key'>, ApiResponse<AdminConfigurationResponse>>(
    { expose: false, auth: false, method: "PUT", path: "/configurations/:key" },
    async ({ key, ...config }) => {
        try {
            const data = await adminService.updateAdminConfiguration(key, config);

            return {
                success: true,
                data: data,
                message: "Admin configuration updated successfully",
            };
        } catch (error) {
            console.error("Update admin configuration error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            if (error instanceof Error && error.message.includes("not found")) {
                throw new APIError(ErrCode.NotFound, "Admin configuration not found");
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

/**
 * Upsert Admin Configuration (Insert or Update)
 */
export const upsertAdminConfiguration = api<AdminConfigurationRequest, ApiResponse<AdminConfigurationResponse>>(
    { expose: false, auth: false, method: "POST", path: "/configurations/upsert" },
    async (config) => {
        try {
            const data = await adminService.upsertAdminConfiguration(config);

            return {
                success: true,
                data: data,
                message: "Admin configuration upserted successfully",
            };
        } catch (error) {
            console.error("Upsert admin configuration error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);
