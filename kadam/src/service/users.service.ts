import { UserRepository } from "../repository/users.repository";
import { User, CreateUserRequest, UpdateUserRequest, PaginatedUsersResponse } from "../shared/types/users.types";
import { CreateUserWithAuthRequest } from "../schemas/auth";

export class UserService {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    /**
     * Create a new user (for auth service)
     */
    async getOrCreateUser(userData: CreateUserWithAuthRequest): Promise<User> {
        try {
            return this.userRepository.createUser(userData);
        } catch (error) {
            console.error("Error creating user with auth:", error);
            throw error;
        }
    }

    async createUser(userData: CreateUserRequest): Promise<User> {
        try {
            return this.userRepository.createUser(userData);
        } catch (error) {
            console.error("Error creating user:", error);
            throw error;
        }
    }

    async getUserById(id: number): Promise<User> {
        try {
            const user = await this.userRepository.findUserById(id);
            if (user) {
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
            const user = await this.userRepository.findUserByPhone(phone);
            if (user) {
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
            const user = await this.userRepository.findUserByEmail(email);
            if (user) {
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
            return this.userRepository.updateUser(id, userData);
        } catch (error) {
            console.error("Error updating user:", error);
            throw error;
        }
    }

    async deleteUser(id: number): Promise<void> {
        try {
            await this.userRepository.deleteUser(id);
        } catch (error) {
            console.error("Error deleting user:", error);
            throw error;
        }
    }

    async getAllUsers(page: number = 1, limit: number = 10): Promise<PaginatedUsersResponse> {
        try {
            return this.userRepository.getAllUsers(page, limit);
        } catch (error) {
            console.error("Error getting all users:", error);
            throw error;
        }
    }
}
