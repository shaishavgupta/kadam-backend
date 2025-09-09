export const AdminConfigurations = {
    loginPageBackground: "loginPageBackground",
    homePageBanners: "homePageBanners",
    homePagePopularCategories: "homePagePopularCategories"
} as const;

export interface AdminConfigurationRequest {
    key: string;
    value: any;
    created_by: number;
    updated_by: number;
}

export interface AdminConfigurationResponse {
    id: number;
    key: string;
    value: any;
    created_at: Date;
    updated_at: Date;
    created_by: number;
    updated_by: number;
}
