import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z, Document } from 'genkit';
import { toSql } from 'pgvector';
import { db } from '../infra/db';
import { CoursesRepository } from '../repository/courses.repository';
import { xAI } from '@genkit-ai/compat-oai/xai';



// // Simple validation function for embeddings
// async function validateEmbedding(embedding: number[]) {
//   if (!embedding || embedding.length !== 1536) {
//     throw new Error(`Invalid embedding: expected 1536 dimensions, got ${embedding?.length || 0}`);
//   }
// }

// Initialize Genkit with the Google AI plugin
// const ai = genkit({
//   plugins: [googleAI()],
//   model: googleAI.model('gemini-2.5-flash', {
//     temperature: 0.8,
//   }),
// });
export const ai = genkit({
    plugins: [xAI({ apiKey: process.env.XAI_API_KEY })],
    model: xAI.model('grok-4-fast-non-reasoning', {
    temperature: 0.8,
  }),
});


// Define schemas for LLM input/output
const CourseSearchInputSchema = z.object({
  query: z.string().describe('Search query for courses'),
  categoryId: z.bigint().optional().describe('Filter by category ID'),
  limit: z.number().default(10).describe('Maximum number of results to return'),
});

const CourseSearchResultSchema = z.object({
  courses: z.array(z.object({
    id: z.bigint(),
    name: z.string(),
    description: z.string(),
    price: z.number(),
    thumbnail_url: z.string().nullable(),
    priority: z.number(),
    rank: z.number(),
    is_paid: z.boolean(),
    is_active: z.boolean().nullable(),
  })),
  total: z.number(),
});

const ContentSearchInputSchema = z.object({
  query: z.string().describe('Search query for content'),
  courseId: z.bigint().optional().describe('Filter by course ID'),
  moduleId: z.bigint().optional().describe('Filter by module ID'),
  contentType: z.string().optional().describe('Filter by content type'),
  limit: z.number().default(10).describe('Maximum number of results to return'),
});

const ContentSearchResultSchema = z.object({
  contents: z.array(z.object({
    id: z.bigint(),
    name: z.string(),
    content_type: z.string(),
    url: z.string().nullable(),
    duration: z.number().nullable(),
    thumbnail_url: z.string().nullable(),
    position: z.number(),
    is_paid: z.boolean(),
    is_active: z.boolean(),
  })),
  total: z.number(),
});

const VectorSearchInputSchema = z.object({
  query: z.string().describe('Text query to search for similar content'),
  source: z.enum(['contents', 'courses']).describe('Source type to search in'),
  limit: z.number().default(5).describe('Maximum number of results to return'),
});

const VectorSearchResultSchema = z.object({
  results: z.array(z.object({
    id: z.bigint(),
    string: z.string(),
    source: z.enum(['contents', 'courses']),
    source_id: z.bigint(),
  })),
  total: z.number(),
});

// User Profile Schema for learning context
const UserProfileSchema = z.object({
  currentRole: z.string().optional().describe('User\'s current job role or profession'),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('Experience level'),
  learningGoals: z.array(z.string()).optional().describe('What they want to learn'),
  interests: z.array(z.string()).optional().describe('Areas of interest'),
  timeCommitment: z.string().optional().describe('How much time they can commit to learning'),
  preferredLearningStyle: z.string().optional().describe('How they prefer to learn'),
  currentSkills: z.array(z.string()).optional().describe('Skills they already have'),
  challenges: z.array(z.string()).optional().describe('Current challenges they face'),
  persona: z.enum(['student', 'jobbie', 'dylan', 'content_creator']).optional().describe('User persona type'),
  tier: z.enum(['tier1', 'tier2', 'tier3']).optional().describe('User tier classification'),
});

// Chat Response Schema
const ChatResponseSchema = z.object({
  messages: z.array(z.string()).describe('Array of AI response messages to display with typing animation'),
  type: z.string().optional().describe('Response type'),
  userProfile: UserProfileSchema.optional().describe('Updated user profile'),
  nextQuestions: z.array(z.object({
    text: z.string().describe('What the user wants to say next - their intention/desire (e.g., "Main apna rasta khud banana chahta hun")'),
    metadata: z.string().describe('User\'s message in their dialect and persona - what they would actually type (e.g., "Main HTML seekhna chahta hun, please guide karo")')
  })).optional().describe('User intentions and their actual messages in their dialect'),
  learningPath: z.object({
    suggested: z.boolean().describe('Whether to suggest a learning path'),
    courses: z.array(z.object({
      id: z.string(),
      name: z.string(),
      reason: z.string(),
    })).optional().describe('Suggested courses'),
  }).describe('Learning path suggestions'),
});

// Database tools for LLM - Simple text search with ILIKE
const courseSearchTool = ai.defineTool(
  {
    name: 'searchCourses',
    description: 'Search for courses by name, description, or category using text search',
    inputSchema: CourseSearchInputSchema,
    outputSchema: CourseSearchResultSchema,
  },
  async (input: any) => {
    try {
      let query = `
        SELECT c.*
        FROM courses c
        LEFT JOIN course_categories cc ON c.id = cc.course_id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramCount = 1;

      if (input.query && input.query.trim() !== '') {
        query += ` AND (c.name ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`;
        params.push(`%${input.query}%`);
        paramCount++;
      }

      if (input.categoryId) {
        query += ` AND cc.category_id = $${paramCount}`;
        params.push(input.categoryId);
        paramCount++;
      }

      query += ` ORDER BY c.priority DESC, c.rank DESC LIMIT $${paramCount}`;
      params.push(input.limit);

      const result = await db.query(query, params);
      const results = result.rows;
      
      return {
        courses: results.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          price: row.price,
          thumbnail_url: row.thumbnail_url,
          priority: row.priority,
          rank: row.rank,
          is_paid: row.is_paid,
          is_active: row.is_active,
        })),
        total: results.length,
      };
    } catch (error) {
      console.error('Error searching courses:', error);
      return { courses: [], total: 0 };
    }
  }
);

// pgvector Retriever for Content Search
const contentRetriever = ai.defineRetriever(
  {
    name: 'pgvector-contents',
    configSchema: z.object({
      courseId: z.bigint().optional(),
      moduleId: z.bigint().optional(),
      contentType: z.string().optional(),
      limit: z.number().default(10),
    }),
  },
  async (query: any, options: any) => {
    try {
      // Generate embedding using Google AI
      const embeddingResult = await ai.embed({
        embedder: googleAI.embedder('text-embedding-004'),
        content: query,
      });
      
      if (!embeddingResult || !embeddingResult[0] || !embeddingResult[0].embedding) {
        throw new Error('Failed to generate embedding');
      }
      
      const embedding = embeddingResult[0].embedding;

      // Build the vector similarity query
      let sqlQuery = `
        SELECT c.*, 1 - (v.vector <=> $1::vector) as similarity
        FROM contents c
        JOIN vectors v ON c.id = v.source_id
        WHERE v.source = 'contents'
        AND 1 - (v.vector <=> $1::vector) > 0.7
      `;
      
      const params: any[] = [toSql(embedding)];
      let paramCount = 2;

      if (options.courseId) {
        sqlQuery += ` AND c.course_id = $${paramCount}`;
        params.push(options.courseId);
        paramCount++;
      }

      if (options.moduleId) {
        sqlQuery += ` AND c.module_id = $${paramCount}`;
        params.push(options.moduleId);
        paramCount++;
      }

      if (options.contentType) {
        sqlQuery += ` AND c.content_type ILIKE $${paramCount}`;
        params.push(`%${options.contentType}%`);
        paramCount++;
      }

      sqlQuery += ` ORDER BY similarity DESC LIMIT $${paramCount}`;
      params.push(options.limit);

      const result = await db.query(sqlQuery, params);
      const results = result.rows;
      
      return {
        documents: results.map((row) => {
          const { similarity, ...contentData } = row;
          return Document.fromText(
            `${contentData.name} - ${contentData.content_type}`,
            {
              ...contentData,
              similarity: parseFloat(similarity),
            }
          );
        }),
      };
    } catch (error) {
      console.error('Error in content retriever:', error);
      return { documents: [] };
    }
  }
);

// Course Retriever
const courseRetriever = ai.defineRetriever(
  {
    name: 'pgvector-courses',
    configSchema: z.object({
      categoryId: z.bigint().optional(),
      limit: z.number().default(10),
    }),
  },
  async (query: any, options: any) => {
    try {
      const embeddingResult = await ai.embed({
        embedder: googleAI.embedder('text-embedding-004'),
        content: query,
      });
      
      if (!embeddingResult || !embeddingResult[0] || !embeddingResult[0].embedding) {
        throw new Error('Failed to generate embedding');
      }
      
      const embedding = embeddingResult[0].embedding;

      let sqlQuery = `
        SELECT c.*, 1 - (v.vector <=> $1::vector) as similarity
        FROM courses c
        JOIN vectors v ON c.id = v.source_id
        WHERE v.source = 'courses'
        AND 1 - (v.vector <=> $1::vector) > 0.3
      `;
      
      const params: any[] = [toSql(embedding)];
      let paramCount = 2;

      if (options.categoryId) {
        sqlQuery += ` AND EXISTS (
          SELECT 1 FROM course_categories cc 
          WHERE cc.course_id = c.id AND cc.category_id = $${paramCount}
        )`;
        params.push(options.categoryId);
        paramCount++;
      }

      sqlQuery += ` ORDER BY similarity DESC LIMIT $${paramCount}`;
      params.push(options.limit);

      console.log('Course retriever SQL query:', sqlQuery);
      // console.log('Course retriever params:', params);
      
      const result = await db.query(sqlQuery, params);
      const results = result.rows;
      console.log(`Course retriever found ${results.length} results`);
      
      return {
        documents: results.map((row) => {
          const { similarity, ...courseData } = row;
          console.log(`Course: ${courseData.name}, Similarity: ${similarity}`);
          return Document.fromText(
            `${courseData.name} - ${courseData.description}`,
            {
              ...courseData,
              similarity: parseFloat(similarity),
            }
          );
        }),
      };
    } catch (error) {
      console.error('Error in course retriever:', error);
      return { documents: [] };
    }
  }
);

const contentSearchTool = ai.defineTool(
  {
    name: 'searchContent',
    description: 'Search for content using semantic embeddings and text search',
    inputSchema: ContentSearchInputSchema,
    outputSchema: ContentSearchResultSchema,
  },
  async (input: any) => {
    try {
      let results: any[] = [];
      
      if (input.query && input.query.trim() !== '') {
        // Use the pgvector retriever
        const retrievedDocs = await ai.retrieve({
          retriever: contentRetriever,
          query: input.query,
          options: {
            courseId: input.courseId,
            moduleId: input.moduleId,
            contentType: input.contentType,
            limit: input.limit,
          },
        });
        
        results = retrievedDocs.map((doc: any) => ({
          id: BigInt(doc.metadata.id),
          name: doc.metadata.name,
          content_type: doc.metadata.content_type,
          url: doc.metadata.url,
          duration: doc.metadata.duration,
          thumbnail_url: doc.metadata.thumbnail_url,
          position: doc.metadata.position,
          is_paid: doc.metadata.is_paid,
          is_active: doc.metadata.is_active,
        }));
      } else {
        // Fallback to text search when no query provided
        let query = `SELECT c.* FROM contents c WHERE 1=1`;
        const params: any[] = [];
        let paramCount = 1;

        if (input.courseId) {
          query += ` AND c.course_id = $${paramCount}`;
          params.push(input.courseId);
          paramCount++;
        }

        if (input.moduleId) {
          query += ` AND c.module_id = $${paramCount}`;
          params.push(input.moduleId);
          paramCount++;
        }

        if (input.contentType) {
          query += ` AND c.content_type ILIKE $${paramCount}`;
          params.push(`%${input.contentType}%`);
          paramCount++;
        }

        query += ` ORDER BY c.position ASC LIMIT $${paramCount}`;
        params.push(input.limit);

        const result = await db.query(query, params);
        results = result.rows.map((row: any) => ({
          id: BigInt(row.id),
          name: row.name,
          content_type: row.content_type,
          url: row.url,
          duration: row.duration,
          thumbnail_url: row.thumbnail_url,
          position: row.position,
          is_paid: row.is_paid,
          is_active: row.is_active,
        }));
      }
      
      return {
        contents: results,
        total: results.length,
      };
    } catch (error) {
      console.error('Error searching content:', error);
      return { contents: [], total: 0 };
    }
  }
);

const vectorSearchTool = ai.defineTool(
  {
    name: 'vectorSearch',
    description: 'Search for similar content using vector embeddings with pgvector',
    inputSchema: VectorSearchInputSchema,
    outputSchema: VectorSearchResultSchema,
  },
  async (input: any) => {
    try {
      // For now, we'll do text search in vector strings
      // In production, you would generate embeddings for the query and use vector similarity
      const query = `
        SELECT v.*
        FROM vectors v
        WHERE v.source = $1
        AND v.string ILIKE $2
        ORDER BY v.created_at DESC
        LIMIT $3
      `;
      
      const result = await db.query(query, [
        input.source,
        `%${input.query}%`,
        input.limit
      ]);
      const results = result.rows;
      
      return {
        results: results.map(row => ({
          id: row.id,
          string: row.string,
          source: row.source,
          source_id: row.source_id,
        })),
        total: results.length,
      };
    } catch (error) {
      console.error('Error in vector search:', error);
      return { results: [], total: 0 };
    }
  }
);

// Advanced vector similarity search tool
const vectorSimilarityTool = ai.defineTool(
  {
    name: 'vectorSimilaritySearch',
    description: 'Search for similar content using vector cosine similarity',
    inputSchema: z.object({
      queryVector: z.array(z.number()).length(1536).describe('1536-dimensional query vector'),
      source: z.enum(['contents', 'courses']).describe('Source type to search in'),
      threshold: z.number().default(0.7).describe('Similarity threshold (0-1)'),
      limit: z.number().default(5).describe('Maximum number of results to return'),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        id: z.bigint(),
        string: z.string(),
        source: z.enum(['contents', 'courses']),
        source_id: z.bigint(),
        similarity: z.number(),
      })),
      total: z.number(),
    }),
  },
  async (input: any) => {
    try {
      const query = `
        SELECT v.*, 
               1 - (v.vector <=> $1::vector) as similarity
        FROM vectors v
        WHERE v.source = $2
        AND 1 - (v.vector <=> $1::vector) > $3
        ORDER BY similarity DESC
        LIMIT $4
      `;
      
      const result = await db.query(query, [
        JSON.stringify(input.queryVector),
        input.source,
        input.threshold,
        input.limit
      ]);
      const results = result.rows;
      
      return {
        results: results.map(row => ({
          id: row.id,
          string: row.string,
          source: row.source,
          source_id: row.source_id,
          similarity: parseFloat(row.similarity),
        })),
        total: results.length,
      };
    } catch (error) {
      console.error('Error in vector similarity search:', error);
      return { results: [], total: 0 };
    }
  }
);

const getCategoriesTool = ai.defineTool(
  {
    name: 'getCategories',
    description: 'Get all available categories',
    inputSchema: z.object({}),
    outputSchema: z.object({
      categories: z.array(z.object({
        id: z.string(),
        name: z.string(),
        image_url: z.string(),
        priority: z.number(),
      })),
    }),
  },
  async () => {
    try {
      const coursesRepo = new CoursesRepository();
      const results = await coursesRepo.getCategories();
      return {
        categories: results.map(cat => ({
          id: String(cat.id),
          name: cat.name,
          image_url: cat.image_url || '',
          priority: (cat as any).priority || 0,
        })),
      };
    } catch (error) {
      console.error('Error getting categories:', error);
      return { categories: [] };
    }
  }
);

const getCourseDetailsTool = ai.defineTool(
  {
    name: 'getCourseDetails',
    description: 'Get detailed information about a specific course including modules and content',
    inputSchema: z.object({
      courseId: z.bigint().describe('ID of the course to get details for'),
    }),
    outputSchema: z.object({
      course: z.object({
        id: z.bigint(),
        name: z.string(),
        description: z.string(),
        price: z.number(),
        thumbnail_url: z.string().nullable(),
        priority: z.number(),
        rank: z.number(),
        is_paid: z.boolean(),
        is_active: z.boolean().nullable(),
      }).nullable(),
      modules: z.array(z.object({
        id: z.bigint(),
        name: z.string(),
        description: z.string(),
        position: z.number(),
        thumbnail_url: z.string().nullable(),
      })),
      contents: z.array(z.object({
        id: z.bigint(),
        name: z.string(),
        content_type: z.string(),
        position: z.number(),
        duration: z.number().nullable(),
        url: z.string().nullable(),
      })),
    }),
  },
  async (input: any) => {
    try {
      const coursesRepo = new CoursesRepository();
      const course = await coursesRepo.getCourseById(Number(input.courseId));
      const courseModules = await coursesRepo.getModulesByCourseId(Number(input.courseId));
      const courseContents = await coursesRepo.getContentsByCourseId(Number(input.courseId));

      return {
        course: course ? {
          id: BigInt(course.id),
          name: course.name,
          description: course.description,
          price: course.price,
          thumbnail_url: course.thumbnail_url || null,
          priority: (course as any).priority || 0,
          rank: (course as any).rank || 0,
          is_paid: (course as any).is_paid,
          is_active: (course as any).is_active,
        } : null,
        modules: courseModules.map(mod => ({
          id: BigInt(mod.id),
          name: mod.name,
          description: mod.description,
          position: mod.position,
          thumbnail_url: mod.thumbnail_url || null,
        })),
        contents: courseContents.map(content => ({
          id: BigInt(content.id),
          name: content.name,
          content_type: content.type,
          position: content.position,
          duration: content.duration || null,
          url: content.url || null,
        })),
      };
    } catch (error) {
      console.error('Error getting course details:', error);
      return {
        course: null,
        modules: [],
        contents: [],
      };
    }
  }
);

// Function to generate embeddings for all courses
async function generateCourseEmbeddings() {
  try {
    console.log('Generating embeddings for all courses...');
    
    // Get all courses from database
    const result = await db.query('SELECT * FROM courses WHERE is_active = true');
    const courses = result.rows;
    console.log(`Found ${courses.length} active courses`);
    
    for (const course of courses) {
      // Generate embedding for course name + description
      const courseText = `${course.name} - ${course.description}`;
      const embeddingResult = await ai.embed({
        embedder: googleAI.embedder('text-embedding-004'),
        content: courseText,
      });
      
      if (!embeddingResult || !embeddingResult[0] || !embeddingResult[0].embedding) {
        console.error(`Failed to generate embedding for course ${course.id}: ${course.name}`);
        continue;
      }
      
      const embedding = embeddingResult[0].embedding;
      
      // Use UPSERT to insert or update embedding
      await db.query(
        `INSERT INTO vectors (string, vector, source, source_id, updated_at) 
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (source, source_id) 
         DO UPDATE SET 
           string = EXCLUDED.string,
           vector = EXCLUDED.vector,
           updated_at = NOW()`,
        [courseText, toSql(embedding), 'courses', course.id]
      );
      
      console.log(`Generated/updated embedding for course ${course.id}: ${course.name}`);
    }
    
    console.log('Finished generating course embeddings');
  } catch (error) {
    console.error('Error generating course embeddings:', error);
  }
}

// Course Recommendation Flow
export const courseRecommendationFlow = ai.defineFlow(
  {
    name: 'courseRecommendationFlow',
    inputSchema: z.object({
      userQuery: z.string().describe('User query for course recommendations'),
      categoryId: z.bigint().optional().describe('Optional category filter'),
    }),
    outputSchema: z.object({
      recommendations: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        price: z.string(),
        thumbnail_url: z.string().nullable(),
        priority: z.number(),
        rank: z.number(),
        reason: z.string(),
        similarity: z.number(),
      })),
      categories: z.array(z.object({
        id: z.string(),
        name: z.string(),
        image_url: z.string(),
      })),
    }),
  },
  async (input: any) => {
    // Generate embeddings for courses if they don't exist
    // await generateCourseEmbeddings();
    
    // Get all categories first
    const categoriesResult = await getCategoriesTool({});
    
    // Use semantic search with embeddings for better course recommendations
    console.log(`Searching for courses with query: "${input.userQuery}"`);
    const retrievedDocs = await ai.retrieve({
      retriever: courseRetriever,
      query: input.userQuery,
      options: {
        categoryId: input.categoryId,
        limit: 2, // Maximum 2 courses as requested
      },
    });
    
    console.log(`Retrieved ${retrievedDocs.length} documents`);

    // Generate reasons for each recommendation using AI
    const recommendations = await Promise.all(
      retrievedDocs.map(async (doc: any) => {
        const courseData = doc.metadata;
        if (!courseData) {
          throw new Error('Course data is missing from document metadata');
        }
        
        const { output } = await ai.generate({
          prompt: `Explain why this course "${courseData.name}" would be a good recommendation for someone searching for "${input.userQuery}". Keep it brief and specific.`,
          output: { schema: z.object({ reason: z.string() }) },
        });

        return {
          id: courseData.id,
          name: courseData.name,
          description: courseData.description,
          price: String(courseData.price),
          thumbnail_url: courseData.thumbnail_url,
          priority: courseData.priority,
          rank: courseData.rank,
          reason: output?.reason || 'This course matches your search criteria.',
          similarity: courseData.similarity,
        };
      })
    );

    // Get category IDs for the recommended courses
    const recommendedCourseIds = recommendations.map((rec: any) => rec.id);
    const courseCategoryRelations = await Promise.all(
      recommendedCourseIds.map((courseId: any) => 
        db.query(
          'SELECT category_id FROM course_categories WHERE course_id = $1',
          [courseId]
        ).then(result => result.rows)
      )
    );
    
    // Flatten and get unique category IDs
    const categoryIds = [...new Set(
      courseCategoryRelations.flat().map((rel: any) => rel.category_id)
    )];
    
    // Filter categories to only include those associated with recommendations
    const relevantCategories = categoriesResult.categories.filter((cat: any) => 
      categoryIds.includes(cat.id)
    );

    return {
      recommendations,
      categories: relevantCategories,
    };
  }
);

// Content Discovery Flow
export const contentDiscoveryFlow = ai.defineFlow(
  {
    name: 'contentDiscoveryFlow',
    inputSchema: z.object({
      courseId: z.bigint().describe('Course ID to explore content for'),
      contentType: z.string().optional().describe('Filter by content type (video, text, quiz, etc.)'),
    }),
    outputSchema: z.object({
      course: z.object({
        id: z.bigint(),
        name: z.string(),
        description: z.string(),
        price: z.number(),
        thumbnail_url: z.string().nullable(),
      }).nullable(),
      modules: z.array(z.object({
        id: z.bigint(),
        name: z.string(),
        description: z.string(),
        position: z.number(),
        contentCount: z.number(),
      })),
      contents: z.array(z.object({
        id: z.bigint(),
        name: z.string(),
        content_type: z.string(),
        position: z.number(),
        duration: z.number().nullable(),
        url: z.string().nullable(),
      })),
    }),
  },
  async (input: any) => {
    // Get course details
    const courseDetails = await getCourseDetailsTool({
      courseId: input.courseId,
    });

    // Search for content if content type is specified
    let contents = courseDetails.contents;
    if (input.contentType) {
      const contentSearchResult = await contentSearchTool({
        query: '',
        courseId: input.courseId,
        contentType: input.contentType,
        limit: 50,
      });
      contents = contentSearchResult.contents;
    }

    // Count content per module
    const modulesWithCount = courseDetails.modules.map((module: any) => ({
      ...module,
      contentCount: contents.filter((content: any) => 
        // This would need to be implemented based on your module-content relationship
        true // Placeholder
      ).length,
    }));

    return {
      course: courseDetails.course,
      modules: modulesWithCount,
      contents,
    };
  }
);

// Text-based Similar Content Flow
export const similarContentFlow = ai.defineFlow(
  {
    name: 'similarContentFlow',
    inputSchema: z.object({
      query: z.string().describe('Text query to find similar content'),
      source: z.enum(['contents', 'courses']).describe('Source type to search in'),
    }),
    outputSchema: z.object({
      similarItems: z.array(z.object({
        id: z.bigint(),
        string: z.string(),
        source: z.enum(['contents', 'courses']),
        source_id: z.bigint(),
        explanation: z.string(),
      })),
    }),
  },
  async (input: any) => {
    // Search using text similarity
    const vectorSearchResult = await vectorSearchTool({
      query: input.query,
      source: input.source,
      limit: 5,
    });

    // Generate explanations for each similar item
    const similarItems = await Promise.all(
      vectorSearchResult.results.map(async (item: any) => {
        const { output } = await ai.generate({
          prompt: `Explain why this ${item.source.slice(0, -1)} is similar to the query "${input.query}".`,
          output: { schema: z.object({ explanation: z.string() }) },
        });

        return {
          ...item,
          explanation: output?.explanation || 'This item is similar to your query.',
        };
      })
    );

    return {
      similarItems,
    };
  }
);

// Export tools for use in other flows
export const dbTools = {
  courseSearchTool,
  contentSearchTool,
  vectorSearchTool,
  vectorSimilarityTool,
  getCategoriesTool,
  getCourseDetailsTool,
};

// Vector Reindexing Flow
export const vectorReindexFlow = ai.defineFlow(
  {
    name: 'vectorReindexFlow',
    inputSchema: z.object({
      source: z.enum(['contents', 'courses', 'all']).default('all').describe('Source type to reindex'),
      batchSize: z.number().default(10).describe('Number of items to process in each batch'),
    }),
    outputSchema: z.object({
      processed: z.number(),
      errors: z.array(z.string()),
      summary: z.string(),
    }),
  },
  async (input: any) => {
    const errors: string[] = [];
    let processed = 0;
    
    try {
      // Determine which sources to process
      const sources = input.source === 'all' ? ['contents', 'courses'] : [input.source];
      
      for (const source of sources) {
        console.log(`🔄 Starting reindexing for ${source}...`);
        
        // Get all items for this source
        const coursesRepo = new CoursesRepository();
        let items: any[] = [];
        
        if (source === 'contents') {
          const result = await db.query('SELECT * FROM contents WHERE is_active = true');
          items = result.rows;
        } else {
          const result = await coursesRepo.getAllCourses(1, 1000);
          items = result.courses;
        }
        
        console.log(`📊 Found ${items.length} ${source} items to process`);
        
        // Process in batches
        for (let i = 0; i < items.length; i += input.batchSize) {
          const batch = items.slice(i, i + input.batchSize);
          
          await Promise.all(batch.map(async (item) => {
            try {
              // Generate embedding for the item
              const textToEmbed = source === 'contents' 
                ? `${item.name} ${(item as any).content_type || ''}`.trim()
                : `${item.name} ${(item as any).description || ''}`.trim();
              
              const embeddingResult = await ai.embed({
                embedder: googleAI.embedder('text-embedding-004'),
                content: textToEmbed,
              });
              
              if (!embeddingResult || !embeddingResult[0] || !embeddingResult[0].embedding) {
                console.error(`Failed to generate embedding for ${source} ${item.id}: ${item.name}`);
                return;
              }
              
              const embedding = embeddingResult[0].embedding;
              
              if (embedding) {
                // Validate embedding dimensions
                // await validateEmbedding(embedding);
                
                // Use UPSERT to insert or update vector
                await db.query(
                  `INSERT INTO vectors (string, vector, source, source_id, created_at, updated_at) 
                   VALUES ($1, $2, $3, $4, NOW(), NOW())
                   ON CONFLICT (source, source_id) 
                   DO UPDATE SET 
                     string = EXCLUDED.string,
                     vector = EXCLUDED.vector,
                     updated_at = NOW()`,
                  [textToEmbed, toSql(embedding), source, item.id]
                );
                
                processed++;
                console.log(`✅ Processed ${source} item ${item.id}: ${item.name}`);
              } else {
                errors.push(`Failed to generate embedding for ${source} item ${item.id}`);
              }
            } catch (error) {
              const errorMsg = `Error processing ${source} item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              errors.push(errorMsg);
              console.error(errorMsg);
            }
          }));
          
          // Small delay between batches to avoid overwhelming the AI service
          if (i + input.batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        console.log(`✅ Completed reindexing for ${source}`);
      }
      
      const summary = `Successfully processed ${processed} items across ${sources.join(', ')}. ${errors.length} errors occurred.`;
      console.log(`🎉 Reindexing complete: ${summary}`);
      
      return {
        processed,
        errors,
        summary,
      };
    } catch (error) {
      const errorMsg = `Critical error during reindexing: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(errorMsg);
      
      return {
        processed,
        errors,
        summary: `Reindexing failed. Processed ${processed} items before failure.`,
      };
    }
  }
);

// User Profile Storage (in production, use a proper database)
const userProfiles = new Map<string, any>();

// Cache for persona and dialect detection
const detectionCache = new Map<string, { persona: string; dialect: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// LLM-based Persona and Dialect Detection
async function detectPersonaAndDialect(userProfile: any, message: string, userId: string): Promise<{ persona: string; dialect: string }> {
  // Check cache first
  const cacheKey = `${userId}-${message.substring(0, 50)}`;
  const cached = detectionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return { persona: cached.persona, dialect: cached.dialect };
  }

  try {
    const { output } = await ai.generate({
      prompt: `Analyze this user message and profile to detect their persona and dialect:

User Profile: ${JSON.stringify(userProfile)}
User Message: "${message}"

Detect:
1. PERSONA: Based on their role, goals, and communication style, classify them as one of:
   - student: College students, recent graduates, those preparing for placements
   - jobbie: Early professionals (0-3 years), career switchers, upskillers
   - dylan: Entrepreneurs, freelancers, hustlers, startup enthusiasts
   - content_creator: YouTubers, social media creators, influencers

2. DIALECT: Based on their language patterns, classify their regional dialect:
   - hinglish: Hindi + English mix (default)
   - telugu: Telugu words in English letters
   - tamil: Tamil words in English letters  
   - bengali: Bengali words in English letters
   - punjabi: Punjabi words in English letters
   - gujarati: Gujarati words in English letters

Return only a JSON object with persona and dialect fields.`,
      output: { schema: z.object({ 
        persona: z.enum(['student', 'jobbie', 'dylan', 'content_creator']),
        dialect: z.enum(['hinglish', 'telugu', 'tamil', 'bengali', 'punjabi', 'gujarati'])
      }) },
    });

    const result = {
      persona: output?.persona || 'student',
      dialect: output?.dialect || 'hinglish'
    };

    // Cache the result
    detectionCache.set(cacheKey, {
      ...result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error('Error in LLM-based detection:', error);
    // Fallback to defaults
    const fallback = { persona: 'student', dialect: 'hinglish' };
    detectionCache.set(cacheKey, {
      ...fallback,
      timestamp: Date.now()
    });
    return fallback;
  }
}

// System Prompt Generator based on Persona and Dialect
function getSystemPrompt(persona: string, dialect: string = 'hinglish', tier: string = 'tier2'): string {
  const dialectInstructions = {
    'hinglish': 'Use Hinglish (Hindi + English mix) naturally. Examples: "Bhai, ye course bohot helpful hai", "Dekho, main tumhe step-by-step guide deta hun", "Achha, tumhara goal kya hai?"',
    'telugu': 'Use Telugu words written in English letters mixed with English. Examples: "Bhai, ee course chaala helpful unnadi", "Choodu, nenu mee kosam step-by-step guide ista", "Bagundi, mee goal emiti?", "Kaavali", "Ledhu", "Cheyyali"',
    'tamil': 'Use Tamil words written in English letters mixed with English. Examples: "Bro, idhu course romba useful irukku", "Paaru, naan ungalukku step-by-step guide kuduppen", "Nalla irukku, ungal goal enna?", "Venum", "Illai", "Pannanum"',
    'bengali': 'Use Bengali words written in English letters mixed with English. Examples: "Bhai, ei course khub helpful achhe", "Dekho, ami tomader step-by-step guide debo", "Bhalo, tomar goal ki?", "Lagbe", "Nei", "Korte"',
    'punjabi': 'Use Punjabi words written in English letters mixed with English. Examples: "Bhai, eh course bahut helpful hai", "Dekho, main tuhanu step-by-step guide dunga", "Theek hai, tera goal ki hai?", "Chahiye", "Nahi", "Karna"',
    'gujarati': 'Use Gujarati words written in English letters mixed with English. Examples: "Bhai, aa course khub helpful che", "Joiye, hu tamne step-by-step guide aapish", "Saru che, tamaru goal su che?", "Jovu", "Nathi", "Karvu"'
  };

  const basePrompt = `You are Kadam AI Mentor - a friendly, supportive learning companion for Indian students and professionals from Tier 2/3 cities. 

IMPORTANT: ${dialectInstructions[dialect as keyof typeof dialectInstructions] || dialectInstructions['hinglish']}

RESPONSE FORMAT: Generate MAX 2 messages (mostly 1 message, sometimes 2) that will be displayed with typing animation. Each message must be MAX 12 words and feel natural and conversational.

NEXT QUESTIONS: After your messages, generate 3 contextual next steps that represent:
- TEXT FIELD: What the user wants to say next - their intention/desire (e.g., "Main apna rasta khud banana chahta hun", "Main career change karna chahta hun")
- METADATA FIELD: What the user would actually type in their dialect and persona (e.g., "Main HTML seekhna chahta hun, please guide karo")

CRITICAL UNDERSTANDING:
- TEXT = User's intention/desire (what they want to achieve)
- METADATA = User's actual message (what they would type)

STRICT RULES FOR GENERATION:
1. TEXT FIELD: Always represent user's intention/desire in first person
   - Examples: "Main apna rasta khud banana chahta hun", "Main career growth karna chahta hun", "Main skills develop karna chahta hun"
   
2. METADATA FIELD: Always write as if user is speaking directly to you in their dialect
   - Start with "Main" (or dialect equivalent: "Nenu" for Telugu, "Naan" for Tamil, "Ami" for Bengali, "Hu" for Gujarati)
   - End with "please guide karo" (or dialect equivalent)
   - Use user's detected dialect consistently throughout
   - Examples: "Main HTML seekhna chahta hun, please guide karo", "Nenu web development nerchukovali, please help cheyyandi"

COMPREHENSIVE EXAMPLES BY DIALECT:
Hinglish: 
- Text: "Main apna rasta khud banana chahta hun"
- Metadata: "Main web development seekhna chahta hun, please guide karo"

Telugu:
- Text: "Nenu naa rasta khud cheyyali"  
- Metadata: "Nenu web development nerchukovali, please help cheyyandi"

Tamil:
- Text: "Naan en rasta khud pannanum"
- Metadata: "Naan web development padikkanum, please help pannunga"

Bengali:
- Text: "Ami amar rasta khud korbo"
- Metadata: "Ami web development shikhte chai, please help koro"

Punjabi:
- Text: "Main apna rasta khud banaunga"
- Metadata: "Main web development seekhna chahta hun, please guide karo"

Gujarati:
- Text: "Hu maru rasta khud banavish"
- Metadata: "Hu web development seekhna chahta hun, please help karo"

Your personality:
- Warm, encouraging, and relatable
- Acts like a senior friend/mentor
- Uses simple, clear language (MAX 12 words per message)
- Shows understanding of Indian context
- Motivates with relatable examples
- ADAPT to the user's dialect naturally while keeping English alphabet
- Keep responses concise and impactful (MAX 2 messages total)`;

  const personaPrompts = {
    student: `
PERSONA: The Student 🎓
You are acting as a senior college buddy/mentor for students from Tier 2/3 cities.

Your approach:
- Give clear, structured learning paths
- Explain fundamentals step-by-step
- Use college life references (exams, campus, placements)
- Encourage with relatable student examples
- Focus on employable skills and internships
- Address confusion about where to start

Language style: "Bhai, college mein ye skills zaroori hai", "Dekho, main tumhe proper roadmap deta hun", "Tumhara college placement ke liye ye course perfect hai"`,

    jobbie: `
PERSONA: The Jobbie (Early Professional) 💼
You are acting as a career coach for fresh graduates and early professionals (0-3 years exp).

Your approach:
- Suggest short, high-impact learning paths
- Give interview prep tips and resume advice
- Help balance job + learning
- Address career stagnation fears
- Focus on practical skills for job growth
- Provide structured skill upgrade plans

Language style: "Bhai, job ke saath learning balance karna hai", "Dekho, interview mein ye questions aate hain", "Tumhara resume strong banane ke liye ye skills chahiye"`,

    dylan: `
PERSONA: Dylan (Explorer/Hustler) 🚀
You are acting as an explorer guide for curious, self-driven learners and hustlers.

Your approach:
- Suggest fast-track, project-based learning
- Add challenges and hackathon-style checkpoints
- Focus on quick skill acquisition
- Help with project launches and monetization
- Address distraction and isolation issues
- Provide experimental learning paths

Language style: "Bhai, fast-track mein sikho", "Dekho, ye project launch kar sakte ho", "Challenges deta hun tumhe, ready ho?", "Side hustle ke liye ye skills perfect hain"`,

    content_creator: `
PERSONA: The Content Creator 🎥
You are acting as a creative coach for aspiring YouTubers, Instagram/TikTok creators.

Your approach:
- Give content roadmaps (editing → storytelling → growth)
- Motivate with relatable creator success stories
- Focus on personal brand building
- Address audience scaling challenges
- Provide structured content strategy learning
- Help with monetization through ads/collabs

Language style: "Bhai, content creation mein ye steps follow karo", "Dekho, successful creators kaise karte hain", "Tumhara audience grow karne ke liye ye tips hain", "Brand building ke liye ye skills chahiye"`
  };

  return basePrompt + personaPrompts[persona as keyof typeof personaPrompts];
}

// Main Chat Flow with User Discovery
export const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: z.object({
      message: z.string().describe('User message'),
      type: z.string().optional().describe('Message type'),
      userId: z.string().optional().describe('User ID for profile tracking'),
    }),
    outputSchema: ChatResponseSchema,
  },
  async (input: any) => {
    try {
      const userId = input.userId || 'default-user';
      const currentProfile = userProfiles.get(userId) || {};
      
      // Analyze the user's message to extract profile information
      const profileAnalysis = await ai.generate({
        prompt: `Analyze this user message and extract any information about their learning profile: "${input.message}"
        
        Look for information about:
        - Current job role or profession
        - Experience level (beginner, intermediate, advanced)
        - Learning goals or what they want to learn
        - Areas of interest
        - Time commitment for learning
        - Preferred learning style
        - Current skills they have
        - Challenges they're facing
        
        Return a JSON object with any information you can extract. If no information is found for a field, omit it.
        
        Current profile: ${JSON.stringify(currentProfile)}`,
        output: { schema: UserProfileSchema },
      });

      // Merge new information with existing profile
      const updatedProfile = {
        ...currentProfile,
        ...profileAnalysis.output,
      };
      
      // Detect user persona and dialect using LLM
      // Detect persona and dialect using LLM
      const { persona: detectedPersona, dialect: detectedDialect } = await detectPersonaAndDialect(updatedProfile, input.message, userId).catch(() => {
        console.log('LLM detection failed, using fallback');
        return { persona: 'student', dialect: 'hinglish' };
      });
      const detectedTier = 'tier2'; // Default to tier2 for now
      
      // Update profile with detected persona, dialect, and tier
      updatedProfile.persona = detectedPersona;
      updatedProfile.dialect = detectedDialect;
      updatedProfile.tier = detectedTier;
      
      // Store updated profile
      userProfiles.set(userId, updatedProfile);

      // Get system prompt based on persona and dialect
      const systemPrompt = getSystemPrompt(detectedPersona, detectedDialect, detectedTier);

      // Determine conversation stage and generate appropriate response
      const conversationStage = determineConversationStage(updatedProfile);
      
      let response;
      let nextQuestions: Array<{ text: string; metadata: string }> = [];
      let learningPath: any = {
        suggested: false,
        courses: []
      };

      switch (conversationStage) {
        case 'greeting':
          const greetingResponse = await generateGreetingResponse(input.message, updatedProfile, systemPrompt);
          response = greetingResponse.messages;
          // Generate user-perspective metadata for each CTA
          nextQuestions = await Promise.all(greetingResponse.nextQuestions.map(async (q) => ({
            text: q.text,
            metadata: await generateUserPerspectiveMetadata(q.text, input.message, detectedPersona, detectedDialect)
          })));
          learningPath = {
            suggested: false,
            courses: []
          };
          break;

        case 'role_discovery':
          const roleResponse = await generateRoleDiscoveryResponse(input.message, updatedProfile, systemPrompt);
          response = roleResponse.messages;
          nextQuestions = roleResponse.nextQuestions;
          learningPath = {
            suggested: false,
            courses: []
          };
          break;

        case 'goals_discovery':
          const goalsResponse = await generateGoalsDiscoveryResponse(input.message, updatedProfile, systemPrompt);
          response = goalsResponse.messages;
          nextQuestions = goalsResponse.nextQuestions;
          learningPath = {
            suggested: false,
            courses: []
          };
          break;

        case 'experience_discovery':
          const experienceResponse = await generateExperienceDiscoveryResponse(input.message, updatedProfile, systemPrompt);
          response = experienceResponse.messages;
          nextQuestions = experienceResponse.nextQuestions;
          learningPath = {
            suggested: false,
            courses: []
          };
          break;

        case 'ready_for_recommendations':
          const recommendationResponse = await generateRecommendationResponse(input.message, updatedProfile, systemPrompt);
          response = recommendationResponse.messages;
          nextQuestions = recommendationResponse.nextQuestions;
          const recommendations = await getPersonalizedRecommendations(updatedProfile);
          learningPath = {
            suggested: true,
            courses: recommendations,
          };
          break;

        case 'ongoing_support':
          const ongoingResponse = await generateOngoingSupportResponse(input.message, updatedProfile, systemPrompt);
          response = ongoingResponse.messages;
          nextQuestions = ongoingResponse.nextQuestions;
          learningPath = {
            suggested: false,
            courses: []
          };
          break;

        default:
          const generalResponse = await generateGeneralResponse(input.message, updatedProfile, systemPrompt);
          response = generalResponse.messages;
          nextQuestions = generalResponse.nextQuestions;
          learningPath = {
            suggested: false,
            courses: []
          };
      }

      return {
        messages: response,
        type: input.type || 'text',
        userProfile: updatedProfile,
        nextQuestions,
        learningPath,
      };
    } catch (error) {
      console.error('Error in chat flow:', error);
      return {
        messages: ["Sorry bhai, maine error face kiya hai. Chalo fresh start karte hain - tum kya sikhna chahte ho?"],
        type: 'text',
        userProfile: {},
        nextQuestions: [
          { text: "Main apna current role share karna chahta hun", metadata: "Main apna current role share karna chahta hun" },
          { text: "Main apne learning goals define karna chahta hun", metadata: "Main apne learning goals define karna chahta hun" },
          { text: "Main samajhna chahta hun ki aap kaise help kar sakte hain", metadata: "Main samajhna chahta hun ki aap kaise help kar sakte hain" }
        ],
        learningPath: {
          suggested: false,
          courses: []
        }
      };
    }
  }
);

// Determine what stage of conversation we're in
function determineConversationStage(profile: any): string {
  const hasRole = profile.currentRole;
  const hasGoals = profile.learningGoals && profile.learningGoals.length > 0;
  const hasExperience = profile.experienceLevel;
  const hasInterests = profile.interests && profile.interests.length > 0;

  if (!hasRole && !hasGoals && !hasExperience) {
    return 'greeting';
  } else if (!hasRole) {
    return 'role_discovery';
  } else if (!hasGoals) {
    return 'goals_discovery';
  } else if (!hasExperience) {
    return 'experience_discovery';
  } else if (hasRole && hasGoals && hasExperience) {
    return 'ready_for_recommendations';
  } else {
    return 'ongoing_support';
  }
}

// Response interface for generation functions
interface ResponseWithCTAs {
  messages: string[];
  nextQuestions: Array<{
    text: string;
    metadata: string;
  }>;
}

// Generate user-perspective metadata based on CTA text and user context
async function generateUserPerspectiveMetadata(ctaText: string, userMessage: string, persona: string, dialect: string): Promise<string> {
  const { output } = await ai.generate({
    prompt: `You are generating metadata for a CTA button that a user clicked.

CTA Text: "${ctaText}"
User's Original Message: "${userMessage}"
User's Persona: ${persona}
User's Dialect: ${dialect}

Generate metadata that represents what the user would say when clicking this CTA. The metadata should:
1. Be in first person perspective (as if the user is speaking)
2. Use the user's detected dialect consistently
3. Start with "Main" (or equivalent in their dialect)
4. End with "please guide karo" (or equivalent in their dialect)
5. Be natural and conversational

Examples:
- For Hinglish: "Main web development seekhna chahta hun, please guide karo"
- For Telugu: "Nenu web development nerchukovali, please help cheyyandi"
- For Tamil: "Naan web development padikkanum, please help pannunga"

Return only the metadata text, nothing else.`,
    output: { schema: z.object({ metadata: z.string() }) },
    config: { temperature: 0 }
  });

  return output?.metadata || `Main ${ctaText.toLowerCase()}, please guide karo`;
}

// Generate greeting response
async function generateGreetingResponse(message: string, profile: any, systemPrompt: string): Promise<ResponseWithCTAs> {
  const { output } = await ai.generate({
    prompt: `${systemPrompt}

Respond to this greeting: "${message}"

User's detected persona: ${profile.persona || 'student'}
User's detected dialect: ${profile.dialect || 'hinglish'}

Generate MAX 2 short messages (MAX 12 words each) that:
1. Welcome them warmly in their dialect
2. Express enthusiasm about helping them learn
3. Ask about their current situation or goals
4. Keep each message conversational and encouraging

Then generate 3 contextual next steps that represent:
- TEXT FIELD: What the user wants to say next - their intention/desire
- METADATA FIELD: What the user would actually type in their dialect

EXAMPLE OUTPUT:
{
  "messages": ["Hello message 1", "Hello message 2"],
  "nextQuestions": [
    {"text": "Main apna rasta khud banana chahta hun", "metadata": "Main HTML seekhna chahta hun, please guide karo"},
    {"text": "Main skills develop karna chahta hun", "metadata": "Main CSS seekhna chahta hun, please help karo"},
    {"text": "Main career growth karna chahta hun", "metadata": "Main JavaScript seekhna chahta hun, please guide karo"}
  ]
}

Return as JSON with messages array and nextQuestions array with text and metadata fields.`,
    output: { schema: z.object({ 
      messages: z.array(z.string()),
      nextQuestions: z.array(z.object({
        text: z.string(),
        metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
      }))
    }) },
    config: { temperature: 0 }
  });

  return output || {
    messages: [
      "Namaste bhai! Main excited hun tumhari learning journey mein help karne ke liye."
    ],
    nextQuestions: [
      { text: "Main apna rasta khud banana chahta hun", metadata: "Main English seekhna chahta hun, please meri help karo" },
      { text: "Main skills develop karna chahta hun", metadata: "Main AI ke bare mein jaanna chahta hun, guide karo" },
      { text: "Main career growth karna chahta hun", metadata: "Main digital marketing seekhna chahta hun, course suggest karo" }
    ]
  };
}

// Generate role discovery response
async function generateRoleDiscoveryResponse(message: string, profile: any, systemPrompt: string): Promise<ResponseWithCTAs> {
  const { output } = await ai.generate({
    prompt: `${systemPrompt}

The user said: "${message}"

Based on this message, help them explore their current role or profession. Generate MAX 2 short messages (MAX 12 words each) that:
1. Show interest in their current work
2. Ask about their industry and responsibilities
3. Understand their daily skills
4. Keep it conversational and encouraging

Then generate 3 contextual next steps related to their role and career growth:
- TEXT FIELD: What the user wants to say next - their intention/desire
- METADATA FIELD: What the user would actually type in their dialect

Return as JSON with messages array and nextQuestions array with text and metadata fields.`,
    output: { schema: z.object({ 
      messages: z.array(z.string()),
      nextQuestions: z.array(z.object({
        text: z.string(),
        metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
      }))
    }) },
    config: { temperature: 0 }
  });

  return output || {
    messages: [
      "Interesting bhai! Tumhare current role ke baare mein aur batao."
    ],
    nextQuestions: [
      { text: "Main career growth karna chahta hun", metadata: "Main career growth ke liye skills seekhna chahta hun, please guide karo" },
      { text: "Main industry-specific course karna chahta hun", metadata: "Main industry-specific course karna chahta hun, suggest karo" },
      { text: "Main leadership skills develop karna chahta hun", metadata: "Main leadership skills develop karna chahta hun, help karo" }
    ]
  };
}

// Generate goals discovery response
async function generateGoalsDiscoveryResponse(message: string, profile: any, systemPrompt: string): Promise<ResponseWithCTAs> {
  const { output } = await ai.generate({
    prompt: `${systemPrompt}

The user said: "${message}"

Their current role: ${profile.currentRole || 'Not specified'}

Help them clarify their learning goals. Generate MAX 2 short messages (MAX 12 words each) that:
1. Show enthusiasm about their goals
2. Ask about specific skills they want to develop
3. Connect goals to their current role
4. Keep it encouraging and relatable

Then generate 3 contextual next steps related to their learning goals:
- TEXT FIELD: What the user wants to say next - their intention/desire
- METADATA FIELD: What the user would actually type in their dialect

Return as JSON with messages array and nextQuestions array with text and metadata fields.`,
    output: { schema: z.object({ 
      messages: z.array(z.string()),
      nextQuestions: z.array(z.object({
        text: z.string(),
        metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
      }))
    }) },
    config: { temperature: 0 }
  });

  return output || {
    messages: [
      "Great bhai! Ab main samajhna chahta hun tum kya achieve karna chahte ho."
    ],
    nextQuestions: [
      { text: "Main technical skills develop karna chahta hun", metadata: "Main technical skills develop karna chahta hun, please meri help karo" },
      { text: "Main soft skills improve karna chahta hun", metadata: "Main soft skills improve karna chahta hun, guide karo" },
      { text: "Main certification course karna chahta hun", metadata: "Main certification course karna chahta hun, suggest karo" }
    ]
  };
}

// Generate experience discovery response
async function generateExperienceDiscoveryResponse(message: string, profile: any, systemPrompt: string): Promise<ResponseWithCTAs> {
  const { output } = await ai.generate({
    prompt: `${systemPrompt}

The user said: "${message}"

Their role: ${profile.currentRole || 'Not specified'}
Their goals: ${profile.learningGoals?.join(', ') || 'Not specified'}

Help them assess their current experience level. Generate MAX 2 short messages (MAX 12 words each) that:
1. Show encouragement about their current level
2. Ask about their experience with topics they want to learn
3. Understand what they find challenging
4. Keep it supportive and relatable

Then generate 3 contextual next steps based on their experience level:
- TEXT FIELD: What the user wants to say next - their intention/desire
- METADATA FIELD: What the user would actually type in their dialect

Return as JSON with messages array and nextQuestions array with text and metadata fields.`,
    output: { schema: z.object({ 
      messages: z.array(z.string()),
      nextQuestions: z.array(z.object({
        text: z.string(),
        metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
      }))
    }) },
    config: { temperature: 0 }
  });

  return output || {
    messages: [
      "Perfect bhai! Ab tumhare experience level ke baare mein baat karte hain."
    ],
    nextQuestions: [
      { text: "Main beginner course start karna chahta hun", metadata: "Main beginner course start karna chahta hun, please guide karo" },
      { text: "Main advanced topics explore karna chahta hun", metadata: "Main advanced topics explore karna chahta hun, help karo" },
      { text: "Main practice projects banane chahta hun", metadata: "Main practice projects banane chahta hun, suggest karo" }
    ]
  };
}

// Generate recommendation response
async function generateRecommendationResponse(message: string, profile: any, systemPrompt: string): Promise<ResponseWithCTAs> {
  const { output } = await ai.generate({
    prompt: `${systemPrompt}

Based on this user profile, generate a personalized response:

Role: ${profile.currentRole || 'Not specified'}
Goals: ${profile.learningGoals?.join(', ') || 'Not specified'}
Experience: ${profile.experienceLevel || 'Not specified'}
Interests: ${profile.interests?.join(', ') || 'Not specified'}

Generate MAX 2 short messages (MAX 12 words each) that:
1. Acknowledge what you've learned about them
2. Show excitement about helping them achieve their goals
3. Mention personalized course recommendations
4. Ask if they're ready to see their learning path

Then generate 3 contextual next steps for their personalized learning path:
- TEXT FIELD: What the user wants to say next - their intention/desire
- METADATA FIELD: What the user would actually type in their dialect

Return as JSON with messages array and nextQuestions array with text and metadata fields.`,
    output: { schema: z.object({ 
      messages: z.array(z.string()),
      nextQuestions: z.array(z.object({
        text: z.string(),
        metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
      }))
    }) },
    config: { temperature: 0 }
  });

  return output || {
    messages: [
      "Excellent bhai! Ab maine tumhare goals aur background ko samajh liya hai.",
      "Main excited hun tumhare liye personalized learning path banane mein."
    ],
    nextQuestions: [
      { text: "Main course recommendations dekhna chahta hun", metadata: "Main course recommendations dekhna chahta hun, please suggest karo" },
      { text: "Main learning timeline banane chahta hun", metadata: "Main learning timeline banane chahta hun, help karo" },
      { text: "Main progress tracking setup karna chahta hun", metadata: "Main progress tracking setup karna chahta hun, guide karo" }
    ]
  };
}

// Generate ongoing support response
async function generateOngoingSupportResponse(message: string, profile: any, systemPrompt: string): Promise<ResponseWithCTAs> {
  const { output } = await ai.generate({
    prompt: `${systemPrompt}

The user said: "${message}"

Their profile:
Role: ${profile.currentRole || 'Not specified'}
Goals: ${profile.learningGoals?.join(', ') || 'Not specified'}
Experience: ${profile.experienceLevel || 'Not specified'}

Provide ongoing support by generating MAX 2 short messages (MAX 12 words each) that:
1. Address their current question or concern
2. Connect it to their learning goals
3. Offer encouragement and guidance
4. Suggest next steps

Then generate 3 contextual next steps for continued learning:
- TEXT FIELD: What the user wants to say next - their intention/desire
- METADATA FIELD: What the user would actually type in their dialect

Return as JSON with messages array and nextQuestions array with text and metadata fields.`,
    output: { schema: z.object({ 
      messages: z.array(z.string()),
      nextQuestions: z.array(z.object({
        text: z.string(),
        metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
      }))
    }) },
    config: { temperature: 0 }
  });

  return output || {
    messages: [
      "Main yahan hun tumhari learning journey mein support karne ke liye!"
    ],
    nextQuestions: [
      { text: "Main daily practice routine banane chahta hun", metadata: "Main daily practice routine banane chahta hun, please help karo" },
      { text: "Main doubt clearing session karna chahta hun", metadata: "Main doubt clearing session karna chahta hun, guide karo" },
      { text: "Main next milestone set karna chahta hun", metadata: "Main next milestone set karna chahta hun, suggest karo" }
    ]
  };
}

// Generate general response
async function generateGeneralResponse(message: string, profile: any, systemPrompt: string): Promise<ResponseWithCTAs> {
  const { output } = await ai.generate({
    prompt: `${systemPrompt}

The user said: "${message}"

Respond helpfully while trying to learn more about them. Generate MAX 2 short messages (MAX 12 words each) that:
1. Show interest in their current situation
2. Ask what they want to learn
3. Offer help and guidance
4. Keep it conversational and curious

Then generate 3 contextual next steps for general learning:
- TEXT FIELD: What the user wants to say next - their intention/desire
- METADATA FIELD: What the user would actually type in their dialect

Return as JSON with messages array and nextQuestions array with text and metadata fields.`,
    output: { schema: z.object({ 
      messages: z.array(z.string()),
      nextQuestions: z.array(z.object({
        text: z.string(),
        metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
      }))
    }) },
    config: { temperature: 0 }
  });

  return output || {
    messages: [
      "Main tumhari help karna chahta hun!"
    ],
    nextQuestions: [
      { text: "Main popular courses explore karna chahta hun", metadata: "Main popular courses explore karna chahta hun, please suggest karo" },
      { text: "Main skill assessment karna chahta hun", metadata: "Main skill assessment karna chahta hun, help karo" },
      { text: "Main learning goals set karna chahta hun", metadata: "Main learning goals set karna chahta hun, guide karo" }
    ]
  };
}

// Get personalized course recommendations
async function getPersonalizedRecommendations(profile: any): Promise<any[]> {
  try {
    // Build search query based on user profile
    const searchTerms = [
      ...(profile.learningGoals || []),
      ...(profile.interests || []),
      profile.currentRole,
    ].filter(Boolean);

    const searchQuery = searchTerms.join(' ');

    // Use course retriever to find relevant courses
    const retrievedDocs = await ai.retrieve({
      retriever: courseRetriever,
      query: searchQuery,
      options: {
        limit: 3,
      },
    });

    // Generate personalized reasons for each recommendation
    const recommendations = await Promise.all(
      retrievedDocs.map(async (doc: any) => {
        const courseData = doc.metadata;
        if (!courseData) return null;

        const { output } = await ai.generate({
          prompt: `Explain why this course "${courseData.name}" is perfect for someone with this profile:
          
          Role: ${profile.currentRole || 'Not specified'}
          Goals: ${profile.learningGoals?.join(', ') || 'Not specified'}
          Experience: ${profile.experienceLevel || 'Not specified'}
          Persona: ${profile.persona || 'Not specified'}
          
          Keep the explanation personal and specific to their situation. Use Hinglish naturally and make it relatable for Tier 2/3 users.`,
          output: { schema: z.object({ reason: z.string() }) },
        });

        return {
          id: courseData.id,
          name: courseData.name,
          reason: output?.reason || 'Ye course tumhare learning goals ke saath perfect match karta hai.',
        };
      })
    );

    return recommendations.filter(Boolean);
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    return [];
  }
}

// Export flows for use
export const flows = {
  courseRecommendationFlow,
  contentDiscoveryFlow,
  similarContentFlow,
  vectorReindexFlow,
  chatFlow,
};

// Export user profile management functions
export const userProfileManager = {
  getProfile: (userId: string) => userProfiles.get(userId),
  updateProfile: (userId: string, updates: any) => {
    const current = userProfiles.get(userId) || {};
    userProfiles.set(userId, { ...current, ...updates });
  },
  clearProfile: (userId: string) => userProfiles.delete(userId),
  getAllProfiles: () => Object.fromEntries(userProfiles),
};

// Example usage function
async function runExamples() {
  try {
    console.log('🚀 Running course recommendation example...');
    
    const recommendation = await courseRecommendationFlow({
      userQuery: 'machine learning fundamentals',
    });
    
    console.log('Course Recommendations:', JSON.stringify(recommendation, null, 2));

    console.log('\n🔍 Running content discovery example...');
    
    if (recommendation.recommendations.length > 0 && recommendation.recommendations[0]) {
      const contentDiscovery = await contentDiscoveryFlow({
        courseId: z.bigint().parse(recommendation.recommendations[0].id),
        contentType: 'video',
      });
      
      console.log('Content Discovery:', JSON.stringify(contentDiscovery, null, 2));
    }

    console.log('\n🎯 Running text search example...');
    
    const similarContent = await similarContentFlow({
      query: 'artificial intelligence and neural networks',
      source: 'courses',
    });
    
    console.log('Similar Content:', JSON.stringify(similarContent, null, 2));

  } catch (error) {
    console.error('Error running examples:', error);
  }
}