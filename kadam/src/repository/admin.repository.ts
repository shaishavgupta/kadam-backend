import { AdminConfigurations, AdminConfigurationRequest, AdminConfigurationResponse, Admin } from "../shared/types/admin.types";
import { db } from "../infra/db";
import { CreateAdminRequest } from "../schemas/auth";
import crypto from 'crypto';

// Admin Token Interface
export interface AdminToken {
    id: number;
    token_hash: string;
    email: string;
    role: 'admin' | 'super_admin';
    is_active: boolean;
    expires_at?: Date;
    created_at: Date;
    updated_at: Date;
    last_used_at?: Date;
}

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
    category_name?: string;
    category_id?: number;
    creator_name?: string;
    creator_id?: number;
    video_count: number;
    total_duration: number;
}

// Rejected Video Interface
export interface RejectedVideo {
    id: number;
    title: string;
    url?: string;
    course_id: number;
    course_name: string;
    rejected_by: number;
    rejected_by_name: string;
    rejected_at: Date;
    rejection_reason: string;
    created_at: Date;
    updated_at: Date;
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
    async authenticateAdmin(token: string): Promise<AdminToken | null> {
        try {
            // Hash the provided token to compare with stored hash
            const tokenHash = this.hashToken(token);

            const result = await db.query(
                `SELECT * FROM admin_tokens
                 WHERE token_hash = $1 AND is_active = true
                 AND (expires_at IS NULL OR expires_at > NOW())`,
                [tokenHash]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const adminToken = result.rows[0] as AdminToken;

            // Update last_used_at
            await db.query(
                'UPDATE admin_tokens SET last_used_at = NOW() WHERE id = $1',
                [adminToken.id]
            );

            return adminToken;
        } catch (error) {
            console.error("Error authenticating admin:", error);
            return null;
        }
    }

    async createAdminToken(data: {
        token: string;
        email: string;
        role: 'admin' | 'super_admin';
        expires_at?: Date;
    }): Promise<AdminToken> {
        const tokenHash = this.hashToken(data.token);

        const result = await db.query(
            `INSERT INTO admin_tokens (token_hash, email, role, expires_at)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [tokenHash, data.email, data.role, data.expires_at]
        );

        return result.rows[0] as AdminToken;
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    // Enhanced Admin Activity Logging
    async logAdminActivityEnhanced(data: {
        admin_email: string;
        action: string;
        resource_type: string;
        resource_id: number;
        details?: any;
        ip_address?: string;
        user_agent?: string;
    }): Promise<any> {
        const result = await db.query(
            `INSERT INTO admin_activities
             (admin_email, action, resource_type, resource_id, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                data.admin_email,
                data.action,
                data.resource_type,
                data.resource_id,
                data.details ? JSON.stringify(data.details) : '{}',
                data.ip_address,
                data.user_agent
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
                `SELECT COUNT(*) FROM unapproved_courses`
            );
            const total = parseInt(countResult.rows[0].count, 10);

            // Get paginated results
            const coursesResult = await db.query(
                `SELECT * FROM unapproved_courses LIMIT $1 OFFSET $2`,
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

    async approveCourse(courseId: number, adminEmail: string): Promise<boolean> {
        try {
            // Update course as approved
            const result = await db.query(
                `UPDATE courses
                 SET published_at = NOW(),
                     approved_at = NOW(),
                     approved_by = (SELECT id FROM admin_tokens WHERE email = $2 AND is_active = true LIMIT 1)
                 WHERE id = $1 AND published_at IS NULL AND rejected_at IS NULL`,
                [courseId, adminEmail]
            );

            if (result.rowCount === 0) {
                return false;
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_email: adminEmail,
                action: 'course_approved',
                resource_type: 'course',
                resource_id: courseId,
                details: {
                    approved_at: new Date().toISOString()
                }
            });

            return true;
        } catch (error) {
            console.error("Error approving course:", error);
            return false;
        }
    }

    async rejectCourse(courseId: number, adminEmail: string, reason: string): Promise<boolean> {
        try {
            // Update course as rejected
            const result = await db.query(
                `UPDATE courses
                 SET rejected_at = NOW(),
                     rejected_by = (SELECT id FROM admin_tokens WHERE email = $2 AND is_active = true LIMIT 1),
                     rejection_reason = $3
                 WHERE id = $1 AND published_at IS NULL AND rejected_at IS NULL`,
                [courseId, adminEmail, reason]
            );

            if (result.rowCount === 0) {
                return false;
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_email: adminEmail,
                action: 'course_rejected',
                resource_type: 'course',
                resource_id: courseId,
                details: {
                    rejection_reason: reason,
                    rejected_at: new Date().toISOString()
                }
            });

            return true;
        } catch (error) {
            console.error("Error rejecting course:", error);
            return false;
        }
    }

    // Video/Content Management Methods
    async saveVideoMetadata(courseId: number, videos: Array<{
        name: string;
        description?: string;
        url: string;
        position: number;
        is_paid: boolean;
        is_active: boolean;
        duration?: number;
        thumbnail_url?: string;
        module_name?: string;
    }>, adminEmail: string): Promise<any[]> {
        try {
            const createdVideos = [];

            for (const video of videos) {
                let moduleId = null;

                // Create or find module if module_name is provided
                if (video.module_name) {
                    const moduleResult = await db.query(
                        `INSERT INTO modules (name, description, position, is_paid, is_active, course_id, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                         ON CONFLICT (name, course_id) DO UPDATE SET updated_at = NOW()
                         RETURNING id`,
                        [video.module_name, video.module_name, video.position, video.is_paid, video.is_active, courseId]
                    );
                    moduleId = moduleResult.rows[0]?.id;
                }

                // Insert or update content
                const contentResult = await db.query(
                    `INSERT INTO contents
                     (name, module_id, course_id, content_type, position, is_paid, is_active, url, duration, thumbnail_url, created_at, updated_at)
                     VALUES ($1, $2, $3, 'VIDEO', $4, $5, $6, $7, $8, $9, NOW(), NOW())
                     ON CONFLICT (url, course_id)
                     DO UPDATE SET
                        name = EXCLUDED.name,
                        position = EXCLUDED.position,
                        is_paid = EXCLUDED.is_paid,
                        is_active = EXCLUDED.is_active,
                        duration = EXCLUDED.duration,
                        thumbnail_url = EXCLUDED.thumbnail_url,
                        updated_at = NOW()
                     RETURNING *`,
                    [
                        video.name,
                        moduleId,
                        courseId,
                        video.position,
                        video.is_paid,
                        video.is_active,
                        video.url,
                        video.duration,
                        video.thumbnail_url
                    ]
                );

                createdVideos.push(contentResult.rows[0]);
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_email: adminEmail,
                action: 'videos_saved',
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

    async reorderVideos(courseId: number, videoIds: number[], adminEmail: string): Promise<any[]> {
        try {
            const updatedVideos = [];

            for (let i = 0; i < videoIds.length; i++) {
                const position = i + 1;
                const videoId = videoIds[i];

                const result = await db.query(
                    `UPDATE contents
                     SET position = $1, updated_at = NOW()
                     WHERE id = $2 AND course_id = $3
                     RETURNING *`,
                    [position, videoId, courseId]
                );

                if (result.rows.length > 0) {
                    updatedVideos.push(result.rows[0]);
                }
            }

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_email: adminEmail,
                action: 'videos_reordered',
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

    async softDeleteVideo(videoId: number, adminEmail: string): Promise<boolean> {
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
                'SELECT course_id FROM contents WHERE id = $1',
                [videoId]
            );
            const courseId = courseResult.rows[0]?.course_id;

            // Log admin activity
            await this.logAdminActivityEnhanced({
                admin_email: adminEmail,
                action: 'video_soft_deleted',
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

    // Rejected Content Methods
    async getRejectedVideos(page: number = 1, limit: number = 10): Promise<{
        videos: RejectedVideo[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            const offset = (page - 1) * limit;

            // Get total count
            const countResult = await db.query(
                `SELECT COUNT(*) FROM rejected_videos`
            );
            const total = parseInt(countResult.rows[0].count, 10);

            // Get paginated results
            const videosResult = await db.query(
                `SELECT * FROM rejected_videos LIMIT $1 OFFSET $2`,
                [limit, offset]
            );

            return {
                videos: videosResult.rows as RejectedVideo[],
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error("Error getting rejected videos:", error);
            return {
                videos: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            };
        }
    }

    // Analytics Methods
    async getCourseApprovalStats(): Promise<any> {
        try {
            const result = await db.query('SELECT * FROM course_approval_stats');
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
                LEFT JOIN contents cont ON c.id = cont.course_id AND cont.is_active = true
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
                `SELECT * FROM contents
                 WHERE course_id = $1 AND type = 'VIDEO'
                 ORDER BY position`,
                [courseId]
            );

            course.videos = videosResult.rows;

            return course;
        } catch (error) {
            console.error("Error getting course details:", error);
            return null;
        }
    }
}
