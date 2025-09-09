import { coursesDB } from "./db";
import { ContentType, Tag, Category, Module, Course, ContentWithModule } from "./types";
import { APIError, ErrCode } from "encore.dev/api";

export class CoursesRepository {
  // Get all contents by course_id with module information
  async getContentsByCourseId(courseId: number): Promise<ContentWithModule[]> {
    const contents = await coursesDB.query<ContentWithModule>`
      SELECT c.*, m.id as module_id
      FROM contents c
      LEFT JOIN modules m ON c.module_id = m.id
      WHERE c.course_id = ${courseId}
      ORDER BY c.position ASC
    `;

    const result: ContentWithModule[] = [];
    for await (const content of contents) {
      result.push(content);
    }
    return result;
  }

  // Get all modules by creator_id
  async getModulesByCreatorId(creatorId: number): Promise<Module[]> {
    const modules = await coursesDB.query<Module>`
      SELECT m.*
      FROM modules m
      JOIN course_creators cc ON m.id = cc.course_id
      WHERE cc.creator_id = ${creatorId}
      ORDER BY m.position ASC
    `;

    const result: Module[] = [];
    for await (const module of modules) {
      result.push(module);
    }
    return result;
  }

  // Get tags by content, course, and module names
  async getTagsByNames(contentName?: string, courseName?: string, moduleName?: string): Promise<Tag[]> {
    let query = `SELECT DISTINCT t.* FROM tags t`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (contentName) {
      conditions.push(`EXISTS (SELECT 1 FROM contents c WHERE c.name LIKE $${params.length + 1})`);
      params.push(`%${contentName}%`);
    }

    if (courseName) {
      conditions.push(`EXISTS (SELECT 1 FROM courses c WHERE c.name LIKE $${params.length + 1})`);
      params.push(`%${courseName}%`);
    }

    if (moduleName) {
      conditions.push(`EXISTS (SELECT 1 FROM modules m WHERE m.name LIKE $${params.length + 1})`);
      params.push(`%${moduleName}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' OR ')}`;
    }

    query += ` ORDER BY t.name ASC`;

    const tags = await coursesDB.query<Tag>(query as any, ...params);
    const result: Tag[] = [];
    for await (const tag of tags) {
      result.push(tag);
    }
    return result;
  }

  // Get all categories
  async getAllCategories(): Promise<Category[]> {
    const categories = await coursesDB.query<Category>`
      SELECT * FROM categories
      ORDER BY name ASC
    `;

    const result: Category[] = [];
    for await (const category of categories) {
      result.push(category);
    }
    return result;
  }

  // Validate content type
  private validateContentType(type: string): ContentType {
    if (!Object.values(ContentType).includes(type as ContentType)) {
      throw new APIError(ErrCode.InvalidArgument, `Invalid content type: ${type}. Must be one of: ${Object.values(ContentType).join(', ')}`);
    }
    return type as ContentType;
  }

  // Insert or get tag
  async insertOrGetTag(name: string): Promise<number> {
    // Try to get existing tag
    const existingTag = await coursesDB.queryRow<Tag>`
      SELECT * FROM tags WHERE name = ${name}
    `;

    if (existingTag) {
      return existingTag.id;
    }

    // Insert new tag
    const result = await coursesDB.queryRow<{ id: number }>`
      INSERT INTO tags (name) VALUES (${name})
      RETURNING id
    `;

    if (!result) {
      throw new APIError(ErrCode.Internal, "Failed to insert tag");
    }

    return result.id;
  }

  // Insert or get category
  async insertOrGetCategory(name: string): Promise<number> {
    // Try to get existing category
    const existingCategory = await coursesDB.queryRow<Category>`
      SELECT * FROM categories WHERE name = ${name}
    `;

    if (existingCategory) {
      return existingCategory.id;
    }

    // Insert new category
    const result = await coursesDB.queryRow<{ id: number }>`
      INSERT INTO categories (name) VALUES (${name})
      RETURNING id
    `;

    if (!result) {
      throw new APIError(ErrCode.Internal, "Failed to insert category");
    }

    return result.id;
  }

  // Create course with all related data
  async createCourse(
    name: string,
    description: string,
    creatorId: number,
    categoryId: number,
    tags: string[],
    isPaid: boolean,
    isActive: boolean,
    price: number,
    certificateUrl: string,
    thumbnailUrl?: string,
    contents?: any[]
  ): Promise<number> {
    // Start transaction
    await coursesDB.exec`BEGIN`;

    try {
      // Insert course
      const courseResult = await coursesDB.queryRow<{ id: number }>`
        INSERT INTO courses (
          name, description, is_paid, is_active, price,
          thumbnail_url, certificate_url, created_at, updated_at
        ) VALUES (
          ${name}, ${description}, ${isPaid}, ${isActive}, ${price},
          ${thumbnailUrl}, ${certificateUrl}, NOW(), NOW()
        )
        RETURNING id
      `;

      if (!courseResult) {
        throw new APIError(ErrCode.Internal, "Failed to create course");
      }

      const courseId = courseResult.id;

      // Insert course_creators relationship
      await coursesDB.exec`
        INSERT INTO course_creators (creator_id, course_id, is_active, created_at, updated_at)
        VALUES (${creatorId}, ${courseId}, ${isActive}, NOW(), NOW())
      `;

      // Insert course_categories relationship
      await coursesDB.exec`
        INSERT INTO course_categories (course_id, category_id)
        VALUES (${courseId}, ${categoryId})
      `;

      // Insert tags
      for (const tagName of tags) {
        const tagId = await this.insertOrGetTag(tagName);
        await coursesDB.exec`
          INSERT INTO course_tags (course_id, tag_id)
          VALUES (${courseId}, ${tagId})
        `;
      }

      // Insert contents if provided (with automatic module creation)
      if (contents && contents.length > 0) {
        // Group contents by module_name to create modules
        const moduleGroups = new Map<string, any[]>();

        for (const contentData of contents) {
          const moduleName = contentData.module_name || 'default';
          if (!moduleGroups.has(moduleName)) {
            moduleGroups.set(moduleName, []);
          }
          moduleGroups.get(moduleName)!.push(contentData);
        }

        // Create modules and insert contents
        for (const [moduleName, moduleContents] of moduleGroups) {
          let moduleId: number | null = null;

          // Only create module if module_name is provided (not 'default')
          if (moduleName !== 'default') {
            const moduleResult = await coursesDB.queryRow<{ id: number }>`
              INSERT INTO modules (
                name, description, position, is_paid, is_active,
                created_at, updated_at
              ) VALUES (
                ${moduleName}, ${moduleName}, 0, ${isPaid}, ${isActive}, NOW(), NOW()
              )
              RETURNING id
            `;

            if (!moduleResult) {
              throw new APIError(ErrCode.Internal, "Failed to create module");
            }
            moduleId = moduleResult.id;
          }

          // Insert contents for this module
          for (const contentData of moduleContents) {
            const contentType = this.validateContentType(contentData.type);

            await coursesDB.exec`
              INSERT INTO contents (
                module_id, course_id, type, position, is_paid, is_active,
                url, duration, thumbnail_url, category_id, next_content_id,
                created_at, updated_at
              ) VALUES (
                ${moduleId}, ${courseId}, ${contentType}, ${contentData.position},
                ${contentData.is_paid}, ${contentData.is_active}, ${contentData.url},
                ${contentData.duration}, ${contentData.thumbnail_url}, ${contentData.category_id},
                ${contentData.next_content_id}, NOW(), NOW()
              )
            `;
          }
        }
      }

      await coursesDB.exec`COMMIT`;
      return courseId;
    } catch (error) {
      await coursesDB.exec`ROLLBACK`;
      throw error;
    }
  }

  // Update course with all related data
  async updateCourse(
    id: number,
    name: string,
    description: string,
    creatorId: number,
    categoryId: number,
    tags: string[],
    isPaid: boolean,
    isActive: boolean,
    price: number,
    certificateUrl: string,
    thumbnailUrl?: string,
    contents?: any[]
  ): Promise<void> {
    // Start transaction
    await coursesDB.exec`BEGIN`;

    try {
      // Update course
      await coursesDB.exec`
        UPDATE courses SET
          name = ${name},
          description = ${description},
          is_paid = ${isPaid},
          is_active = ${isActive},
          price = ${price},
          thumbnail_url = ${thumbnailUrl},
          certificate_url = ${certificateUrl},
          updated_at = NOW()
        WHERE id = ${id}
      `;

      // Update course_creators relationship
      await coursesDB.exec`
        UPDATE course_creators SET
          creator_id = ${creatorId},
          is_active = ${isActive},
          updated_at = NOW()
        WHERE course_id = ${id}
      `;

      // Delete existing course_categories and course_tags
      await coursesDB.exec`DELETE FROM course_categories WHERE course_id = ${id}`;
      await coursesDB.exec`DELETE FROM course_tags WHERE course_id = ${id}`;

      // Insert new course_categories relationship
      await coursesDB.exec`
        INSERT INTO course_categories (course_id, category_id)
        VALUES (${id}, ${categoryId})
      `;

      // Insert new tags
      for (const tagName of tags) {
        const tagId = await this.insertOrGetTag(tagName);
        await coursesDB.exec`
          INSERT INTO course_tags (course_id, tag_id)
          VALUES (${id}, ${tagId})
        `;
      }

      // Handle contents update
      if (contents) {
        // Delete existing modules and contents for this course
        await coursesDB.exec`DELETE FROM contents WHERE course_id = ${id}`;
        await coursesDB.exec`DELETE FROM modules WHERE id IN (SELECT module_id FROM contents WHERE course_id = ${id})`;

        // Group contents by module_name to create modules
        const moduleGroups = new Map<string, any[]>();

        for (const contentData of contents) {
          const moduleName = contentData.module_name || 'default';
          if (!moduleGroups.has(moduleName)) {
            moduleGroups.set(moduleName, []);
          }
          moduleGroups.get(moduleName)!.push(contentData);
        }

        // Create modules and insert contents
        for (const [moduleName, moduleContents] of moduleGroups) {
          let moduleId: number | null = null;

          // Only create module if module_name is provided (not 'default')
          if (moduleName !== 'default') {
            const moduleResult = await coursesDB.queryRow<{ id: number }>`
              INSERT INTO modules (
                name, description, position, is_paid, is_active,
                created_at, updated_at
              ) VALUES (
                ${moduleName}, ${moduleName}, 0, ${isPaid}, ${isActive}, NOW(), NOW()
              )
              RETURNING id
            `;

            if (!moduleResult) {
              throw new APIError(ErrCode.Internal, "Failed to create module");
            }
            moduleId = moduleResult.id;
          }

          // Insert contents for this module
          for (const contentData of moduleContents) {
            const contentType = this.validateContentType(contentData.type);

            await coursesDB.exec`
              INSERT INTO contents (
                module_id, course_id, type, position, is_paid, is_active,
                url, duration, thumbnail_url, category_id, next_content_id,
                created_at, updated_at
              ) VALUES (
                ${moduleId}, ${id}, ${contentType}, ${contentData.position},
                ${contentData.is_paid}, ${contentData.is_active}, ${contentData.url},
                ${contentData.duration}, ${contentData.thumbnail_url}, ${contentData.category_id},
                ${contentData.next_content_id}, NOW(), NOW()
              )
            `;
          }
        }
      }

      await coursesDB.exec`COMMIT`;
    } catch (error) {
      await coursesDB.exec`ROLLBACK`;
      throw error;
    }
  }

  // Get course by ID
  async getCourseById(id: number): Promise<Course | null> {
    return await coursesDB.queryRow<Course>`
      SELECT * FROM courses WHERE id = ${id}
    `;
  }

  // Update course vector
  async updateCourseVector(courseId: number, nameVector: string, descriptionVector: string): Promise<void> {
    await coursesDB.exec`
      INSERT INTO course_vector (course_id, name, description)
      VALUES (${courseId}, ${nameVector}, ${descriptionVector})
      ON CONFLICT (course_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description
    `;
  }

  // Get courses by category_id
  async getCoursesByCategoryId(categoryId: number): Promise<Course[]> {
    const courses = await coursesDB.query<Course>`
      SELECT * FROM courses WHERE category_id = ${categoryId}
    `;

    const result: Course[] = [];
    for await (const course of courses) {
      result.push(course);
    }
    return result;
  }

  // Get currently enrolled courses
  async getCurrentlyEnrolledCourses(userId: number): Promise<Course[]> {
    const courses = await coursesDB.query<Course>`
      SELECT id, name, description, is_paid, price, thumbnail_url, certificate_url, avg_rating, num_ratings, created_at, updated_at FROM courses WHERE id IN (SELECT course_id FROM user_enrollments WHERE user_id = ${userId})
    `;

    const result: Course[] = [];
    for await (const course of courses) {
      result.push(course);
    }
    return result;
  }

  // Publish course by updating published_at column
  async publishCourse(courseId: number, publishedAt?: Date): Promise<void> {
    const publishTime = publishedAt || new Date();

    const result = await coursesDB.queryRow<{ id: number }>`
      UPDATE courses
      SET published_at = ${publishTime}, updated_at = NOW()
      WHERE id = ${courseId}
      RETURNING id
    `;

    if (!result) {
      throw new APIError(ErrCode.NotFound, "Course not found");
    }
  }

  // Unpublish course by setting published_at to null
  async unpublishCourse(courseId: number): Promise<void> {
    const result = await coursesDB.queryRow<{ id: number }>`
      UPDATE courses
      SET published_at = NULL, updated_at = NOW()
      WHERE id = ${courseId}
      RETURNING id
    `;

    if (!result) {
      throw new APIError(ErrCode.NotFound, "Course not found");
    }
  }
}
