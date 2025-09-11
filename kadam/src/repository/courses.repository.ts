import { db } from "../infra/db/db";
import { ContentType, Tag, Category, Module, Course, ContentWithModule, PaginatedCoursesResponse } from "../shared/types/courses.types";

export class CoursesRepository {

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

  async getCoursesByCategory(categoryId: number): Promise<Course[]> {
    try {
      const result = await db.query(
        `SELECT c.* FROM courses c
                 JOIN course_categories cc ON c.id = cc.course_id
                 WHERE cc.category_id = $1 AND c.is_published = true`,
        [categoryId]
      );
      return result.rows as Course[];
    } catch (error) {
      console.error("Error getting courses by category:", error);
      return [];
    }
  }

      async getCurrentlyEnrolledCourses(userId: number): Promise<Course[]> {
        // This is a placeholder. You should implement the logic to get the actual data.
        return [];
    }

    async getPopularCategories(): Promise<Category[]> {
    try {
      const result = await db.query(
        `SELECT c.*, COUNT(cc.course_id) as course_count
                 FROM categories c
                 LEFT JOIN course_categories cc ON c.id = cc.category_id
                 GROUP BY c.id
                 ORDER BY course_count DESC
                 LIMIT 10`
      );
      return result.rows as Category[];
    } catch (error) {
      console.error("Error getting popular categories:", error);
      return [];
    }
  }
}
