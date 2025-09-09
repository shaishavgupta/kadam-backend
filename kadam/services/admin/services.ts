import { AdminConfigurations, AdminConfigurationRequest, AdminConfigurationResponse } from "../shared/types/admin_types";
import { cache } from "./cache";
import { AdminRepository } from "./repository";

export class AdminService {
    private adminRepository: AdminRepository;

    constructor() {
        this.adminRepository = new AdminRepository();
    }

    async getAdminConfigurations(
        key: keyof typeof AdminConfigurations
    ): Promise<any> {
        const row = await this.adminRepository.getAdminConfigurations(key);

        if (!row[0]?.data) return null;

        try {
            return JSON.parse(row[0].data);
        } catch {
            return row[0].data;
        }
    }

    async insertAdminConfiguration(
        config: AdminConfigurationRequest
    ): Promise<AdminConfigurationResponse> {
        return await this.adminRepository.insertAdminConfiguration(config);
    }

    async updateAdminConfiguration(
        key: string,
        config: Omit<AdminConfigurationRequest, 'key'>
    ): Promise<AdminConfigurationResponse> {
        return await this.adminRepository.updateAdminConfiguration(key, config);
    }

    async upsertAdminConfiguration(
        config: AdminConfigurationRequest
    ): Promise<AdminConfigurationResponse> {
        return await this.adminRepository.upsertAdminConfiguration(config);
    }
}
