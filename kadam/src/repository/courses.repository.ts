import { db } from "../infra/db";
import { ContentType, Tag, Category, Module, Course, ContentWithModule, PaginatedCoursesResponse } from "../shared/types/courses.types";
import { CourseListItem, CourseListData, UserStats } from "../schemas/course";

export class CoursesRepository {

  async getCourseList(): Promise<CourseListData> {
    // Base query for course data with ratings
    const baseQuery = `
      SELECT
        c.id,
        c.name as title,
        c.thumbnail_url as thumbnail,
        c.description,
        cat.name as category,
        COALESCE(video_count.total_videos, 0) as total_videos,
        COALESCE(duration_sum.total_duration, 0) as total_duration,
        COALESCE(c.avg_rating, 0) as likes,
        COALESCE(c.num_ratings, 0) as views,
        0 as saves,
        0 as shares,
        c.created_at,
        CASE
          WHEN c.num_ratings > 0 THEN c.avg_rating / c.num_ratings
          ELSE 0
        END as rating_ratio
      FROM courses c
      LEFT JOIN course_categories cc ON c.id = cc.course_id
      LEFT JOIN categories cat ON cc.category_id = cat.id
      LEFT JOIN (
        SELECT course_id, COUNT(*) as total_videos
        FROM contents
        WHERE content_type = 'VIDEO' AND is_active = true
        GROUP BY course_id
      ) video_count ON c.id = video_count.course_id
      LEFT JOIN (
        SELECT course_id, SUM(COALESCE(duration, 0)) as total_duration
        FROM contents
        WHERE is_active = true
        GROUP BY course_id
      ) duration_sum ON c.id = duration_sum.course_id
      WHERE c.is_active = true AND c.published_at IS NOT NULL
    `;

    // Get keep_watching courses (from user_enrollments)
    const keepWatchingQuery = `
      ${baseQuery}
      AND c.id IN (
        SELECT DISTINCT ue.course_id
        FROM user_enrollments ue
        WHERE ue.completed_at IS NULL AND ue.progress > 0
        ORDER BY ue.created_at DESC
      )
      ORDER BY ue.created_at DESC
    `;

    // Get for_you courses (ordered by rating ratio)
    const forYouQuery = `
      ${baseQuery}
      ORDER BY rating_ratio DESC, c.avg_rating DESC
      LIMIT 10
    `;

    // Get top_10 courses (highest rating ratio)
    const top10Query = `
      ${baseQuery}
      ORDER BY rating_ratio DESC, c.avg_rating DESC
      LIMIT 10
    `;

    // Get Popular courses (not in top_10 but still good ratings)
    const popularQuery = `
      ${baseQuery}
      AND c.id NOT IN (
        SELECT id FROM (
          ${baseQuery}
          ORDER BY rating_ratio DESC, c.avg_rating DESC
          LIMIT 10
        ) top_courses
      )
      ORDER BY rating_ratio DESC, c.avg_rating DESC
      LIMIT 20 OFFSET 10
    `;

    // Get Latest courses
    const latestQuery = `
      ${baseQuery}
      ORDER BY c.created_at DESC
      LIMIT 10
    `;

    try {
      const [keepWatchingResult, forYouResult, top10Result, popularResult, latestResult] = await Promise.all([
        db.query(keepWatchingQuery),
        db.query(forYouQuery),
        db.query(top10Query),
        db.query(popularQuery),
        db.query(latestQuery)
      ]);

      return {
        keep_watching: keepWatchingResult.rows as CourseListItem[],
        for_you: forYouResult.rows as CourseListItem[],
        top_10: top10Result.rows as CourseListItem[],
        popular: popularResult.rows as CourseListItem[],
        latest: latestResult.rows as CourseListItem[]
      };
    } catch (error) {
      console.error("Error getting course list:", error);
      return {
        keep_watching: [],
        for_you: [],
        top_10: [],
        popular: [],
        latest: []
      };
    }
  }

  async getAllCourses(page: number, limit: number): Promise<PaginatedCoursesResponse> {
    const offset = (page - 1) * limit;
    const coursesResult = await db.query('SELECT * FROM courses LIMIT $1 OFFSET $2', [limit, offset]);
    const totalResult = await db.query('SELECT COUNT(*) FROM courses');
    const total = parseInt(totalResult.rows[0].count, 10);

    return {
      courses: coursesResult.rows as Course[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getContentsByCourseId(courseId: number): Promise<ContentWithModule[]> {
    const result = await db.query(
      `SELECT c.*, m.title as module_title, m.description as module_description
      FROM contents c
      LEFT JOIN modules m ON c.module_id = m.id
                 WHERE c.course_id = $1`,
      [courseId]
    );
    return result.rows as ContentWithModule[];
  }

  async getModulesByCreatorId(creatorId: number): Promise<Module[]> {
    try {
      const result = await db.query(
        `SELECT * FROM modules WHERE creator_id = $1 ORDER BY created_at DESC`,
        [creatorId]
      );
      return result.rows as Module[];
    } catch (error) {
      console.error("Error getting modules by creator ID:", error);
      return [];
    }
  }

  async searchTags(contentName?: string, courseName?: string, moduleName?: string): Promise<Tag[]> {
    try {
      let query = `SELECT DISTINCT t.* FROM tags t`;
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      if (contentName) {
        conditions.push(`t.name ILIKE $${paramCount}`);
        params.push(`%${contentName}%`);
        paramCount++;
      }

      if (courseName) {
        conditions.push(`t.name ILIKE $${paramCount}`);
        params.push(`%${courseName}%`);
        paramCount++;
      }

      if (moduleName) {
        conditions.push(`t.name ILIKE $${paramCount}`);
        params.push(`%${moduleName}%`);
        paramCount++;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' OR ')}`;
      }

      const result = await db.query(query, params);
      return result.rows as Tag[];
    } catch (error) {
      console.error("Error searching tags:", error);
      return [];
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const result = await db.query(`SELECT * FROM categories ORDER BY name`);
      return result.rows as Category[];
    } catch (error) {
      console.error("Error getting categories:", error);
      return [];
    }
  }

  async createTag(name: string, type: ContentType): Promise<Tag | null> {
    try {
      if (!Object.values(ContentType).includes(type)) {
        throw new Error(`Invalid content type: ${type}`);
      }

      const existingTag = await db.query(
        `SELECT * FROM tags WHERE name = $1 AND type = $2`,
        [name, type]
      );

      if (existingTag.rows.length > 0) {
        return existingTag.rows[0] as Tag;
      }

      const result = await db.query(
        `INSERT INTO tags (name, type) VALUES ($1, $2) RETURNING *`,
        [name, type]
      );

      if (result.rows.length > 0) {
        return result.rows[0] as Tag;
      }
      return null;
    } catch (error) {
      console.error("Error creating tag:", error);
      return null;
    }
  }

  async createCategory(name: string, description?: string): Promise<Category | null> {
    try {
      const existingCategory = await db.query(
        `SELECT * FROM categories WHERE name = $1`,
        [name]
      );

      if (existingCategory.rows.length > 0) {
        return existingCategory.rows[0] as Category;
      }

      const result = await db.query(
        `INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *`,
        [name, description]
      );

      if (result.rows.length > 0) {
        return result.rows[0] as Category;
      }
      return null;
    } catch (error) {
      console.error("Error creating category:", error);
      return null;
    }
  }

  async createCourse(courseData: any): Promise<Course | null> {
    try {
      await db.query('BEGIN');

      const courseResult = await db.query(
        `INSERT INTO courses (title, description, creator_id, price, is_published, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
        [courseData.title, courseData.description, courseData.creator_id, courseData.price, false]
      );

      if (courseResult.rows.length === 0) {
        throw new Error("Failed to create course");
      }

      const course = courseResult.rows[0] as Course;

      // Handle categories
      if (courseData.categories && courseData.categories.length > 0) {
        for (const categoryId of courseData.categories) {
          await db.query(
            `INSERT INTO course_categories (course_id, category_id) VALUES ($1, $2)`,
            [course.id, categoryId]
          );
        }
      }

      // Handle tags
      if (courseData.tags && courseData.tags.length > 0) {
        for (const tagId of courseData.tags) {
          await db.query(
            `INSERT INTO course_tags (course_id, tag_id) VALUES ($1, $2)`,
            [course.id, tagId]
          );
        }
      }

      // Handle modules
      if (courseData.modules && courseData.modules.length > 0) {
        for (const moduleData of courseData.modules) {
          const moduleResult = await db.query(
            `INSERT INTO modules (title, description, course_id, created_at, updated_at)
                         VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
            [moduleData.title, moduleData.description, course.id]
          );

          if (moduleResult.rows.length === 0) {
            throw new Error("Failed to create module");
          }

          // Handle contents
          if (moduleData.contents && moduleData.contents.length > 0) {
            for (const contentData of moduleData.contents) {
              await db.query(
                `INSERT INTO contents (title, content_type, content_data, module_id, course_id, created_at, updated_at)
                                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
                [contentData.title, contentData.content_type, contentData.content_data, moduleResult.rows[0].id, course.id]
              );
            }
          }
        }
      }

      await db.query('COMMIT');
      return course;
    } catch (error) {
      await db.query('ROLLBACK');
      console.error("Error creating course:", error);
      return null;
    }
  }

  async updateCourse(id: number, courseData: any): Promise<Course | null> {
    try {
      await db.query('BEGIN');

      const result = await db.query(
        `UPDATE courses SET title = $1, description = $2, price = $3, updated_at = NOW()
                 WHERE id = $4 RETURNING *`,
        [courseData.title, courseData.description, courseData.price, id]
      );

      if (result.rows.length === 0) {
        throw new Error("Course not found");
      }

      const course = result.rows[0] as Course;

      // Update categories
      await db.query(`DELETE FROM course_categories WHERE course_id = $1`, [id]);
      if (courseData.categories && courseData.categories.length > 0) {
        for (const categoryId of courseData.categories) {
          await db.query(
            `INSERT INTO course_categories (course_id, category_id) VALUES ($1, $2)`,
            [id, categoryId]
          );
        }
      }

      // Update tags
      await db.query(`DELETE FROM course_tags WHERE course_id = $1`, [id]);
      if (courseData.tags && courseData.tags.length > 0) {
        for (const tagId of courseData.tags) {
          await db.query(
            `INSERT INTO course_tags (course_id, tag_id) VALUES ($1, $2)`,
            [id, tagId]
          );
        }
      }

      await db.query('COMMIT');
      return course;
    } catch (error) {
      await db.query('ROLLBACK');
      console.error("Error updating course:", error);
      return null;
    }
  }

  async getCourseById(id: number): Promise<Course | null> {
    try {
      const result = await db.query(
        `SELECT * FROM courses WHERE id = $1`,
        [id]
      );
      if (result.rows.length > 0) {
        return result.rows[0] as Course;
      }
      return null;
    } catch (error) {
      console.error("Error getting course by ID:", error);
      return null;
    }
  }

  async publishCourse(id: number): Promise<boolean> {
    try {
      const result = await db.query(
        `UPDATE courses SET is_published = true, published_at = NOW() WHERE id = $1`,
        [id]
      );
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Error publishing course:", error);
      return false;
    }
  }

  async unpublishCourse(id: number): Promise<boolean> {
    try {
      const result = await db.query(
        `UPDATE courses SET is_published = false, published_at = NULL WHERE id = $1`,
        [id]
      );
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Error unpublishing course:", error);
      return false;
    }
  }

  async getCoursesByCategory(categoryId: number, page: number = 1, limit: number = 10): Promise<PaginatedCoursesResponse> {
    try {
      const offset = (page - 1) * limit;

      // Get paginated courses
      const coursesResult = await db.query(
        `SELECT c.* FROM courses c
                 JOIN course_categories cc ON c.id = cc.course_id
                 WHERE cc.category_id = $1 AND c.is_published = true
                 ORDER BY c.created_at DESC
                 LIMIT $2 OFFSET $3`,
        [categoryId, limit, offset]
      );

      // Get total count
      const totalResult = await db.query(
        `SELECT COUNT(*) FROM courses c
                 JOIN course_categories cc ON c.id = cc.course_id
                 WHERE cc.category_id = $1 AND c.is_published = true`,
        [categoryId]
      );

      const total = parseInt(totalResult.rows[0].count, 10);

      return {
        courses: coursesResult.rows as Course[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error("Error getting courses by category:", error);
      return {
        courses: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      };
    }
  }

  async getCurrentlyEnrolledCourses(userId: number): Promise<Course[]> {
    // This is a placeholder. You should implement the logic to get the actual data.
    return [];
  }

  async getUserStats(userId: number): Promise<UserStats> {
    try {
      const query = `
        WITH user_stats AS (
          SELECT
            COUNT(DISTINCT ue.course_id) as total_courses_started,
            COALESCE(SUM(
              CASE
                WHEN c.duration IS NOT NULL THEN c.duration / 3600.0  -- Convert seconds to hours
                ELSE 0
              END
            ), 0) as total_hours_spent,
            COALESCE(AVG(
              CASE
                WHEN c.duration IS NOT NULL THEN c.duration / 3600.0  -- Convert seconds to hours
                ELSE 0
              END
            ), 0) as avg_hours_per_course
          FROM user_enrollments ue
          LEFT JOIN contents c ON ue.course_id = c.course_id AND c.is_active = true
          WHERE ue.user_id = $1
        ),
        user_activity_days AS (
          SELECT
            COUNT(DISTINCT DATE(ue.created_at)) as active_days
          FROM user_enrollments ue
          WHERE ue.user_id = $1
        )
        SELECT
          us.total_courses_started,
          us.total_hours_spent,
          CASE
            WHEN uad.active_days > 0 THEN us.total_hours_spent / uad.active_days
            ELSE 0
          END as avg_hours_per_day
        FROM user_stats us
        CROSS JOIN user_activity_days uad
      `;

      const result = await db.query(query, [userId]);

      if (result.rows.length === 0) {
        return {
          total_courses_started: 0,
          total_hours_spent: 0,
          avg_hours_per_day: 0
        };
      }

      return result.rows[0] as UserStats;
    } catch (error) {
      console.error("Error getting user stats:", error);
      return {
        total_courses_started: 0,
        total_hours_spent: 0,
        avg_hours_per_day: 0
      };
    }
  }
}
