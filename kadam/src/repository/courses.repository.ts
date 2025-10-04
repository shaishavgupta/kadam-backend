import { db } from "../infra/db";
import { Category, Module, Course, ContentWithModule, PaginatedCoursesResponse, Vector } from "../schemas/course";
import { ContentType } from "../shared/enums";
import { CourseListItem, CourseListData, UserStats, UpdateCourseRequest } from "../schemas/course";
import { UserCourse, UserCoursesResponse } from "../schemas/course";

export class CoursesRepository {

  async getHomePageCourseList(): Promise<CourseListData> {
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
        0 as likes,
        0 as views,
        0 as saves,
        0 as shares,
        c.created_at,
        c.rank as rating_ratio
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
      WHERE c.is_active = true
        AND c.creator_published_at IS NOT NULL
        AND c.approved_at IS NOT NULL
        AND (c.approved_at > c.creator_published_at OR c.approved_at > COALESCE(c.rejected_at, '1900-01-01'::timestamp))
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

    // Get for_you courses (ordered by rank)
    const forYouQuery = `
      ${baseQuery}
      ORDER BY c.rank DESC, c.created_at DESC
      LIMIT 10
    `;

    // Get top_10 courses (ordered by rank)
    const top10Query = `
      ${baseQuery}
      ORDER BY c.rank DESC, c.created_at DESC
      LIMIT 10
    `;

    // Get Popular courses (ordered by rank, offset from top_10)
    const popularQuery = `
      ${baseQuery}
      AND c.id NOT IN (
        SELECT id FROM (
          ${baseQuery}
          ORDER BY c.rank DESC, c.created_at DESC
          LIMIT 10
        ) top_courses
      )
      ORDER BY c.rank DESC, c.created_at DESC
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

  async getAllCourses(page: number, limit: number, rejected: boolean = false, published?: boolean): Promise<PaginatedCoursesResponse> {
    const offset = (page - 1) * limit;

    let coursesQuery = 'SELECT * FROM courses';
    let countQuery = 'SELECT COUNT(*) FROM courses';
    let whereConditions: string[] = [];

    if (rejected) {
      // Filter out rejected courses: approved_at IS NULL OR approved_at < rejected_at
      whereConditions.push('(approved_at IS NULL OR approved_at < rejected_at)');
    }

    if (published !== undefined) {
      if (published) {
        // Filter courses that have creator_published_at as not null
        whereConditions.push('creator_published_at IS NOT NULL');
      } else {
        // Filter courses that have creator_published_at as null
        whereConditions.push('creator_published_at IS NULL');
      }
    }

    if (whereConditions.length > 0) {
      const whereClause = 'WHERE ' + whereConditions.join(' AND ');
      coursesQuery += ` ${whereClause}`;
      countQuery += ` ${whereClause}`;
    }

    coursesQuery += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';

    const coursesResult = await db.query(coursesQuery, [limit, offset]);
    const totalResult = await db.query(countQuery);
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
      `SELECT
        c.id,
        c.name,
        c.description,
        c.module_id,
        c.content_type as type,
        c.position,
        c.is_paid,
        c.is_active,
        c.url,
        c.abs_url,
        c.duration,
        c.thumbnail_url,
        c.category_id,
        c.next_content_id,
        c.approved_at,
        c.approved_by,
        c.created_at,
        c.updated_at,
        m.name as module_title,
        m.description as module_description
      FROM contents c
      LEFT JOIN modules m ON c.module_id = m.id
      WHERE m.course_id = $1`,
      [courseId]
    );
    return result.rows as ContentWithModule[];
  }

  async getModulesByCreatorId(creatorId: number): Promise<Module[]> {
    try {
      const result = await db.query(
        `SELECT m.* FROM modules m
         INNER JOIN courses c ON m.course_id = c.id
         INNER JOIN course_creators cc ON c.id = cc.course_id
         WHERE cc.creator_id = $1 AND cc.is_active = true
         ORDER BY m.created_at DESC`,
        [creatorId]
      );
      return result.rows as Module[];
    } catch (error) {
      console.error("Error getting modules by creator ID:", error);
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

  async getCategoriesByIds(categoryIds: number[]): Promise<Category[]> {
    try {
      if (categoryIds.length === 0) return [];

      const placeholders = categoryIds.map((_, index) => `$${index + 1}`).join(',');
      const result = await db.query(
        `SELECT * FROM categories WHERE id IN (${placeholders}) ORDER BY name`,
        categoryIds
      );
      return result.rows as Category[];
    } catch (error) {
      console.error("Error getting categories by IDs:", error);
      return [];
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

      // Validate creator exists
      const creatorCheck = await db.query(
        `SELECT id FROM creators WHERE id = $1`,
        [courseData.creator_id]
      );

      if (creatorCheck.rows.length === 0) {
        throw new Error(`Creator with ID ${courseData.creator_id} does not exist`);
      }

      // Check uniqueness by name and creator
      const existingCourse = await db.query(
        `SELECT c.* FROM courses c
         JOIN course_creators cc ON c.id = cc.course_id
         WHERE c.name = $1 AND cc.creator_id = $2 AND c.is_active = true`,
        [courseData.name, courseData.creator_id]
      );

      if (existingCourse.rows.length > 0) {
        await db.query('COMMIT');
        return existingCourse.rows[0] as Course;
      }

      const courseResult = await db.query(
        `INSERT INTO courses (name, description, price, next_course_ids, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
        [courseData.name, courseData.description, courseData.price, courseData.next_course_ids || null]
      );

      if (courseResult.rows.length === 0) {
        throw new Error("Failed to create course");
      }

      const course = courseResult.rows[0] as Course;

      // Handle creator relationship
      await db.query(
        `INSERT INTO course_creators (course_id, creator_id, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [course.id, courseData.creator_id, true]
      );

      // Handle categories
      if (courseData.categories && courseData.categories.length > 0) {
        for (const categoryId of courseData.categories) {
          await db.query(
            `INSERT INTO course_categories (course_id, category_id) VALUES ($1, $2)`,
            [course.id, categoryId]
          );
        }
      }

      // Handle modules
      if (courseData.modules && courseData.modules.length > 0) {
        for (const moduleData of courseData.modules) {
          const moduleResult = await db.query(
            `INSERT INTO modules (name, description, course_id, thumbnail_url, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
            [moduleData.name, moduleData.description, course.id, moduleData.thumbnail_url || null]
          );

          if (moduleResult.rows.length === 0) {
            throw new Error("Failed to create module");
          }

          // Handle contents
          if (moduleData.contents && moduleData.contents.length > 0) {
            for (const contentData of moduleData.contents) {
              await db.query(
                `INSERT INTO contents (name, content_type, content_data, module_id, created_at, updated_at)
                                 VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                [contentData.name, contentData.content_type, contentData.content_data, moduleResult.rows[0].id]
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

  async updateCourse(id: number, courseData: UpdateCourseRequest): Promise<Course | null> {
    try {
      await db.query('BEGIN');

      // Validate creator exists if creator_id is provided
      if (courseData.creator_id) {
        const creatorCheck = await db.query(
          `SELECT id FROM creators WHERE id = $1`,
          [courseData.creator_id]
        );

        if (creatorCheck.rows.length === 0) {
          throw new Error(`Creator with ID ${courseData.creator_id} does not exist`);
        }
      }

      const result = await db.query(
        `UPDATE courses SET
          name = $1,
          description = $2,
          is_paid = $3,
          is_active = $4,
          price = $5,
          thumbnail_url = $6,
          certificate_id = $7,
          next_course_ids = $8,
          updated_at = NOW()
         WHERE id = $9 RETURNING *`,
        [
          courseData.name,
          courseData.description,
          courseData.is_paid,
          courseData.is_active,
          courseData.price,
          courseData.thumbnail_url || null,
          courseData.certificate_id || null,
          courseData.next_course_ids || null,
          id
        ]
      );

      if (result.rows.length === 0) {
        throw new Error("Course not found");
      }

      const course = result.rows[0] as Course;

      // Update creator relationship if creator_id is provided
      if (courseData.creator_id) {
        await db.query(`DELETE FROM course_creators WHERE course_id = $1`, [id]);
        await db.query(
          `INSERT INTO course_creators (course_id, creator_id, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())`,
          [id, courseData.creator_id, true]
        );
      }

      // Update categories
      await db.query(`DELETE FROM course_categories WHERE course_id = $1`, [id]);
      if (courseData.category_id) {
        await db.query(
          `INSERT INTO course_categories (course_id, category_id, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())`,
          [id, courseData.category_id]
        );
      }

      await db.query('COMMIT');
      return course;
    } catch (error) {
      await db.query('ROLLBACK');
      console.error("Error updating course:", error);
      return null;
    }
  }

  async getNextCourses(courseId: number): Promise<Course[]> {
    try {
      const result = await db.query(
        `SELECT c.* FROM courses c
         WHERE c.id = ANY(
           SELECT unnest(next_course_ids)
           FROM courses
           WHERE id = $1 AND next_course_ids IS NOT NULL
         )
         AND c.is_active = true
         AND c.creator_published_at IS NOT NULL
         AND c.approved_at IS NOT NULL
         AND (c.approved_at > c.creator_published_at OR c.approved_at > COALESCE(c.rejected_at, '1900-01-01'::timestamp))
         ORDER BY c.rank DESC`,
        [courseId]
      );
      return result.rows as Course[];
    } catch (error) {
      console.error("Error getting next courses:", error);
      return [];
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
        `UPDATE courses
         SET creator_published_at = NOW(),
             approved_by = NULL,
             approved_at = NULL,
             rejected_by = NULL,
             rejected_at = NULL,
             rejection_reason = NULL
         WHERE id = $1`,
        [id]
      );
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Error publishing course:", error);
      return false;
    }
  }

  async unpublishCourse(id: number, creatorId: string): Promise<boolean> {
    try {
      // First verify that the creator owns this course
      const ownershipCheck = await db.query(
        `SELECT c.id FROM courses c
         JOIN course_creators cc ON c.id = cc.course_id
         WHERE c.id = $1 AND cc.creator_id = $2 AND cc.is_active = true`,
        [id, creatorId]
      );

      if (ownershipCheck.rows.length === 0) {
        throw new Error("You don't have permission to unpublish this course");
      }

      const result = await db.query(
        `UPDATE courses SET creator_published_at = NULL WHERE id = $1`,
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
                 WHERE cc.category_id = $1
                   AND c.is_active = true
                   AND c.creator_published_at IS NOT NULL
                   AND c.approved_at IS NOT NULL
                   AND (c.approved_at > c.creator_published_at OR c.approved_at > COALESCE(c.rejected_at, '1900-01-01'::timestamp))
                 ORDER BY c.created_at DESC
                 LIMIT $2 OFFSET $3`,
        [categoryId, limit, offset]
      );

      // Get total count
      const totalResult = await db.query(
        `SELECT COUNT(*) FROM courses c
                 JOIN course_categories cc ON c.id = cc.course_id
                 WHERE cc.category_id = $1
                   AND c.is_active = true
                   AND c.creator_published_at IS NOT NULL
                   AND c.approved_at IS NOT NULL
                   AND (c.approved_at > c.creator_published_at OR c.approved_at > COALESCE(c.rejected_at, '1900-01-01'::timestamp))`,
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
          LEFT JOIN modules m ON ue.course_id = m.course_id
          LEFT JOIN contents c ON m.id = c.module_id AND c.is_active = true
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

  async calculateAndUpdateCourseRankings(): Promise<void> {
    try {
      console.log('🔄 Starting course ranking calculation...');

      // Calculate rankings for all published courses based on interactions
      const rankingQuery = `
        WITH course_interactions AS (
          SELECT
            c.id as course_id,
            c.name as course_name,
            -- Calculate total interactions for each course
            COALESCE(SUM(
              CASE
                WHEN v.id IS NOT NULL THEN 1  -- views
                ELSE 0
              END
            ), 0) as total_views,
            COALESCE(SUM(
              CASE
                WHEN l.id IS NOT NULL THEN 1  -- likes
                ELSE 0
              END
            ), 0) as total_likes,
            COALESCE(SUM(
              CASE
                WHEN cm.id IS NOT NULL THEN 1  -- comments
                ELSE 0
              END
            ), 0) as total_comments,
            COALESCE(SUM(
              CASE
                WHEN s.id IS NOT NULL THEN 1  -- shares
                ELSE 0
              END
            ), 0) as total_shares
          FROM courses c
          LEFT JOIN modules m ON c.id = m.course_id
          LEFT JOIN contents ct ON m.id = ct.module_id AND ct.is_active = true
          LEFT JOIN views v ON ct.id = v.parent_id AND v.parent_type = 'content' AND v.created_at >= NOW() - INTERVAL '30 days'
          LEFT JOIN likes l ON ct.id = l.parent_id AND l.parent_type = 'content' AND l.is_active = true AND l.created_at >= NOW() - INTERVAL '30 days'
          LEFT JOIN comments cm ON ct.id = cm.parent_id AND cm.parent_type = 'content' AND cm.is_active = true AND cm.created_at >= NOW() - INTERVAL '30 days'
          LEFT JOIN shares s ON ct.id = s.parent_id AND s.parent_type = 'content' AND s.created_at >= NOW() - INTERVAL '30 days'
          WHERE c.is_active = true
            AND c.creator_published_at IS NOT NULL
            AND c.approved_at IS NOT NULL
            AND (c.approved_at > c.creator_published_at OR c.approved_at > COALESCE(c.rejected_at, '1900-01-01'::timestamp))
          GROUP BY c.id, c.name
        ),
        course_scores AS (
          SELECT
            course_id,
            course_name,
            total_views,
            total_likes,
            total_comments,
            total_shares,
            -- Calculate score using the formula: (views * 1) + (likes * 3) + (comments * 5) + (shares * 8)
            (total_views * 1.0) + (total_likes * 3.0) + (total_comments * 5.0) + (total_shares * 8.0) as calculated_score
          FROM course_interactions
        )
        UPDATE courses
        SET
          rank = cs.calculated_score,
          updated_at = NOW()
        FROM course_scores cs
        WHERE courses.id = cs.course_id
        RETURNING courses.id, courses.name, cs.calculated_score as new_rank
      `;

      const result = await db.query(rankingQuery);

      console.log(`✅ Updated rankings for ${result.rows.length} courses`);
    } catch (error) {
      console.error('❌ Error calculating course rankings:', error);
      throw error;
    }
  }

  // Vector operations
  async createVector(string: string, vector: number[], source: 'contents' | 'courses', sourceId: number): Promise<Vector> {
    const result = await db.query(
      `INSERT INTO vectors (string, vector, source, source_id, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [string, vector, source, sourceId]
    );

    return {
      id: result.rows[0].id,
      string: result.rows[0].string,
      vector: result.rows[0].vector,
      created_at: result.rows[0].created_at.toISOString(),
      updated_at: result.rows[0].updated_at.toISOString(),
      source: result.rows[0].source,
      source_id: result.rows[0].source_id
    };
  }

  async updateVector(id: number, string: string, vector: number[]): Promise<Vector | null> {
    const result = await db.query(
      `UPDATE vectors
       SET string = $1, vector = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [string, vector, id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      string: result.rows[0].string,
      vector: result.rows[0].vector,
      created_at: result.rows[0].created_at.toISOString(),
      updated_at: result.rows[0].updated_at.toISOString(),
      source: result.rows[0].source,
      source_id: result.rows[0].source_id
    };
  }

  async getVectorBySourceId(source: 'contents' | 'courses', sourceId: number): Promise<Vector | null> {
    const result = await db.query(
      `SELECT * FROM vectors WHERE source = $1 AND source_id = $2`,
      [source, sourceId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      string: result.rows[0].string,
      vector: result.rows[0].vector,
      created_at: result.rows[0].created_at.toISOString(),
      updated_at: result.rows[0].updated_at.toISOString(),
      source: result.rows[0].source,
      source_id: result.rows[0].source_id
    };
  }

  async searchSimilarVectors(queryVector: number[], source: 'contents' | 'courses', limit: number = 10): Promise<Vector[]> {
    const result = await db.query(
      `SELECT *, 1 - (vector <=> $1) as similarity
       FROM vectors
       WHERE source = $2
       ORDER BY vector <=> $1
       LIMIT $3`,
      [queryVector, source, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      string: row.string,
      vector: row.vector,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      source: row.source,
      source_id: row.source_id
    }));
  }

  async deleteVector(id: number): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM vectors WHERE id = $1`,
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async deleteVectorBySourceId(source: 'contents' | 'courses', sourceId: number): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM vectors WHERE source = $1 AND source_id = $2`,
      [source, sourceId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  // Search methods
  async fuzzySearchCourses(searchString: string, limit: number = 5): Promise<Course[]> {
    try {
      const query = `
        SELECT
          c.id,
          c.name,
          c.description,
          c.is_paid,
          c.price,
          c.thumbnail_url,
          c.certificate_id,
          c.rank,
          c.creator_published_at,
          c.created_at,
          c.updated_at,
          c.next_course_ids,
          cat.name as category_name
        FROM courses c
        LEFT JOIN course_categories cc ON c.id = cc.course_id
        LEFT JOIN categories cat ON cc.category_id = cat.id
        WHERE c.is_active = true
          AND c.creator_published_at IS NOT NULL
          AND c.approved_at IS NOT NULL
          AND (c.approved_at > c.creator_published_at OR c.approved_at > COALESCE(c.rejected_at, '1900-01-01'::timestamp))
          AND (
            c.name ILIKE $1
            OR c.description ILIKE $1
          )
        ORDER BY c.rank DESC
        LIMIT $2
      `;

      const searchPattern = `%${searchString}%`;
      const result = await db.query(query, [searchPattern, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error in fuzzy search courses:', error);
      return [];
    }
  }

  async fuzzySearchContents(searchString: string, limit: number = 5): Promise<ContentWithModule[]> {
    try {
      const query = `
        SELECT
          c.id,
          c.name,
          c.module_id,
          c.content_type as type,
          c.position,
          c.is_paid,
          c.is_active,
          c.url,
          c.abs_url,
          c.duration,
          c.thumbnail_url,
          c.category_id,
          c.next_content_id,
          c.approved_at,
          c.approved_by,
          c.created_at,
          c.updated_at,
          m.name as module_name,
          m.description as module_description
        FROM contents c
        LEFT JOIN modules m ON c.module_id = m.id
        WHERE c.is_active = true
          AND (
            c.name ILIKE $1
            OR c.description ILIKE $1
          )
        ORDER BY c.position ASC
        LIMIT $2
      `;

      const searchPattern = `%${searchString}%`;
      const result = await db.query(query, [searchPattern, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error in fuzzy search contents:', error);
      return [];
    }
  }

  async fuzzySearchCombined(searchString: string, limit: number = 5): Promise<{
    courses: Course[];
    contents: ContentWithModule[];
  }> {
    try {
      const [courses, contents] = await Promise.all([
        this.fuzzySearchCourses(searchString, limit),
        this.fuzzySearchContents(searchString, limit)
      ]);

      return { courses, contents };
    } catch (error) {
      console.error('Error in fuzzy search combined:', error);
      return { courses: [], contents: [] };
    }
  }

  // Module Management Methods
  async getModulesByCourseId(courseId: number): Promise<Module[]> {
    try {
      const result = await db.query(
        `SELECT * FROM modules
         WHERE course_id = $1 AND is_active = true
         ORDER BY position ASC, created_at ASC`,
        [courseId]
      );
      return result.rows as Module[];
    } catch (error) {
      console.error("Error getting modules by course ID:", error);
      return [];
    }
  }

  async createModule(courseId: number, moduleData: {
    name: string;
    description: string;
    position: number;
    is_paid: boolean;
    is_active: boolean;
    thumbnail_url: string;
  }, createdBy: string): Promise<Module | null> {
    try {
      // Check uniqueness by courseId, name, and createdBy
      const existingModule = await db.query(
        `SELECT m.* FROM modules m
         JOIN courses c ON m.course_id = c.id
         JOIN course_creators cc ON c.id = cc.course_id
         WHERE m.course_id = $1 AND m.name = $2 AND cc.creator_id = $3 AND m.is_active = true`,
        [courseId, moduleData.name, createdBy]
      );

      if (existingModule.rows.length > 0) {
        return existingModule.rows[0] as Module;
      }

      const result = await db.query(
        `INSERT INTO modules (name, description, course_id, position, is_paid, is_active, thumbnail_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [moduleData.name, moduleData.description, courseId, moduleData.position, moduleData.is_paid, moduleData.is_active, moduleData.thumbnail_url || null]
      );
      return result.rows[0] as Module;
    } catch (error) {
      console.error("Error creating module:", error);
      return null;
    }
  }

  async updateModule(moduleId: number, moduleData: {
    name?: string;
    description?: string;
    position?: number;
    is_paid?: boolean;
    is_active?: boolean;
    thumbnail_url?: string;
  }, creatorId: string): Promise<Module | null> {
    try {
      // First verify that the creator owns the course that contains this module
      const ownershipCheck = await db.query(
        `SELECT m.id FROM modules m
         JOIN courses c ON m.course_id = c.id
         JOIN course_creators cc ON c.id = cc.course_id
         WHERE m.id = $1 AND cc.creator_id = $2 AND cc.is_active = true`,
        [moduleId, creatorId]
      );

      if (ownershipCheck.rows.length === 0) {
        throw new Error("You don't have permission to update this module");
      }

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (moduleData.name !== undefined) {
        updateFields.push(`name = $${paramCount}`);
        values.push(moduleData.name);
        paramCount++;
      }
      if (moduleData.description !== undefined) {
        updateFields.push(`description = $${paramCount}`);
        values.push(moduleData.description);
        paramCount++;
      }
      if (moduleData.position !== undefined) {
        updateFields.push(`position = $${paramCount}`);
        values.push(moduleData.position);
        paramCount++;
      }
      if (moduleData.is_paid !== undefined) {
        updateFields.push(`is_paid = $${paramCount}`);
        values.push(moduleData.is_paid);
        paramCount++;
      }
      if (moduleData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount}`);
        values.push(moduleData.is_active);
        paramCount++;
      }
      if (moduleData.thumbnail_url !== undefined) {
        updateFields.push(`thumbnail_url = $${paramCount}`);
        values.push(moduleData.thumbnail_url);
        paramCount++;
      }

      if (updateFields.length === 0) {
        return null;
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(moduleId);

      const result = await db.query(
        `UPDATE modules SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      return result.rows[0] as Module;
    } catch (error) {
      console.error("Error updating module:", error);
      return null;
    }
  }

  async deleteModule(moduleId: number, creatorId: string): Promise<boolean> {
    try {
      // First verify that the creator owns the course that contains this module
      const ownershipCheck = await db.query(
        `SELECT m.id FROM modules m
         JOIN courses c ON m.course_id = c.id
         JOIN course_creators cc ON c.id = cc.course_id
         WHERE m.id = $1 AND cc.creator_id = $2 AND cc.is_active = true`,
        [moduleId, creatorId]
      );

      if (ownershipCheck.rows.length === 0) {
        throw new Error("You don't have permission to delete this module");
      }

      const result = await db.query(
        `UPDATE modules SET is_active = false, updated_at = NOW() WHERE id = $1`,
        [moduleId]
      );
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Error deleting module:", error);
      return false;
    }
  }

  // Content Management Methods
  async getContentByModuleId(moduleId: number): Promise<ContentWithModule[]> {
    try {
      const result = await db.query(
        `SELECT
          c.id,
          c.name,
          c.description,
          c.module_id,
          c.content_type as type,
          c.position,
          c.is_paid,
          c.is_active,
          c.url,
          c.abs_url,
          c.duration,
          c.thumbnail_url,
          c.category_id,
          c.next_content_id,
          c.approved_at,
          c.approved_by,
          c.created_at,
          c.updated_at,
          m.name as module_title,
          m.description as module_description
         FROM contents c
         LEFT JOIN modules m ON c.module_id = m.id
         WHERE c.module_id = $1 AND c.is_active = true
         ORDER BY c.position ASC, c.created_at ASC`,
        [moduleId]
      );
      return result.rows as ContentWithModule[];
    } catch (error) {
      console.error("Error getting content by module ID:", error);
      return [];
    }
  }

  async createContent(moduleId: number, contentData: {
    name: string;
    description: string;
    content_type: ContentType;
    position: number;
    is_paid: boolean;
    is_active: boolean;
    url?: string;
    abs_url?: string;
    duration?: number;
    thumbnail_url?: string;
    category_id?: number;
    next_content_id?: number;
  }, createdBy: string): Promise<ContentWithModule | null> {
    try {
      // Get course_id from module
      const moduleResult = await db.query(
        `SELECT course_id FROM modules WHERE id = $1`,
        [moduleId]
      );

      if (moduleResult.rows.length === 0 || moduleResult.rows[0].course_id === null) {
        throw new Error(`Module with ID ${moduleId} does not exist or does not belong to a course`);
      }

      const courseId = moduleResult.rows[0].course_id;

      // Check uniqueness by courseId, moduleId, name, and createdBy
      const existingContent = await db.query(
        `SELECT c.*, m.name as module_title, m.description as module_description FROM contents c
         JOIN modules m ON c.module_id = m.id
         JOIN courses co ON m.course_id = co.id
         JOIN course_creators cc ON co.id = cc.course_id
         WHERE c.module_id = $1 AND c.name = $2 AND cc.creator_id = $3 AND c.is_active = true`,
        [moduleId, contentData.name, createdBy]
      );

      if (existingContent.rows.length > 0) {
        return existingContent.rows[0] as ContentWithModule;
      }

      const result = await db.query(
        `INSERT INTO contents (name, description, content_type, module_id, position, is_paid, is_active, url, abs_url, duration, thumbnail_url, category_id, next_content_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
         RETURNING
           id,
           name,
           description,
           module_id,
           content_type as type,
           position,
           is_paid,
           is_active,
           url,
           abs_url,
           duration,
           thumbnail_url,
           category_id,
           next_content_id,
           approved_at,
           approved_by,
           created_at,
           updated_at`,
        [contentData.name, contentData.description, contentData.content_type, moduleId, contentData.position, contentData.is_paid, contentData.is_active, contentData.url, contentData.abs_url, contentData.duration, contentData.thumbnail_url, contentData.category_id, contentData.next_content_id]
      );

      const content = result.rows[0];
      return {
        ...content,
        module_title: null,
        module_description: null
      } as ContentWithModule;
    } catch (error) {
      console.error("Error creating content:", error);
      return null;
    }
  }

  async updateContent(contentId: number, contentData: {
    name?: string;
    description?: string;
    content_type?: ContentType;
    position?: number;
    is_paid?: boolean;
    is_active?: boolean;
    url?: string;
    abs_url?: string;
    duration?: number;
    thumbnail_url?: string;
    category_id?: number;
    next_content_id?: number;
  }, creatorId: string): Promise<ContentWithModule | null> {
    try {
      // First verify that the creator owns the course that contains this content
      const ownershipCheck = await db.query(
        `SELECT c.id FROM contents c
         JOIN modules m ON c.module_id = m.id
         JOIN courses co ON m.course_id = co.id
         JOIN course_creators cc ON co.id = cc.course_id
         WHERE c.id = $1 AND cc.creator_id = $2 AND cc.is_active = true`,
        [contentId, creatorId]
      );

      if (ownershipCheck.rows.length === 0) {
        throw new Error("You don't have permission to update this content");
      }

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (contentData.name !== undefined) {
        updateFields.push(`name = $${paramCount}`);
        values.push(contentData.name);
        paramCount++;
      }
      if (contentData.description !== undefined) {
        updateFields.push(`description = $${paramCount}`);
        values.push(contentData.description);
        paramCount++;
      }
      if (contentData.content_type !== undefined) {
        updateFields.push(`content_type = $${paramCount}`);
        values.push(contentData.content_type);
        paramCount++;
      }
      if (contentData.position !== undefined) {
        updateFields.push(`position = $${paramCount}`);
        values.push(contentData.position);
        paramCount++;
      }
      if (contentData.is_paid !== undefined) {
        updateFields.push(`is_paid = $${paramCount}`);
        values.push(contentData.is_paid);
        paramCount++;
      }
      if (contentData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount}`);
        values.push(contentData.is_active);
        paramCount++;
      }
      if (contentData.url !== undefined) {
        updateFields.push(`url = $${paramCount}`);
        values.push(contentData.url);
        paramCount++;
      }
      if (contentData.abs_url !== undefined) {
        updateFields.push(`abs_url = $${paramCount}`);
        values.push(contentData.abs_url);
        paramCount++;
      }
      if (contentData.duration !== undefined) {
        updateFields.push(`duration = $${paramCount}`);
        values.push(contentData.duration);
        paramCount++;
      }
      if (contentData.thumbnail_url !== undefined) {
        updateFields.push(`thumbnail_url = $${paramCount}`);
        values.push(contentData.thumbnail_url);
        paramCount++;
      }
      if (contentData.category_id !== undefined) {
        updateFields.push(`category_id = $${paramCount}`);
        values.push(contentData.category_id);
        paramCount++;
      }
      if (contentData.next_content_id !== undefined) {
        updateFields.push(`next_content_id = $${paramCount}`);
        values.push(contentData.next_content_id);
        paramCount++;
      }

      if (updateFields.length === 0) {
        return null;
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(contentId);

      const result = await db.query(
        `UPDATE contents SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING
          id,
          name,
          description,
          module_id,
          content_type as type,
          position,
          is_paid,
          is_active,
          url,
          abs_url,
          duration,
          thumbnail_url,
          category_id,
          next_content_id,
          approved_at,
          approved_by,
          created_at,
          updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      const content = result.rows[0];
      return {
        ...content,
        module_title: null,
        module_description: null
      } as ContentWithModule;
    } catch (error) {
      console.error("Error updating content:", error);
      return null;
    }
  }

  async deleteContent(contentId: number, creatorId: string): Promise<boolean> {
    try {
      // First verify that the creator owns the course that contains this content
      const ownershipCheck = await db.query(
        `SELECT c.id FROM contents c
         JOIN modules m ON c.module_id = m.id
         JOIN courses co ON m.course_id = co.id
         JOIN course_creators cc ON co.id = cc.course_id
         WHERE c.id = $1 AND cc.creator_id = $2 AND cc.is_active = true`,
        [contentId, creatorId]
      );

      if (ownershipCheck.rows.length === 0) {
        throw new Error("You don't have permission to delete this content");
      }

      const result = await db.query(
        `UPDATE contents SET is_active = false, updated_at = NOW() WHERE id = $1`,
        [contentId]
      );
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Error deleting content:", error);
      return false;
    }
  }

  async getContentById(contentId: number): Promise<{ id: number; course_id: number; module_id: number; name: string; description: string } | null> {
    try {
      const result = await db.query(
        `SELECT c.id, c.module_id, m.course_id, c.name, c.description
         FROM contents c
         JOIN modules m ON c.module_id = m.id
         WHERE c.id = $1 AND c.is_active = true`,
        [contentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error("Error getting content by ID:", error);
      return null;
    }
  }

  // Enhanced Course Data Method
  async getCourseWithModulesAndContent(courseId: number): Promise<any> {
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

      // Get modules with content count
      const modulesResult = await db.query(
        `SELECT m.*, COUNT(c.id) as content_count
         FROM modules m
         LEFT JOIN contents c ON m.id = c.module_id AND c.is_active = true
         WHERE m.course_id = $1 AND m.is_active = true
         GROUP BY m.id
         ORDER BY m.position ASC, m.created_at ASC`,
        [courseId]
      );

      const modules = modulesResult.rows.map(module => ({
        ...module,
        contentCount: parseInt(module.content_count),
        content: [] // Will be populated if needed
      }));

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

  // Get course details by video ID (content ID)
  async getCourseWithModulesAndContentByVideoId(videoId: number): Promise<any> {
    try {
      // First, get the course ID from the video ID
      const courseIdResult = await db.query(
        `SELECT m.course_id
         FROM contents c
         JOIN modules m ON c.module_id = m.id
         WHERE c.id = $1`,
        [videoId]
      );

      if (courseIdResult.rows.length === 0) {
        return null;
      }

      const courseId = courseIdResult.rows[0].course_id;

      // Now get the full course details using the existing method
      return await this.getCourseWithModulesAndContent(courseId);
    } catch (error) {
      console.error("Error getting course with modules and content by video ID:", error);
      return null;
    }
  }

  // Get approved and active course by ID with modules and content for frontend
  async getApprovedCourseWithHierarchy(courseId: number): Promise<UserCourse | null> {
    try {
      // Get the specific course
      const courseResult = await db.query(
        `SELECT c.* FROM courses c
         WHERE c.id = $1
           AND c.is_active = true
           AND c.creator_published_at IS NOT NULL
           AND c.approved_at IS NOT NULL
           AND (c.approved_at > c.creator_published_at OR c.approved_at > COALESCE(c.rejected_at, '1900-01-01'::timestamp))`,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return null;
      }

      const course = courseResult.rows[0];

      // Get modules for this course (only active and approved)
      const modulesResult = await db.query(
        `SELECT m.* FROM modules m
         WHERE m.course_id = $1
           AND m.is_active = true
           AND (m.approved_at IS NOT NULL OR m.approved_at IS NULL)
         ORDER BY m.position ASC, m.created_at ASC`,
        [courseId]
      );

      // For each module, get its contents (only active and approved)
      const modules = await Promise.all(
        modulesResult.rows.map(async (module) => {
          const contentsResult = await db.query(
            `SELECT c.* FROM contents c
             WHERE c.module_id = $1
               AND c.is_active = true
               AND (c.approved_at IS NOT NULL OR c.approved_at IS NULL)
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
         WHERE m.course_id = $1
           AND c.is_active = true
           AND m.is_active = true
           AND (c.approved_at IS NOT NULL OR c.approved_at IS NULL)
           AND (m.approved_at IS NOT NULL OR m.approved_at IS NULL)`,
        [courseId]
      );
      const totalContent = parseInt(totalContentResult.rows[0].total);

      return {
        ...course,
        totalModules,
        totalContent,
        modules
      } as UserCourse;
    } catch (error) {
      console.error("Error getting approved course with hierarchy:", error);
      return null;
    }
  }
}
