import { userDB } from "./db";
import { User, CreateUserRequest, UpdateUserRequest, Language, Gender, PlanType } from "./types";

export class UserRepository {

    /**
     * Validates phone number format
     */
    private validatePhone(phone: string): boolean {
        const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
        return phoneRegex.test(phone);
    }

    /**
     * Validates email format
     */
    private validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validates user data before database operations
     */
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

    /**
     * Create a new user
     */
    async createUser(userData: CreateUserRequest): Promise<{ user?: User; error?: string }> {
        try {
            // Validate input data
            const validationErrors = this.validateUserData(userData);
            if (validationErrors.length > 0) {
                return { error: validationErrors.join(", ") };
            }

            // Check if user already exists
            const existingUser = await this.findUserByPhone(userData.phone);
            if (existingUser.user) {
                return { error: "User with this phone number already exists" };
            }

            if (userData.email) {
                const existingEmailUser = await this.findUserByEmail(userData.email);
                if (existingEmailUser.user) {
                    return { error: "User with this email already exists" };
                }
            }

            const rows = userDB.query`
        INSERT INTO users (
          email, name, phone, preferred_language, plan_type,
          dob, bio, gender, whatsapp_allowed
        )
        VALUES (${userData.email || null}, ${userData.name || null}, ${userData.phone}, ${userData.preferred_language || Language.ENGLISH}, ${userData.plan_type || PlanType.FREE}, ${userData.dob || null}, ${userData.bio || null}, ${userData.gender || null}, ${userData.whatsapp_allowed || false})
        RETURNING *
      `;

            for await (const row of rows) {
                return { user: row as User };
            }

            return { error: "Failed to create user" };
        } catch (error) {
            console.error("Error creating user:", error);
            return { error: "Failed to create user" };
        }
    }

    /**
     * Find user by ID
     */
    async findUserById(id: number): Promise<{ user?: User; error?: string }> {
        try {
            const rows = userDB.query`SELECT * FROM users WHERE id = ${id} AND is_active = true`;

            for await (const row of rows) {
                return { user: row as User };
            }

            return { error: "User not found" };
        } catch (error) {
            console.error("Error finding user by ID:", error);
            return { error: "Failed to find user" };
        }
    }

    /**
     * Find user by phone number
     */
    async findUserByPhone(phone: string): Promise<{ user?: User; error?: string }> {
        try {
            if (!this.validatePhone(phone)) {
                return { error: "Invalid phone number format" };
            }

            const rows = userDB.query`SELECT * FROM users WHERE phone = ${phone} AND is_active = true`;

            for await (const row of rows) {
                return { user: row as User };
            }

            return { error: "User not found" };
        } catch (error) {
            console.error("Error finding user by phone:", error);
            return { error: "Failed to find user" };
        }
    }

    /**
     * Find user by email
     */
    async findUserByEmail(email: string): Promise<{ user?: User; error?: string }> {
        try {
            if (!this.validateEmail(email)) {
                return { error: "Invalid email format" };
            }

            const rows = userDB.query`SELECT * FROM users WHERE email = ${email} AND is_active = true`;

            for await (const row of rows) {
                return { user: row as User };
            }

            return { error: "User not found" };
        } catch (error) {
            console.error("Error finding user by email:", error);
            return { error: "Failed to find user" };
        }
    }

    /**
     * Update user by ID
     */
    async updateUser(id: number, userData: UpdateUserRequest): Promise<{ user?: User; error?: string }> {
        try {
            // Validate input data
            const validationErrors = this.validateUserData(userData);
            if (validationErrors.length > 0) {
                return { error: validationErrors.join(", ") };
            }

            // Check if user exists
            const existingUser = await this.findUserById(id);
            if (!existingUser.user) {
                return { error: "User not found" };
            }

            // Check email uniqueness if email is being updated
            if (userData.email && userData.email !== existingUser.user.email) {
                const emailCheck = await this.findUserByEmail(userData.email);
                if (emailCheck.user) {
                    return { error: "Email already exists" };
                }
            }

            // Build update query based on provided fields
            const fieldsToUpdate = Object.entries(userData).filter(([_, value]) => value !== undefined);

            if (fieldsToUpdate.length === 0) {
                return { error: "No fields to update" };
            }

            // Create dynamic update query
            let query = "UPDATE users SET ";
            const setParts: string[] = [];
            const values: any[] = [];

            fieldsToUpdate.forEach(([key, value], index) => {
                setParts.push(`${key} = $${index + 1}`);
                values.push(value);
            });

            setParts.push(`updated_at = CURRENT_TIMESTAMP`);
            query += setParts.join(", ");
            query += ` WHERE id = $${values.length + 1} AND is_active = true RETURNING *`;
            values.push(id);

            // For now, let's use a simpler approach with individual field updates
            const rows = userDB.query`
        UPDATE users
        SET
          email = COALESCE(${userData.email}, email),
          name = COALESCE(${userData.name}, name),
          avatar_url = COALESCE(${userData.avatar_url}, avatar_url),
          preferred_language = COALESCE(${userData.preferred_language}, preferred_language),
          plan_type = COALESCE(${userData.plan_type}, plan_type),
          dob = COALESCE(${userData.dob}, dob),
          bio = COALESCE(${userData.bio}, bio),
          gender = COALESCE(${userData.gender}, gender),
          whatsapp_allowed = COALESCE(${userData.whatsapp_allowed}, whatsapp_allowed),
          onboarding_completed = COALESCE(${userData.onboarding_completed}, onboarding_completed),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND is_active = true
        RETURNING *
      `;

            for await (const row of rows) {
                return { user: row as User };
            }

            return { error: "User not found or update failed" };
        } catch (error) {
            console.error("Error updating user:", error);
            return { error: "Failed to update user" };
        }
    }

    /**
     * Soft delete user (set is_active to false)
     */
    async deleteUser(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            const rows = userDB.query`
        UPDATE users
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND is_active = true
        RETURNING id
      `;

            for await (const row of rows) {
                return { success: true };
            }

            return { success: false, error: "User not found" };
        } catch (error) {
            console.error("Error deleting user:", error);
            return { success: false, error: "Failed to delete user" };
        }
    }

    /**
     * Update user's last active timestamp
     */
    async updateLastActive(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            const rows = userDB.query`
        UPDATE users
        SET last_active_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND is_active = true
      `;

            // We don't need to check the result for this operation
            for await (const _ of rows) {
                // Just consume the iterator
            }

            return { success: true };
        } catch (error) {
            console.error("Error updating last active:", error);
            return { success: false, error: "Failed to update last active" };
        }
    }

    /**
     * Get all users with pagination
     */
    async getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number; error?: string }> {
        try {
            const offset = (page - 1) * limit;

            // Get total count
            const countRows = userDB.query`SELECT COUNT(*) as total FROM users WHERE is_active = true`;
            let total = 0;
            for await (const row of countRows) {
                total = parseInt(row.total as string);
                break;
            }

            // Get users with pagination
            const rows = userDB.query`
        SELECT * FROM users
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

            const users: User[] = [];
            for await (const row of rows) {
                users.push(row as User);
            }

            return { users, total };
        } catch (error) {
            console.error("Error getting all users:", error);
            return { users: [], total: 0, error: "Failed to get users" };
        }
    }
}
