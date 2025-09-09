import { api, APIError, ErrCode } from "encore.dev/api";
import { CoursesService } from "./service";
import { Tag, Category, Module, ContentWithModule, CreateCourseRequest, UpdateCourseRequest, Course, PublishCourseRequest } from "./types";
import { ApiResponse } from "../shared/types/common";
import { admin } from "~encore/clients";
import { AdminConfigurations } from "../shared/types/admin_types";
import { getAuthData } from "~encore/auth";

const coursesService = new CoursesService();

// Get all contents by course_id with module information
export const getContentsByCourseId = api(
    { expose: true, auth: true, method: "GET", path: "/contents/:courseId" },
    async ({ courseId }: { courseId: number }): Promise<ApiResponse<ContentWithModule[]>> => {
        try {
            const contents = await coursesService.getContentsByCourseId(courseId);
            return {
                success: true,
                data: contents,
                message: "Contents retrieved successfully"
            };
        } catch (error) {
            console.error("Get contents by course ID error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get all modules by creator_id
export const getModulesByCreatorId = api(
    { expose: true, auth: true, method: "GET", path: "/modules/creator/:creatorId" },
    async ({ creatorId }: { creatorId: number }): Promise<ApiResponse<Module[]>> => {
        try {
            const modules = await coursesService.getModulesByCreatorId(creatorId);
            return {
                success: true,
                data: modules,
                message: "Modules retrieved successfully"
            };
        } catch (error) {
            console.error("Get modules by creator ID error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get tags by content, course, and module names
export const getTagsByNames = api(
    { expose: true, auth: true, method: "GET", path: "/tags/search" },
    async ({
        contentName,
        courseName,
        moduleName
    }: {
        contentName?: string;
        courseName?: string;
        moduleName?: string;
    }): Promise<ApiResponse<Tag[]>> => {
        try {
            const tags = await coursesService.getTagsByNames(contentName, courseName, moduleName);
            return {
                success: true,
                data: tags,
                message: "Tags retrieved successfully"
            };
        } catch (error) {
            console.error("Get tags by names error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get all categories
export const getAllCategories = api(
    { expose: true, auth: true, method: "GET", path: "/categories" },
    async (): Promise<ApiResponse<Category[]>> => {
        try {
            const categories = await coursesService.getAllCategories();
            return {
                success: true,
                data: categories,
                message: "Categories retrieved successfully"
            };
        } catch (error) {
            console.error("Get all categories error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Create a new course
export const createCourse = api(
    { expose: true, auth: true, method: "POST", path: "/courses" },
    async (request: CreateCourseRequest): Promise<ApiResponse<{ courseId: number }>> => {
        try {
            const result = await coursesService.createCourse(request);
            return {
                success: true,
                data: result,
                message: "Course created successfully"
            };
        } catch (error) {
            console.error("Create course error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Update a course
export const updateCourse = api(
    { expose: true, auth: true, method: "PATCH", path: "/courses/:id" },
    async ({ id, ...request }: UpdateCourseRequest): Promise<ApiResponse> => {
        try {
            await coursesService.updateCourse({ id, ...request });
            return {
                success: true,
                message: "Course updated successfully"
            };
        } catch (error) {
            console.error("Update course error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get popular categories
export const getPopularCategories = api(
    { expose: true, auth: true, method: "GET", path: "/courses/popular-categories" },
    async (): Promise<ApiResponse<{
        popularCategories: Category[];
    }>> => {
        const categoriesRes = await admin.getAdminConfgurations({
            key: AdminConfigurations.homePagePopularCategories,
        });

        const categories: Category[] = categoriesRes.data ?? [];

        return {
            success: true,
            data: {
                popularCategories: categories
            },
            message: "Popular categories retrieved successfully"
        };
    }
);

// Get courses by category_id
export const getCoursesByCategoryId = api(
    { expose: true, auth: true, method: "GET", path: "/courses/category/:categoryId" },
    async ({ categoryId }: { categoryId: number }): Promise<ApiResponse<Course[]>> => {
        try {
            const courses = await coursesService.getCoursesByCategoryId(categoryId);
            return {
                success: true,
                data: courses,
                message: "Courses retrieved successfully"
            };
        } catch (error) {
            console.error("Get courses by category ID error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Get Currently Enrolled Courses
export const getCurrentlyEnrolledCourses = api(
    { expose: true, auth: true, method: "GET", path: "/courses/currently-enrolled" },
    async (): Promise<ApiResponse<Course[]>> => {
        try {
            const userId = getAuthData()?.userID;
            if (!userId) {
                throw new APIError(ErrCode.InvalidArgument, "User ID is required");
            }
            const courses = await coursesService.getCurrentlyEnrolledCourses(parseInt(userId));
            return {
                success: true,
                data: courses,
                message: "Enrolled courses retrieved successfully"
            };
        } catch (error) {
            console.error("Get currently enrolled courses error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Publish Course
export const publishCourse = api(
    { expose: true, auth: true, method: "POST", path: "/courses/publish" },
    async (request: PublishCourseRequest): Promise<ApiResponse> => {
        try {
            await coursesService.publishCourse(request);
            return {
                success: true,
                message: "Course published successfully"
            };
        } catch (error) {
            console.error("Publish course error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);

// Unpublish Course
export const unpublishCourse = api(
    { expose: true, auth: true, method: "POST", path: "/courses/:courseId/unpublish" },
    async ({ courseId }: { courseId: number }): Promise<ApiResponse> => {
        try {
            await coursesService.unpublishCourse(courseId);
            return {
                success: true,
                message: "Course unpublished successfully"
            };
        } catch (error) {
            console.error("Unpublish course error:", error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(ErrCode.Internal, "Internal server error");
        }
    }
);
