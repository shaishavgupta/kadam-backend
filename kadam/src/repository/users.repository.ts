import { db } from "../infra/db";
import {
    User,
    CreateUserRequest,
    UpdateUserRequest,
    Language,
    Gender,
    PlanType,
    PaginatedUsersResponse
} from "../shared/types/users.types";

export class UserRepository {

    private transformDatabaseRow(row: any): User {
        return {
            id: row.id,
            email: row.email || undefined,
            name: row.name || undefined,
            phone: row.phone,
            avatar_url: row.avatar_url || undefined,
            preferred_language: row.preferred_language,
            plan_type: row.plan_type,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            is_active: row.is_active,
            last_active_at: row.last_active_at ? new Date(row.last_active_at) : undefined,
            paid_at: row.paid_at ? new Date(row.paid_at) : undefined,
            dob: row.dob ? new Date(row.dob) : undefined,
            bio: row.bio || undefined,
            gender: row.gender && Object.values(Gender).includes(row.gender) ? row.gender : undefined,
            onboarding_completed: row.onboarding_completed,
            whatsapp_allowed: row.whatsapp_allowed
        };
    }

    private validatePhone(phone: string): boolean {
        const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
        return phoneRegex.test(phone);
    }

    private validateEmail(email: string): boolean {
        const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
        return emailRegex.test(email);
    }

    private validateUserData(userData: CreateUserRequest | UpdateUserRequest): string[] {
        const errors: string[] = [];

        if ('phone' in userData && userData.phone) {
            if (!this.validatePhone(userData.phone)) {
                errors.push("Invalid phone number format");
            }
        }

        if (userData.email && !this.validateEmail(userData.email)) {
            errors.push("Invalid email format");
        }

        if (userData.preferred_language && !Object.values(Language).includes(userData.preferred_language)) {
            errors.push("Invalid language. Must be 'en' or 'hi'");
        }

        if (userData.gender && !Object.values(Gender).includes(userData.gender)) {
            errors.push("Invalid gender. Must be 'male', 'female', or 'others'");
        }

        if (userData.plan_type && !Object.values(PlanType).includes(userData.plan_type)) {
            errors.push("Invalid plan type. Must be 'free', 'premium', or 'pro'");
        }

        return errors;
    }

    async createUser(userData: CreateUserRequest): Promise<User> {
        const validationErrors = this.validateUserData(userData);
        if (validationErrors.length > 0) {
            throw new Error(validationErrors.join(", "));
        }

        if (await this.findUserByPhone(userData.phone)) {
            throw new Error("User with this phone number already exists");
        }

        if (userData.email) {
            if (await this.findUserByEmail(userData.email)) {
                throw new Error("User with this email already exists");
            }
        }

        const result = await db.query(
            `INSERT INTO users (
              email, name, phone, preferred_language, plan_type,
              dob, bio, gender, whatsapp_allowed, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING *`,
            [userData.email || null, userData.name || null, userData.phone, userData.preferred_language || Language.ENGLISH, userData.plan_type || PlanType.FREE, userData.dob || null, userData.bio || null, userData.gender || null, userData.whatsapp_allowed || false]
        );

        if (result.rows.length > 0) {
            return this.transformDatabaseRow(result.rows[0]);
        }

        throw new Error("Failed to create user");
    }

    async findUserById(id: number): Promise<User | null> {
        const result = await db.query(
            `SELECT * FROM users WHERE id = $1 AND is_active = true`,
            [id]
        );
        return result.rows.length > 0 ? this.transformDatabaseRow(result.rows[0]) : null;
    }

    async findUserByPhone(phone: string): Promise<User | null> {
        if (!this.validatePhone(phone)) {
            throw new Error("Invalid phone number format");
        }
        const result = await db.query(
            `SELECT * FROM users WHERE phone = $1 AND is_active = true`,
            [phone]
        );
        return result.rows.length > 0 ? this.transformDatabaseRow(result.rows[0]) : null;
    }

    async findUserByEmail(email: string): Promise<User | null> {
        if (!this.validateEmail(email)) {
            throw new Error("Invalid email format");
        }
        const result = await db.query(
            `SELECT * FROM users WHERE email = $1 AND is_active = true`,
            [email]
        );
        return result.rows.length > 0 ? this.transformDatabaseRow(result.rows[0]) : null;
    }

    async updateUser(id: number, userData: UpdateUserRequest): Promise<User> {
        const validationErrors = this.validateUserData(userData);
        if (validationErrors.length > 0) {
            throw new Error(validationErrors.join(", "));
        }

        const existingUser = await this.findUserById(id);
        if (!existingUser) {
            throw new Error("User not found");
        }

        if (userData.email && userData.email !== existingUser.email) {
            if (await this.findUserByEmail(userData.email)) {
                throw new Error("Email already exists");
            }
        }

        const fieldsToUpdate = Object.entries(userData).filter(([_, value]) => value !== undefined);

        if (fieldsToUpdate.length === 0) {
            throw new Error("No fields to update");
        }

        const result = await db.query(
            `UPDATE users
             SET
               email = COALESCE($1, email),
               name = COALESCE($2, name),
               avatar_url = COALESCE($3, avatar_url),
               preferred_language = COALESCE($4, preferred_language),
               plan_type = COALESCE($5, plan_type),
               dob = COALESCE($6, dob),
               bio = COALESCE($7, bio),
               gender = COALESCE($8, gender),
               whatsapp_allowed = COALESCE($9, whatsapp_allowed),
               onboarding_completed = COALESCE($10, onboarding_completed),
               updated_at = CURRENT_TIMESTAMP
             WHERE id = $11 AND is_active = true
             RETURNING *`,
            [userData.email, userData.name, userData.avatar_url, userData.preferred_language, userData.plan_type, userData.dob, userData.bio, userData.gender, userData.whatsapp_allowed, userData.onboarding_completed, id]
        );

        if (result.rows.length > 0) {
            return this.transformDatabaseRow(result.rows[0]);
        }

        throw new Error("User not found or update failed");
    }

    async deleteUser(id: number): Promise<void> {
        const result = await db.query(
            `UPDATE users
             SET is_active = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND is_active = true
             RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            throw new Error("User not found");
        }
    }

    async updateLastActive(id: number): Promise<void> {
        await db.query(
            `UPDATE users
             SET last_active_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND is_active = true`,
            [id]
        );
    }

    async getAllUsers(page: number, limit: number): Promise<PaginatedUsersResponse> {
        const offset = (page - 1) * limit;

        const countResult = await db.query(
            `SELECT COUNT(*) as total FROM users WHERE is_active = true`
        );
        const total = parseInt(countResult.rows[0].total as string);

        const result = await db.query(
            `SELECT * FROM users
             WHERE is_active = true
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const users: User[] = result.rows.map(row => this.transformDatabaseRow(row));

        return {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }
}
