import { z } from 'genkit';

// Course Search Schemas
export const CourseSearchInputSchema = z.object({
  query: z.string().describe('Search query for courses'),
  categoryId: z.bigint().optional().describe('Filter by category ID'),
  limit: z.number().default(10).describe('Maximum number of results to return'),
});

export const CourseSearchResultSchema = z.object({
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
