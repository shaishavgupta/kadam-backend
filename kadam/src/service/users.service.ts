import { UserRepository } from "../repository/users.repository";
import { User, CreateUserRequest, UpdateUserRequest, PaginatedUsersResponse } from "../schemas/user";
import { CreateUserWithAuthRequest } from "../schemas/auth";
import { cache } from "../infra/cache";

export class UserService {
    private userRepository: UserRepository;

    // Cache configuration constants
    private readonly CACHE_TTL = {
        USER_DATA: 1800, // 30 minutes for individual user data
        PAGINATION: 600, // 10 minutes for paginated lists
    };

    private readonly PAGINATION_CONFIG = {
        COMMON_LIMITS: [10, 20, 50, 100],
        COMMON_PAGES: [1, 2, 3, 4, 5], // First few pages are most commonly cached
    };

    private readonly CACHE_PREFIXES = {
        USER_BY_ID: 'user:id',
        USER_BY_PHONE: 'user:phone',
        USER_BY_EMAIL: 'user:email',
        USERS_ALL: 'users:all',
    };

    constructor() {
        this.userRepository = new UserRepository();
    }

    // Cache key generation methods
    private getUserByIdCacheKey(id: number): string {
        return `${this.CACHE_PREFIXES.USER_BY_ID}:${id}`;
    }

    private getUserByPhoneCacheKey(phone: string): string {
        return `${this.CACHE_PREFIXES.USER_BY_PHONE}:${phone}`;
    }

    private getUserByEmailCacheKey(email: string): string {
        return `${this.CACHE_PREFIXES.USER_BY_EMAIL}:${email}`;
    }

    private getAllUsersCacheKey(page: number, limit: number): string {
        return `${this.CACHE_PREFIXES.USERS_ALL}:${page}:${limit}`;
    }

    // Cache invalidation methods
    private async invalidateUserCache(user: User): Promise<void> {
        const keys = [
            this.getUserByIdCacheKey(user.id),
            this.getUserByPhoneCacheKey(user.phone),
            user.email ? this.getUserByEmailCacheKey(user.email) : null
        ].filter(Boolean) as string[];

        await Promise.all(keys.map(key => cache.delete(key)));

        // Invalidate pagination cache - we need to delete all possible pagination combinations
        // Since we can't use pattern matching, we'll delete common pagination combinations
        await this.invalidatePaginationCache();
    }

    private async invalidatePaginationCache(): Promise<void> {
        // Delete common pagination combinations
        const paginationKeys: string[] = [];

        // Generate keys for common pagination combinations
        for (const limit of this.PAGINATION_CONFIG.COMMON_LIMITS) {
            for (const page of this.PAGINATION_CONFIG.COMMON_PAGES) {
                paginationKeys.push(this.getAllUsersCacheKey(page, limit));
            }
        }

        // Delete all pagination cache keys
        await Promise.all(paginationKeys.map(key => cache.delete(key)));
    }

    /**
     * Create a new user (for auth service)
     */
    async getOrCreateUser(userData: CreateUserWithAuthRequest): Promise<{ entity: User, newEntity: boolean }> {
        try {
            // Check cache first
            const cacheKey = this.getUserByPhoneCacheKey(userData.phone);
            const cachedUser = await cache.get(cacheKey);

            if (cachedUser) {
                return { entity: cachedUser, newEntity: false };
            }

            const existingUser = await this.userRepository.findUserByPhone(userData.phone);
            if (existingUser) {
                // Cache the user for 30 minutes
                await cache.set(cacheKey, existingUser, this.CACHE_TTL.USER_DATA);
                return { entity: existingUser, newEntity: false };
            }

            const user = await this.userRepository.createUser(userData);

            // Cache the new user
            await cache.set(cacheKey, user, this.CACHE_TTL.USER_DATA);

            return { entity: user, newEntity: true };
        } catch (error) {
            console.error("Error creating user with auth:", error);
            throw error;
        }
    }

    async createUser(userData: CreateUserRequest): Promise<User> {
        try {
            const user = await this.userRepository.createUser(userData);

            // Cache the new user
            const cacheKey = this.getUserByIdCacheKey(user.id);
            await cache.set(cacheKey, user, this.CACHE_TTL.USER_DATA);

            // Invalidate pagination cache
            await this.invalidatePaginationCache();

            return user;
        } catch (error) {
            console.error("Error creating user:", error);
            throw error;
        }
    }

    async getUserById(id: number): Promise<User> {
        try {
            // Check cache first
            const cacheKey = this.getUserByIdCacheKey(id);
            const cachedUser = await cache.get(cacheKey);

            if (cachedUser) {
                return cachedUser;
            }

            const user = await this.userRepository.findUserById(id);
            if (user) {
                // Cache the user for 30 minutes (1800 seconds)
                await cache.set(cacheKey, user, this.CACHE_TTL.USER_DATA);
                return user;
            }
            throw new Error("User not found");
        } catch (error) {
            console.error("Error getting user by ID:", error);
            throw error;
        }
    }

    async getUserByPhone(phone: string): Promise<User> {
        try {
            // Check cache first
            const cacheKey = this.getUserByPhoneCacheKey(phone);
            const cachedUser = await cache.get(cacheKey);

            if (cachedUser) {
                return cachedUser;
            }

            const user = await this.userRepository.findUserByPhone(phone);
            if (user) {
                // Cache the user for 30 minutes (1800 seconds)
                await cache.set(cacheKey, user, this.CACHE_TTL.USER_DATA);
                return user;
            }
            throw new Error("User not found");
        } catch (error) {
            console.error("Error getting user by phone:", error);
            throw error;
        }
    }

    async getUserByEmail(email: string): Promise<User> {
        try {
            // Check cache first
            const cacheKey = this.getUserByEmailCacheKey(email);
            const cachedUser = await cache.get(cacheKey);

            if (cachedUser) {
                return cachedUser;
            }

            const user = await this.userRepository.findUserByEmail(email);
            if (user) {
                // Cache the user for 30 minutes (1800 seconds)
                await cache.set(cacheKey, user, this.CACHE_TTL.USER_DATA);
                return user;
            }
            throw new Error("User not found");
        } catch (error) {
            console.error("Error getting user by email:", error);
            throw error;
        }
    }

    async updateUser(id: number, userData: UpdateUserRequest): Promise<User> {
        try {
            const user = await this.userRepository.updateUser(id, userData);

            // Invalidate all user-related cache entries
            await this.invalidateUserCache(user);

            // Cache the updated user
            const cacheKey = this.getUserByIdCacheKey(user.id);
            await cache.set(cacheKey, user, this.CACHE_TTL.USER_DATA); // 30 minutes

            return user;
        } catch (error) {
            console.error("Error updating user:", error);
            throw error;
        }
    }

    async deleteUser(id: number): Promise<void> {
        try {
            // Get user data before deletion for cache invalidation
            const user = await this.userRepository.findUserById(id);

            await this.userRepository.deleteUser(id);

            // Invalidate all user-related cache entries
            if (user) {
                await this.invalidateUserCache(user);
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            throw error;
        }
    }

    async getAllUsers(page: number = 1, limit: number = 10): Promise<PaginatedUsersResponse> {
        try {
            // Check cache first
            const cacheKey = this.getAllUsersCacheKey(page, limit);
            const cachedUsers = await cache.get(cacheKey);

            if (cachedUsers) {
                return cachedUsers;
            }

            const users = await this.userRepository.getAllUsers(page, limit);

            // Cache the paginated response for 10 minutes - shorter TTL for pagination
            await cache.set(cacheKey, users, this.CACHE_TTL.PAGINATION);

            return users;
        } catch (error) {
            console.error("Error getting all users:", error);
            throw error;
        }
    }
}
