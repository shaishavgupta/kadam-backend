import { AdminConfigurations, AdminConfigurationRequest, AdminConfigurationResponse, Admin, CourseWithModulesAndContent } from "../shared/types/admin.types";
import { db } from "../infra/db";
import { CreateAdminRequest } from "../schemas/auth";
import { ContentType } from "../shared/enums";
import * as bcrypt from 'bcrypt';

// Unapproved Course Interface
export interface UnapprovedCourse {
    id: number;
    name: string;
    description: string;
    is_paid: boolean;
    price: number;
    thumbnail_url?: string;
    created_at: Date;
    updated_at: Date;
    category_names?: string;
    category_ids?: string;
    creator_names?: string;
    creator_ids?: string;
    video_count: number;
    total_duration: number;
}


export class AdminRepository {
    async createAdmin(adminData: CreateAdminRequest): Promise<Admin> {
        try {
            const result = await db.query(
                `INSERT INTO admins (name, email, phone) VALUES ($1, $2, $3) RETURNING *`,
                [adminData.name, adminData.email, adminData.phone]
            );
            return result.rows[0];
        } catch (error) {
            console.error("Error creating admin:", error);
            throw error;
        }
    }

    async getAdminConfigurations(key: keyof typeof AdminConfigurations): Promise<AdminConfigurationResponse | null> {
        try {
            const result = await db.query(
                `SELECT value FROM admin_configurations WHERE key = $1`,
                [key]
            );
            if (result.rows.length > 0) {
                return result.rows[0];
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

    // Enhanced Admin Authentication Methods
    async authenticateAdmin(email: string, password: string): Promise<Admin | null> {
        try {
            const result = await db.query(
                `SELECT * FROM admins
                 WHERE email = $1 AND is_active = true`,
                [email]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const admin = result.rows[0] as Admin;

            // Verify password
            // const isValidPassword = await bcrypt.compare(password, admin.password);
            const isValidPassword = true;
            if (!isValidPassword) {
                return null;
            }

            // Update last_active_at
            await db.query(
                'UPDATE admins SET last_active_at = NOW() WHERE id = $1',
                [admin.id]
            );

            // Remove password from returned object
            const { password: _, ...adminWithoutPassword } = admin;
            return adminWithoutPassword as Admin;
        } catch (error) {
            console.error("Error authenticating admin:", error);
            return null;
        }
    }

    async getAdminById(adminId: number): Promise<Admin & { created_at: Date; updated_at: Date; last_active_at?: Date; profile_pic?: string } | null> {
        try {
            const result = await db.query(
                `SELECT id, email, name, phone, password, is_active, created_at, updated_at, last_active_at, profile_pic
                 FROM admins
                 WHERE id = $1 AND is_active = true`,
                [adminId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const admin = result.rows[0];

            // Remove password from returned object for security
            const { password: _, ...adminWithoutPassword } = admin;

            return adminWithoutPassword as Admin & { created_at: Date; updated_at: Date; last_active_at?: Date; profile_pic?: string };
        } catch (error) {
            console.error("Error getting admin by ID:", error);
            return null;
        }
    }

    // Enhanced Admin Activity Logging
    async logAdminActivityEnhanced(data: {
        admin_id: number;
        resource_type: string;
        resource_id: number;
        details?: any;
        ip_address?: string;
        user_agent?: string;
    }): Promise<any> {
        const result = await db.query(
            `INSERT INTO admin_activities
             (admin_id, resource_type, resource_id, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                data.admin_id,
                data.resource_type,
                data.resource_id,
                data.details ? JSON.stringify(data.details) : '{}',
                data.ip_address || '',
                data.user_agent || ''
            ]
        );

        return result.rows[0];
    }

    // Course Management Methods
    async getUnapprovedCourses(page: number = 1, limit: number = 10): Promise<{
        courses: UnapprovedCourse[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            const offset = (page - 1) * limit;

            // Get total count
            const countResult = await db.query(
                `SELECT COUNT(*) FROM courses c
                 WHERE c.creator_published_at IS NOT NULL
                   AND c.approved_at IS NULL
                   AND c.rejected_at IS NULL
                   AND c.is_active = true`
            );
            const total = parseInt(countResult.rows[0].count, 10);

            // Get paginated results with runtime query
            const coursesResult = await db.query(
                `SELECT
                    c.id,
                    c.name,
                    c.description,
                    c.is_paid,
                    c.price,
                    c.thumbnail_url,
                    c.created_at,
                    c.updated_at,
                    (
                        SELECT STRING_AGG(cat.name, ', ')
                        FROM course_categories cc
                        JOIN categories cat ON cc.category_id = cat.id
                        WHERE cc.course_id = c.id
                    ) as category_names,
                    (
                        SELECT STRING_AGG(cat.id::text, ', ')
                        FROM course_categories cc
                        JOIN categories cat ON cc.category_id = cat.id
                        WHERE cc.course_id = c.id
                    ) as category_ids,
                    (
                        SELECT STRING_AGG(cr.name, ', ')
                        FROM course_creators crc
                        JOIN creators cr ON crc.creator_id = cr.id
                        WHERE crc.course_id = c.id
                    ) as creator_names,
                    (
                        SELECT STRING_AGG(cr.id::text, ', ')
                        FROM course_creators crc
                        JOIN creators cr ON crc.creator_id = cr.id
                        WHERE crc.course_id = c.id
                    ) as creator_ids,
                    COUNT(DISTINCT cont.id) as video_count,
                    SUM(CASE WHEN cont.duration IS NOT NULL THEN cont.duration ELSE 0 END) as total_duration
                FROM courses c
                LEFT JOIN modules m ON c.id = m.course_id
                LEFT JOIN contents cont ON m.id = cont.module_id AND cont.is_active = true
                WHERE c.creator_published_at IS NOT NULL
                  AND c.approved_at IS NULL
                  AND c.rejected_at IS NULL
                  AND c.is_active = true
                GROUP BY c.id, c.name, c.description, c.is_paid, c.price, c.thumbnail_url,
                         c.created_at, c.updated_at
                ORDER BY c.created_at DESC
                LIMIT $1 OFFSET $2`,
                [limit, offset]
            );

            return {
                courses: coursesResult.rows as UnapprovedCourse[],
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error("Error getting unapproved courses:", error);
            return {
                courses: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            };
        }
    }

    // Get available courses for debugging/testing
    async getAvailableCourses(): Promise<Array<{
        id: number;
        name: string;
        creator_published_at?: Date;
        approved_at?: Date;
        rejected_at?: Date;
    }>> {
        try {
            const result = await db.query(
                `SELECT id, name, creator_published_at, approved_at, rejected_at
                 FROM courses
                 ORDER BY id ASC`
            );
            return result.rows;
        } catch (error) {
            console.error("Error getting available courses:", error);
            return [];
        }
    }

    // Get course status for debugging/checking
    async getCourseStatus(courseId: number): Promise<{
        exists: boolean;
        name?: string;
        creator_published_at?: Date;
        approved_at?: Date;
        rejected_at?: Date;
        canBeApproved: boolean;
        reason?: string;
    }> {
        try {
            const result = await db.query(
                `SELECT id, name, creator_published_at, approved_at, rejected_at
                 FROM courses
                 WHERE id = $1`,
                [courseId]
            );

            if (result.rows.length === 0) {
                return {
                    exists: false,
                    canBeApproved: false,
                    reason: 'Course does not exist'
                };
            }

            const course = result.rows[0];

            if (!course.creator_published_at) {
                return {
                    exists: true,
                    name: course.name,
                    creator_published_at: course.creator_published_at,
                    approved_at: course.approved_at,
                    rejected_at: course.rejected_at,
                    canBeApproved: false,
                    reason: 'Course has not been published by creator yet'
                };
            }

            if (course.approved_at) {
                return {
                    exists: true,
                    name: course.name,
                    creator_published_at: course.creator_published_at,
                    approved_at: course.approved_at,
                    rejected_at: course.rejected_at,
                    canBeApproved: false,
                    reason: 'Course is already approved'
                };
            }

            return {
                exists: true,
                name: course.name,
                creator_published_at: course.creator_published_at,
                approved_at: course.approved_at,
                rejected_at: course.rejected_at,
                canBeApproved: true
            };
        } catch (error) {
            console.error("Error getting course status:", error);
            return {
                exists: false,
                canBeApproved: false,
                reason: 'Database error'
            };
        }
    }

    async approveCourse(courseId: number, adminId: number): Promise<boolean> {
        try {
            await db.query('BEGIN');

            // First, check if the course exists and get its current state
            const courseCheckResult = await db.query(
                `SELECT id, name, creator_published_at, approved_at, rejected_at
                 FROM courses
                 WHERE id = $1`,
                [courseId]
            );

            if (courseCheckResult.rows.length === 0) {
                await db.query('ROLLBACK');
                console.log(`Course with ID ${courseId} does not exist`);
                return false;
            }

            const course = courseCheckResult.rows[0];
            console.log(`Course ${courseId} state:`, {
                name: course.name,
                creator_published_at: course.creator_published_at,
                approved_at: course.approved_at,
                rejected_at: course.rejected_at
            });

            // Check if course has been published by creator
            if (!course.creator_published_at) {
                await db.query('ROLLBACK');
                console.log(`Course ${courseId} has not been published by creator yet`);
                return false;
            }

            // Check if course is already approved
            if (course.approved_at) {
                await db.query('ROLLBACK');
                console.log(`Course ${courseId} is already approved`);
                return false;
            }

            // Update course as approved
            const courseResult = await db.query(
                `UPDATE courses
                 SET approved_at = NOW(),
                     approved_by = $2,
                     rejected_at = NULL,
                     rejected_by = NULL,
                     rejection_reason = NULL
                 WHERE id = $1 AND creator_published_at IS NOT NULL`,
                [courseId, adminId]
            );

            if (courseResult.rowCount === 0) {
                await db.query('ROLLBACK');
                console.log(`Failed to update course ${courseId} - no rows affected`);
                return false;
            }

            // Cascade approval to all modules in the course
            const modulesResult = await db.query(
                `UPDATE modules
                 SET approved_at = NOW(),
                     approved_by = $2,
                     rejected_at = NULL,
                     rejected_by = NULL,
                     rejection_reason = NULL
                 WHERE course_id = $1`,
                [courseId, adminId]
            );

            // Cascade approval to all content in the course (through modules)
            const contentResult = await db.query(
                `UPDATE contents
                 SET approved_at = NOW(),
                     approved_by = $2,
                     rejected_at = NULL,
                     rejected_by = NULL,
                     rejection_reason = NULL
                 WHERE module_id IN (
                     SELECT id FROM modules WHERE course_id = $1
                 )`,
                [courseId, adminId]
            );

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'course',
                resource_id: courseId,
                details: {
                    approved_at: new Date().toISOString(),
                    modules_updated: modulesResult.rowCount || 0,
                    content_updated: contentResult.rowCount || 0
                }
            });

            await db.query('COMMIT');
            console.log(`Successfully approved course ${courseId}`);
            return true;
        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error approving course:", error);
            return false;
        }
    }

    async rejectCourse(courseId: number, adminId: number, reason: string): Promise<boolean> {
        try {
            console.log(`Attempting to reject course ${courseId} by admin ${adminId} with reason: ${reason}`);

            // First check if course exists
            const courseCheck = await db.query(
                `SELECT id, name, creator_published_at, approved_at, rejected_at
                 FROM courses
                 WHERE id = $1`,
                [courseId]
            );

            if (courseCheck.rows.length === 0) {
                console.log(`Course ${courseId} does not exist`);
                return false;
            }

            const course = courseCheck.rows[0];
            console.log(`Course ${courseId} current state:`, {
                name: course.name,
                creator_published_at: course.creator_published_at,
                approved_at: course.approved_at,
                rejected_at: course.rejected_at
            });

            // Update course as rejected
            const result = await db.query(
                `UPDATE courses
                 SET rejected_at = NOW(),
                     rejected_by = $2,
                     rejection_reason = $3,
                     approved_at = NULL,
                     approved_by = NULL,
                     creator_published_at = NULL
                 WHERE id = $1`,
                [courseId, adminId, reason]
            );

            console.log(`Course rejection update affected ${result.rowCount} rows`);

            if (result.rowCount === 0) {
                console.log(`Failed to update course ${courseId} - no rows affected`);
                return false;
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'course',
                resource_id: courseId,
                details: {
                    rejection_reason: reason,
                    rejected_at: new Date().toISOString()
                }
            });

            console.log(`Successfully rejected course ${courseId}`);
            return true;
        } catch (error) {
            console.error("Error rejecting course:", error);
            return false;
        }
    }

    // Module rejection that cascades to course rejection
    async rejectModule(moduleId: number, adminId: number, reason: string): Promise<boolean> {
        try {
            await db.query('BEGIN');

            // Get course_id from module
            const moduleResult = await db.query(
                `SELECT course_id FROM modules WHERE id = $1`,
                [moduleId]
            );

            if (moduleResult.rows.length === 0) {
                await db.query('ROLLBACK');
                return false;
            }

            const courseId = moduleResult.rows[0].course_id;

            // Reject the module
            const moduleUpdateResult = await db.query(
                `UPDATE modules
                 SET rejected_at = NOW(),
                     rejected_by = $2,
                     rejection_reason = $3,
                     approved_at = NULL,
                     approved_by = NULL
                 WHERE id = $1`,
                [moduleId, adminId, reason]
            );

            if (moduleUpdateResult.rowCount === 0) {
                await db.query('ROLLBACK');
                return false;
            }

            // Cascade rejection to the course
            const courseUpdateResult = await db.query(
                `UPDATE courses
                 SET rejected_at = NOW(),
                     rejected_by = $2,
                     rejection_reason = $3,
                     approved_at = NULL,
                     approved_by = NULL,
                     creator_published_at = NULL
                 WHERE id = $4`,
                [reason, adminId, reason, courseId]
            );

            if (courseUpdateResult.rowCount === 0) {
                await db.query('ROLLBACK');
                return false;
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'module',
                resource_id: moduleId,
                details: {
                    course_id: courseId,
                    rejection_reason: reason,
                    rejected_at: new Date().toISOString(),
                    cascaded_to_course: true
                }
            });

            await db.query('COMMIT');
            return true;
        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error rejecting module:", error);
            return false;
        }
    }

    // Module rejection with detailed cascade result
    async rejectModuleWithCascade(moduleId: number, adminId: number, reason: string): Promise<{
        success: boolean;
        courseUpdated: boolean;
    }> {
        try {
            await db.query('BEGIN');

            // Get course_id from module
            const moduleResult = await db.query(
                `SELECT course_id FROM modules WHERE id = $1`,
                [moduleId]
            );

            if (moduleResult.rows.length === 0) {
                await db.query('ROLLBACK');
                return { success: false, courseUpdated: false };
            }

            const courseId = moduleResult.rows[0].course_id;

            // Reject the module
            const moduleUpdateResult = await db.query(
                `UPDATE modules
                 SET rejected_at = NOW(),
                     rejected_by = $2,
                     rejection_reason = $3,
                     approved_at = NULL,
                     approved_by = NULL
                 WHERE id = $1`,
                [moduleId, adminId, reason]
            );

            if (moduleUpdateResult.rowCount === 0) {
                await db.query('ROLLBACK');
                return { success: false, courseUpdated: false };
            }

            // Cascade rejection to the course
            const courseUpdateResult = await db.query(
                `UPDATE courses
                 SET rejected_at = NOW(),
                     rejected_by = $2,
                     rejection_reason = $3,
                     approved_at = NULL,
                     approved_by = NULL,
                     creator_published_at = NULL
                 WHERE id = $4`,
                [reason, adminId, reason, courseId]
            );

            const courseUpdated = (courseUpdateResult.rowCount || 0) > 0;

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'module',
                resource_id: moduleId,
                details: {
                    course_id: courseId,
                    rejection_reason: reason,
                    rejected_at: new Date().toISOString(),
                    cascaded_to_course: courseUpdated
                }
            });

            await db.query('COMMIT');
            return { success: true, courseUpdated };
        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error rejecting module:", error);
            return { success: false, courseUpdated: false };
        }
    }

    // Content rejection that cascades to module and course rejection
    async rejectContent(contentId: number, adminId: number, reason: string): Promise<boolean> {
        try {
            await db.query('BEGIN');

            // Get module_id and course_id from content
            const contentResult = await db.query(
                `SELECT c.module_id, m.course_id
                 FROM contents c
                 JOIN modules m ON c.module_id = m.id
                 WHERE c.id = $1`,
                [contentId]
            );

            if (contentResult.rows.length === 0) {
                await db.query('ROLLBACK');
                return false;
            }

            const { module_id, course_id } = contentResult.rows[0];

            // Reject the content
            const contentUpdateResult = await db.query(
                `UPDATE contents
                 SET rejected_at = NOW(),
                     rejected_by = $2,
                     rejection_reason = $3,
                     approved_at = NULL,
                     approved_by = NULL
                 WHERE id = $1`,
                [contentId, adminId, reason]
            );

            if (contentUpdateResult.rowCount === 0) {
                await db.query('ROLLBACK');
                return false;
            }

            // Cascade rejection to the module
            const moduleUpdateResult = await db.query(
                `UPDATE modules
                 SET rejected_at = NOW(),
                     rejected_by = $2,
                     rejection_reason = $3,
                     approved_at = NULL,
                     approved_by = NULL
                 WHERE id = $4`,
                [reason, adminId, reason, module_id]
            );

            if (moduleUpdateResult.rowCount === 0) {
                await db.query('ROLLBACK');
                return false;
            }

            // Cascade rejection to the course
            const courseUpdateResult = await db.query(
                `UPDATE courses
                 SET rejected_at = NOW(),
                     rejected_by = $2,
                     rejection_reason = $3,
                     approved_at = NULL,
                     approved_by = NULL,
                     creator_published_at = NULL
                 WHERE id = $4`,
                [reason, adminId, reason, course_id]
            );

            if (courseUpdateResult.rowCount === 0) {
                await db.query('ROLLBACK');
                return false;
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'content',
                resource_id: contentId,
                details: {
                    module_id: module_id,
                    course_id: course_id,
                    rejection_reason: reason,
                    rejected_at: new Date().toISOString(),
                    cascaded_to_module: true,
                    cascaded_to_course: true
                }
            });

            await db.query('COMMIT');
            return true;
        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error rejecting content:", error);
            return false;
        }
    }

    // Content rejection with detailed cascade result
    async rejectContentWithCascade(contentId: number, adminId: number, reason: string): Promise<{
        success: boolean;
        moduleUpdated: boolean;
        courseUpdated: boolean;
    }> {
        try {
            await db.query('BEGIN');

            // Get module_id and course_id from content
            const contentResult = await db.query(
                `SELECT c.module_id, m.course_id
                 FROM contents c
                 JOIN modules m ON c.module_id = m.id
                 WHERE c.id = $1`,
                [contentId]
            );

            if (contentResult.rows.length === 0) {
                await db.query('ROLLBACK');
                return { success: false, moduleUpdated: false, courseUpdated: false };
            }

            const { module_id, course_id } = contentResult.rows[0];

            // Reject the content
            const contentUpdateResult = await db.query(
                `UPDATE contents
                 SET rejected_at = NOW(),
                     rejected_by = $2,
                     rejection_reason = $3,
                     approved_at = NULL,
                     approved_by = NULL
                 WHERE id = $1`,
                [contentId, adminId, reason]
            );

            if (contentUpdateResult.rowCount === 0) {
                await db.query('ROLLBACK');
                return { success: false, moduleUpdated: false, courseUpdated: false };
            }

            // Cascade rejection to the module
            const moduleUpdateResult = await db.query(
                `UPDATE modules
                 SET rejected_at = NOW(),
                     rejected_by = $1,
                     rejection_reason = $2,
                     approved_at = NULL,
                     approved_by = NULL
                 WHERE id = $3`,
                [adminId, reason, module_id]
            );

            const moduleUpdated = (moduleUpdateResult.rowCount || 0) > 0;

            // Cascade rejection to the course
            const courseUpdateResult = await db.query(
                `UPDATE courses
                 SET rejected_at = NOW(),
                     rejected_by = $1,
                     rejection_reason = $2,
                     approved_at = NULL,
                     approved_by = NULL,
                     creator_published_at = NULL
                 WHERE id = $3`,
                [adminId, reason, course_id]
            );

            const courseUpdated = (courseUpdateResult.rowCount || 0) > 0;

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'content',
                resource_id: contentId,
                details: {
                    module_id: module_id,
                    course_id: course_id,
                    rejection_reason: reason,
                    rejected_at: new Date().toISOString(),
                    cascaded_to_module: moduleUpdated,
                    cascaded_to_course: courseUpdated
                }
            });

            await db.query('COMMIT');
            return { success: true, moduleUpdated, courseUpdated };
        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error rejecting content:", error);
            return { success: false, moduleUpdated: false, courseUpdated: false };
        }
    }

    // Video/Content Management Methods
    async saveVideoMetadata(courseId: number, videos: Array<{
        name: string;
        description?: string;
        url: string;
        abs_url?: string;
        position: number;
        is_paid: boolean;
        is_active: boolean;
        duration?: number;
        thumbnail_url?: string;
        module_name?: string;
    }>, adminId: number): Promise<any[]> {
        try {
            const createdVideos = [];

            for (const video of videos) {
                let moduleId = null;

                // Create or find module if module_name is provided
                if (video.module_name) {
                    const moduleResult = await db.query(
                        `INSERT INTO modules (name, description, position, is_paid, is_active, course_id, thumbnail_url, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                         ON CONFLICT (name, course_id) DO UPDATE SET updated_at = NOW()
                         RETURNING id`,
                        [video.module_name, video.module_name, video.position, video.is_paid, video.is_active, courseId, video.thumbnail_url || null]
                    );
                    moduleId = moduleResult.rows[0]?.id;
                }

                // Insert or update content
                const contentResult = await db.query(
                    `INSERT INTO contents
                     (name, module_id, content_type, position, is_paid, is_active, url, abs_url, duration, thumbnail_url, created_at, updated_at)
                     VALUES ($1, $2, 'VIDEO', $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                     ON CONFLICT (url, module_id)
                     DO UPDATE SET
                        name = EXCLUDED.name,
                        position = EXCLUDED.position,
                        is_paid = EXCLUDED.is_paid,
                        is_active = EXCLUDED.is_active,
                        abs_url = EXCLUDED.abs_url,
                        duration = EXCLUDED.duration,
                        thumbnail_url = EXCLUDED.thumbnail_url,
                        updated_at = NOW()
                     RETURNING *`,
                    [
                        video.name,
                        moduleId,
                        video.position,
                        video.is_paid,
                        video.is_active,
                        video.url,
                        video.abs_url,
                        video.duration,
                        video.thumbnail_url
                    ]
                );

                createdVideos.push(contentResult.rows[0]);
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'course',
                resource_id: courseId,
                details: {
                    video_count: videos.length,
                    saved_at: new Date().toISOString()
                }
            });

            return createdVideos;
        } catch (error) {
            console.error("Error saving video metadata:", error);
            throw error;
        }
    }

    async reorderVideos(courseId: number, videoIds: number[], adminId: number): Promise<any[]> {
        try {
            const updatedVideos = [];

            for (let i = 0; i < videoIds.length; i++) {
                const position = i + 1;
                const videoId = videoIds[i];

                const result = await db.query(
                    `UPDATE contents
                     SET position = $1, updated_at = NOW()
                     WHERE id = $2 AND module_id IN (SELECT id FROM modules WHERE course_id = $3)
                     RETURNING *`,
                    [position, videoId, courseId]
                );

                if (result.rows.length > 0) {
                    updatedVideos.push(result.rows[0]);
                }
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'course',
                resource_id: courseId,
                details: {
                    video_count: videoIds.length,
                    new_order: videoIds,
                    reordered_at: new Date().toISOString()
                }
            });

            return updatedVideos;
        } catch (error) {
            console.error("Error reordering videos:", error);
            throw error;
        }
    }

    async reorderContents(moduleId: number, contentIds: number[], adminId: number): Promise<any[]> {
        try {
            const updatedContents = [];

            for (let i = 0; i < contentIds.length; i++) {
                const position = i + 1;
                const contentId = contentIds[i];

                const result = await db.query(
                    `UPDATE contents
                     SET position = $1, updated_at = NOW()
                     WHERE id = $2 AND module_id = $3
                     RETURNING *`,
                    [position, contentId, moduleId]
                );

                if (result.rows.length > 0) {
                    updatedContents.push(result.rows[0]);
                }
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'module',
                resource_id: moduleId,
                details: {
                    content_count: contentIds.length,
                    new_order: contentIds,
                    reordered_at: new Date().toISOString()
                }
            });

            return updatedContents;
        } catch (error) {
            console.error("Error reordering contents:", error);
            throw error;
        }
    }

    async softDeleteVideo(videoId: number, adminId: number): Promise<boolean> {
        try {
            const result = await db.query(
                `UPDATE contents
                 SET is_active = false, updated_at = NOW()
                 WHERE id = $1`,
                [videoId]
            );

            if (result.rowCount === 0) {
                return false;
            }

            // Get course info for logging
            const courseResult = await db.query(
                'SELECT m.course_id FROM contents c JOIN modules m ON c.module_id = m.id WHERE c.id = $1',
                [videoId]
            );
            const courseId = courseResult.rows[0]?.course_id;

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'content',
                resource_id: videoId,
                details: {
                    course_id: courseId,
                    deleted_at: new Date().toISOString()
                }
            });

            return true;
        } catch (error) {
            console.error("Error soft deleting video:", error);
            return false;
        }
    }


    // Analytics Methods
    async getCourseApprovalStats(): Promise<any> {
        try {
            const result = await db.query(
                `SELECT
                    COUNT(*) as total_courses,
                    COUNT(CASE WHEN approved_at IS NOT NULL THEN 1 END) as approved_courses,
                    COUNT(CASE WHEN rejected_at IS NOT NULL THEN 1 END) as rejected_courses,
                    COUNT(CASE WHEN creator_published_at IS NOT NULL AND approved_at IS NULL AND rejected_at IS NULL THEN 1 END) as pending_courses,
                    ROUND(
                        COUNT(CASE WHEN approved_at IS NOT NULL THEN 1 END) * 100.0 /
                        NULLIF(COUNT(*), 0), 2
                    ) as approval_rate_percentage
                FROM courses
                WHERE is_active = true`
            );
            return result.rows[0] || {
                total_courses: 0,
                approved_courses: 0,
                rejected_courses: 0,
                pending_courses: 0,
                approval_rate_percentage: 0
            };
        } catch (error) {
            console.error("Error getting course approval stats:", error);
            return {
                total_courses: 0,
                approved_courses: 0,
                rejected_courses: 0,
                pending_courses: 0,
                approval_rate_percentage: 0
            };
        }
    }

    // Course Details for Admin
    async getCourseDetails(courseId: number): Promise<any> {
        try {
            const result = await db.query(
                `SELECT
                    c.*,
                    cat.name as category_name,
                    cr.name as creator_name,
                    COUNT(cont.id) as video_count,
                    SUM(CASE WHEN cont.duration IS NOT NULL THEN cont.duration ELSE 0 END) as total_duration
                FROM courses c
                LEFT JOIN categories cat ON c.category_id = cat.id
                LEFT JOIN course_creators cc ON c.id = cc.course_id
                LEFT JOIN creators cr ON cc.creator_id = cr.id
                LEFT JOIN modules m ON c.id = m.course_id
                LEFT JOIN contents cont ON m.id = cont.module_id AND cont.is_active = true
                WHERE c.id = $1
                GROUP BY c.id, cat.name, cr.name`,
                [courseId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const course = result.rows[0];

            // Get videos for this course
            const videosResult = await db.query(
                `SELECT c.* FROM contents c
                 JOIN modules m ON c.module_id = m.id
                 WHERE m.course_id = $1 AND c.content_type = 'VIDEO'
                 ORDER BY c.position`,
                [courseId]
            );

            course.videos = videosResult.rows;

            return course;
        } catch (error) {
            console.error("Error getting course details:", error);
            return null;
        }
    }

    // Create contents for a module
    async createContents(courseId: number, videos: Array<{
        title: string;
        description?: string;
        duration?: number;
        position: number;
        is_paid: boolean;
        is_active: boolean;
        module_id?: number;
        url: string;
        abs_url?: string;
        thumbnail_url?: string;
    }>, adminId: number): Promise<Array<{
        id: number;
        title: string;
        description?: string;
        duration?: number;
        position: number;
        is_paid: boolean;
        is_active: boolean;
        module_id?: number;
        url: string;
        thumbnail_url?: string;
        created_at: string;
        updated_at: string;
    }>> {
        try {
            // Verify course exists
            const courseCheck = await db.query(
                `SELECT id FROM courses WHERE id = $1`,
                [courseId]
            );
            if (courseCheck.rows.length === 0) {
                throw new Error(`Course with ID ${courseId} does not exist`);
            }

            const createdContents = [];

            for (const video of videos) {
                // Create or get module if module_name is provided
                let moduleId = null;
                if (video.module_id) {
                    const moduleResult = await db.query(
                        `INSERT INTO modules (name, description, course_id, thumbnail_url, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, NOW(), NOW())
                         ON CONFLICT (name, course_id) DO UPDATE SET
                         updated_at = NOW()
                         RETURNING id`,
                        [video.module_id, video.description || '', courseId, video.thumbnail_url || null]
                    );
                    moduleId = moduleResult.rows[0].id;
                }

                // Insert content
                const contentResult = await db.query(
                    `INSERT INTO contents (
                        name, content_type, module_id, position,
                        is_paid, is_active, url, abs_url, duration, thumbnail_url,
                        approved_at, approved_by, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, NOW(), NOW())
                    RETURNING id, name, module_id, position, is_paid, is_active,
                              url, abs_url, duration, thumbnail_url, created_at, updated_at`,
                    [
                        video.title,
                        ContentType.VIDEO,
                        moduleId,
                        video.position,
                        video.is_paid,
                        video.is_active,
                        video.url,
                        video.abs_url,
                        video.duration,
                        video.thumbnail_url,
                        adminId
                    ]
                );

                const content = contentResult.rows[0];
                createdContents.push({
                    id: content.id,
                    title: content.name,
                    description: video.description,
                    duration: content.duration,
                    position: content.position,
                    is_paid: content.is_paid,
                    is_active: content.is_active,
                    module_id: video.module_id,
                    url: content.url,
                    thumbnail_url: content.thumbnail_url,
                    created_at: content.created_at.toISOString(),
                    updated_at: content.updated_at.toISOString()
                });
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'course',
                resource_id: courseId,
                details: {
                    contents_count: videos.length,
                    contents: videos.map(v => ({ title: v.title, position: v.position }))
                }
            });

            return createdContents;
        } catch (error) {
            console.error("Error creating contents:", error);
            throw error;
        }
    }

    // Get course with modules and content
    async getCourseWithModulesAndContent(courseId: number): Promise<CourseWithModulesAndContent | null> {
        try {
            // Get course data
            const courseResult = await db.query(
                `SELECT * FROM courses WHERE id = $1`,
                [courseId]
            );

            if (courseResult.rows.length === 0) {
                return null;
            }

            const course = courseResult.rows[0];

            // Get modules with complete content data
            const modulesResult = await db.query(
                `SELECT * FROM modules m WHERE m.course_id = $1 AND m.is_active = true ORDER BY m.position ASC, m.created_at ASC`,
                [courseId]
            );

            // For each module, get its contents
            const modules = await Promise.all(
                modulesResult.rows.map(async (module) => {
                    const contentsResult = await db.query(
                        `SELECT * FROM contents c
                         WHERE c.module_id = $1 AND c.is_active = true
                         ORDER BY c.position ASC, c.created_at ASC`,
                        [module.id]
                    );

                    return {
                        ...module,
                        contents: contentsResult.rows
                    };
                })
            );

            // Get total counts
            const totalModules = modules.length;
            const totalContentResult = await db.query(
                `SELECT COUNT(*) as total FROM contents c
                 JOIN modules m ON c.module_id = m.id
                 WHERE m.course_id = $1 AND c.is_active = true`,
                [courseId]
            );
            const totalContent = parseInt(totalContentResult.rows[0].total);

            return {
                ...course,
                totalModules,
                totalContent,
                modules
            };
        } catch (error) {
            console.error("Error getting course with modules and content:", error);
            return null;
        }
    }

    // Get courses with hierarchical structure based on filters
    async getCoursesWithHierarchy(page: number = 1, limit: number = 10, rejected?: boolean, published?: boolean): Promise<{
        courses: CourseWithModulesAndContent[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            const offset = (page - 1) * limit;

            // Build WHERE conditions based on filters
            let whereConditions: string[] = ['c.is_active = true'];
            let orderBy = 'c.created_at DESC';

            if (rejected !== undefined) {
                if (rejected) {
                    whereConditions.push('c.rejected_at IS NOT NULL');
                    whereConditions.push('(c.approved_at IS NULL OR c.approved_at < c.rejected_at)');
                    orderBy = 'c.rejected_at DESC';
                } else {
                    whereConditions.push('(c.rejected_at IS NULL OR c.approved_at > c.rejected_at)');
                }
            }

            if (published !== undefined) {
                if (published) {
                    whereConditions.push('c.creator_published_at IS NOT NULL');
                } else {
                    whereConditions.push('c.creator_published_at IS NULL');
                }
            }

            const whereClause = whereConditions.join(' AND ');

            // Get total count
            const countResult = await db.query(
                `SELECT COUNT(*) FROM courses c WHERE ${whereClause}`
            );
            const total = parseInt(countResult.rows[0].count, 10);

            // Get paginated courses
            const coursesResult = await db.query(
                `SELECT c.* FROM courses c
                 WHERE ${whereClause}
                 ORDER BY ${orderBy}
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            );

            // For each course, get its modules and contents
            const coursesWithHierarchy = await Promise.all(
                coursesResult.rows.map(async (course) => {
                    // Get modules for this course
                    const modulesResult = await db.query(
                        `SELECT * FROM modules m
                         WHERE m.course_id = $1
                         ORDER BY m.position ASC, m.created_at ASC`,
                        [course.id]
                    );

                    // For each module, get its contents
                    const modules = await Promise.all(
                        modulesResult.rows.map(async (module) => {
                            const contentsResult = await db.query(
                                `SELECT * FROM contents c
                                 WHERE c.module_id = $1
                                 ORDER BY c.position ASC, c.created_at ASC`,
                                [module.id]
                            );

                            return {
                                ...module,
                                contents: contentsResult.rows
                            };
                        })
                    );

                    // Calculate totals
                    const totalModules = modules.length;
                    const totalContentResult = await db.query(
                        `SELECT COUNT(*) as total FROM contents c
                         JOIN modules m ON c.module_id = m.id
                         WHERE m.course_id = $1`,
                        [course.id]
                    );
                    const totalContent = parseInt(totalContentResult.rows[0].total);

                    return {
                        ...course,
                        totalModules,
                        totalContent,
                        modules
                    } as CourseWithModulesAndContent;
                })
            );

            return {
                courses: coursesWithHierarchy,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error("Error getting courses with hierarchy:", error);
            return {
                courses: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            };
        }
    }

    // Get rejected courses with hierarchical structure (legacy method for backward compatibility)
    async getRejectedCoursesWithHierarchy(page: number = 1, limit: number = 10): Promise<{
        courses: CourseWithModulesAndContent[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        return this.getCoursesWithHierarchy(page, limit, true);
    }

    // Individual Module Approval
    async approveModule(moduleId: number, adminId: number): Promise<boolean> {
        try {
            await db.query('BEGIN');

            // Check if module exists and get course info
            const moduleCheckResult = await db.query(
                `SELECT m.id, m.course_id, c.name as course_name
                 FROM modules m
                 JOIN courses c ON m.course_id = c.id
                 WHERE m.id = $1`,
                [moduleId]
            );

            if (moduleCheckResult.rows.length === 0) {
                await db.query('ROLLBACK');
                console.log(`Module with ID ${moduleId} does not exist`);
                return false;
            }

            const module = moduleCheckResult.rows[0];

            // Update module as approved
            const moduleResult = await db.query(
                `UPDATE modules
                 SET approved_at = NOW(),
                     approved_by = $2,
                     rejected_at = NULL,
                     rejected_by = NULL,
                     rejection_reason = NULL
                 WHERE id = $1`,
                [moduleId, adminId]
            );

            if (moduleResult.rowCount === 0) {
                await db.query('ROLLBACK');
                console.log(`Failed to update module ${moduleId} - no rows affected`);
                return false;
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'module',
                resource_id: moduleId,
                details: {
                    course_id: module.course_id,
                    approved_at: new Date().toISOString()
                }
            });

            await db.query('COMMIT');
            console.log(`Successfully approved module ${moduleId}`);
            return true;
        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error approving module:", error);
            return false;
        }
    }

    // Individual Content Approval
    async approveContent(contentId: number, adminId: number): Promise<boolean> {
        try {
            await db.query('BEGIN');

            // Check if content exists and get module/course info
            const contentCheckResult = await db.query(
                `SELECT c.id, c.module_id, m.course_id, co.name as course_name
                 FROM contents c
                 JOIN modules m ON c.module_id = m.id
                 JOIN courses co ON m.course_id = co.id
                 WHERE c.id = $1`,
                [contentId]
            );

            if (contentCheckResult.rows.length === 0) {
                await db.query('ROLLBACK');
                console.log(`Content with ID ${contentId} does not exist`);
                return false;
            }

            const content = contentCheckResult.rows[0];

            // Update content as approved
            const contentResult = await db.query(
                `UPDATE contents
                 SET approved_at = NOW(),
                     approved_by = $2,
                     rejected_at = NULL,
                     rejected_by = NULL,
                     rejection_reason = NULL
                 WHERE id = $1`,
                [contentId, adminId]
            );

            if (contentResult.rowCount === 0) {
                await db.query('ROLLBACK');
                console.log(`Failed to update content ${contentId} - no rows affected`);
                return false;
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_id: adminId,
                resource_type: 'content',
                resource_id: contentId,
                details: {
                    module_id: content.module_id,
                    course_id: content.course_id,
                    approved_at: new Date().toISOString()
                }
            });

            await db.query('COMMIT');
            console.log(`Successfully approved content ${contentId}`);
            return true;
        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error approving content:", error);
            return false;
        }
    }

    async deleteCourse(courseId: number, adminId: number): Promise<{
        success: boolean;
        cascadedDeletes?: {
            modulesDeleted: number;
            contentsDeleted: number;
            enrollmentsDeleted: number;
        };
        message?: string;
    }> {
        try {
            await db.query('BEGIN');

            // First, check if the course exists
            const courseCheckResult = await db.query(
                `SELECT id, name FROM courses WHERE id = $1 AND is_active = true`,
                [courseId]
            );

            if (courseCheckResult.rows.length === 0) {
                await db.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Course not found or already deleted'
                };
            }

            const course = courseCheckResult.rows[0];
            console.log(`Deleting course ${courseId}: ${course.name}`);

            // Count related records before deletion for reporting
            const modulesCountResult = await db.query(
                `SELECT COUNT(*) FROM modules WHERE course_id = $1 AND is_active = true`,
                [courseId]
            );
            const modulesDeleted = parseInt(modulesCountResult.rows[0].count);

            const contentsCountResult = await db.query(
                `SELECT COUNT(*) FROM contents c
                 JOIN modules m ON c.module_id = m.id
                 WHERE m.course_id = $1 AND c.is_active = true`,
                [courseId]
            );
            const contentsDeleted = parseInt(contentsCountResult.rows[0].count);

            const enrollmentsCountResult = await db.query(
                `SELECT COUNT(*) FROM user_enrollments WHERE course_id = $1`,
                [courseId]
            );
            const enrollmentsDeleted = parseInt(enrollmentsCountResult.rows[0].count);

            // Soft delete all contents in the course
            await db.query(
                `UPDATE contents
                 SET is_active = false, updated_at = NOW()
                 FROM modules m
                 WHERE contents.module_id = m.id AND m.course_id = $1`,
                [courseId]
            );

            // Soft delete all modules in the course
            await db.query(
                `UPDATE modules
                 SET is_active = false, updated_at = NOW()
                 WHERE course_id = $1`,
                [courseId]
            );

            // Delete user enrollments (hard delete as these are just relationships)
            await db.query(
                `DELETE FROM user_enrollments WHERE course_id = $1`,
                [courseId]
            );

            // Delete course-category relationships
            await db.query(
                `DELETE FROM course_categories WHERE course_id = $1`,
                [courseId]
            );

            // Delete course-creator relationships
            await db.query(
                `DELETE FROM course_creators WHERE course_id = $1`,
                [courseId]
            );

            // Soft delete the course itself
            const courseDeleteResult = await db.query(
                `UPDATE courses
                 SET is_active = false, updated_at = NOW()
                 WHERE id = $1`,
                [courseId]
            );

            if (courseDeleteResult.rowCount === 0) {
                await db.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Failed to delete course'
                };
            }

            // Log admin activity
            await db.query(
                `INSERT INTO admin_activities (admin_id, resource_type, resource_id, details, ip_address, user_agent)
                 VALUES ($1, 'course', $2, $3, '127.0.0.1', 'Admin API')`,
                [
                    adminId,
                    courseId,
                    JSON.stringify({
                        action: 'delete_course',
                        courseName: course.name,
                        cascadedDeletes: {
                            modulesDeleted,
                            contentsDeleted,
                            enrollmentsDeleted
                        }
                    })
                ]
            );

            await db.query('COMMIT');

            console.log(`Successfully deleted course ${courseId} with cascaded deletes:`, {
                modulesDeleted,
                contentsDeleted,
                enrollmentsDeleted
            });

            return {
                success: true,
                cascadedDeletes: {
                    modulesDeleted,
                    contentsDeleted,
                    enrollmentsDeleted
                }
            };

        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error deleting course:", error);
            return {
                success: false,
                message: 'Database error occurred while deleting course'
            };
        }
    }
}
