import { db } from "../infra/db";
import { ContentType, Tag, Category, Module, Course, ContentWithModule, PaginatedCoursesResponse, Vector } from "../shared/types/courses.types";
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
      `SELECT c.*, m.name as module_title, m.description as module_description
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
        `INSERT INTO courses (name, description, creator_id, price, is_published, next_course_ids, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
        [courseData.name, courseData.description, courseData.creator_id, courseData.price, false, courseData.next_course_ids || null]
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
                `INSERT INTO contents (name, content_type, content_data, module_id, course_id, created_at, updated_at)
                                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
                [contentData.name, contentData.content_type, contentData.content_data, moduleResult.rows[0].id, course.id]
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
        `UPDATE courses SET name = $1, description = $2, price = $3, next_course_ids = $4, updated_at = NOW()
                 WHERE id = $5 RETURNING *`,
        [courseData.name, courseData.description, courseData.price, courseData.next_course_ids || null, id]
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

  async getNextCourses(courseId: number): Promise<Course[]> {
    try {
      const result = await db.query(
        `SELECT c.* FROM courses c
         WHERE c.id = ANY(
           SELECT unnest(next_course_ids)
           FROM courses
           WHERE id = $1 AND next_course_ids IS NOT NULL
         )
         AND c.is_active = true AND c.published_at IS NOT NULL
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
          LEFT JOIN contents ct ON c.id = ct.course_id AND ct.is_active = true
          LEFT JOIN views v ON ct.id = v.parent_id AND v.parent_type = 'content' AND v.created_at >= NOW() - INTERVAL '30 days'
          LEFT JOIN likes l ON ct.id = l.parent_id AND l.parent_type = 'content' AND l.is_active = true AND l.created_at >= NOW() - INTERVAL '30 days'
          LEFT JOIN comments cm ON ct.id = cm.parent_id AND cm.parent_type = 'content' AND cm.is_active = true AND cm.created_at >= NOW() - INTERVAL '30 days'
          LEFT JOIN shares s ON ct.id = s.parent_id AND s.parent_type = 'content' AND s.created_at >= NOW() - INTERVAL '30 days'
          WHERE c.is_active = true AND c.published_at IS NOT NULL
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
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at,
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
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at,
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
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at,
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
      created_at: row.created_at,
      updated_at: row.updated_at,
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
          c.certificate_url,
          c.rank,
          c.published_at,
          c.created_at,
          c.updated_at,
          c.next_course_ids,
          cat.name as category_name,
          SIMILARITY(c.name, $1) as similarity_score
        FROM courses c
        LEFT JOIN course_categories cc ON c.id = cc.course_id
        LEFT JOIN categories cat ON cc.category_id = cat.id
        WHERE c.is_active = true
          AND c.published_at IS NOT NULL
          AND (
            SIMILARITY(c.name, $1) > 0.1
            OR SIMILARITY(c.description, $1) > 0.1
            OR c.name ILIKE $2
            OR c.description ILIKE $2
          )
        ORDER BY similarity_score DESC, c.rank DESC
        LIMIT $3
      `;

      const searchPattern = `%${searchString}%`;
      const result = await db.query(query, [searchString, searchPattern, limit]);
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
          c.course_id,
          c.content_type,
          c.position,
          c.is_paid,
          c.is_active,
          c.url,
          c.duration,
          c.thumbnail_url,
          c.category_id,
          c.next_content_id,
          c.approved_at,
          c.approved_by,
          c.created_at,
          c.updated_at,
          m.name as module_name,
          m.description as module_description,
          SIMILARITY(c.name, $1) as similarity_score
        FROM contents c
        LEFT JOIN modules m ON c.module_id = m.id
        WHERE c.is_active = true
          AND (
            SIMILARITY(c.name, $1) > 0.1
            OR c.name ILIKE $2
          )
        ORDER BY similarity_score DESC, c.position ASC
        LIMIT $3
      `;

      const searchPattern = `%${searchString}%`;
      const result = await db.query(query, [searchString, searchPattern, limit]);
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
}
