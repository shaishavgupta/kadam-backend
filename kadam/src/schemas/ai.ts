import { Type } from '@sinclair/typebox';
import { z } from 'genkit';

// Course Recommendation Request Schema
export const CourseRecommendationRequestSchema = Type.Object({
    userQuery: Type.String({ description: 'User query for course recommendations' }),
    categoryId: Type.Optional(Type.String({ description: 'Optional category filter' }))
});

export const CourseRecommendationApiResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        recommendations: Type.Array(Type.Object({
            id: Type.String(),
            name: Type.String(),
            description: Type.String(),
            price: Type.String(),
            thumbnail_url: Type.Union([Type.String(), Type.Null()]),
            priority: Type.Number(),
            rank: Type.Number(),
            reason: Type.String(),
            similarity: Type.Number()
        })),
        categories: Type.Array(Type.Object({
            id: Type.String(),
            name: Type.String(),
            image_url: Type.String()
        }))
    }),
    message: Type.String()
});

// Content Discovery Request Schema
export const ContentDiscoveryRequestSchema = Type.Object({
    courseId: Type.String({ description: 'Course ID to explore content for' }),
    contentType: Type.Optional(Type.String({ description: 'Filter by content type (video, text, quiz, etc.)' }))
});

export const ContentDiscoveryApiResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        course: Type.Union([Type.Object({
            id: Type.String(),
            name: Type.String(),
            description: Type.String(),
            price: Type.Number(),
            thumbnail_url: Type.Union([Type.String(), Type.Null()])
        }), Type.Null()]),
        modules: Type.Array(Type.Object({
            id: Type.String(),
            name: Type.String(),
            description: Type.String(),
            position: Type.Number(),
            contentCount: Type.Number()
        })),
        contents: Type.Array(Type.Object({
            id: Type.String(),
            name: Type.String(),
            content_type: Type.String(),
            position: Type.Number(),
            duration: Type.Union([Type.Number(), Type.Null()]),
            url: Type.Union([Type.String(), Type.Null()])
        }))
    }),
    message: Type.String()
});

// Similar Content Request Schema
export const SimilarContentRequestSchema = Type.Object({
    query: Type.String({ description: 'Text query to find similar content' }),
    source: Type.Union([Type.Literal('contents'), Type.Literal('courses')], { description: 'Source type to search in' })
});

export const SimilarContentApiResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        similarItems: Type.Array(Type.Object({
            id: Type.String(),
            string: Type.String(),
            source: Type.Union([Type.Literal('contents'), Type.Literal('courses')]),
            source_id: Type.String(),
            explanation: Type.String()
        }))
    }),
    message: Type.String()
});

// Vector Reindex Request Schema
export const VectorReindexRequestSchema = Type.Object({
    source: Type.Union([Type.Literal('contents'), Type.Literal('courses'), Type.Literal('all')], {
        default: 'all',
        description: 'Source type to reindex'
    }),
    batchSize: Type.Number({ default: 10, description: 'Number of items to process in each batch' })
});

export const VectorReindexApiResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        processed: Type.Number(),
        errors: Type.Array(Type.String()),
        summary: Type.String()
    }),
    message: Type.String()
});

// Chat Request Schema
export const ChatRequestSchema = Type.Object({
    message: Type.String({ description: 'User message' }),
    type: Type.Optional(Type.String({ description: 'Message type' })),
    sessionId: Type.Optional(Type.String({ description: 'Session ID for conversation continuity' })),
    newSession: Type.Optional(Type.Boolean({ default: false, description: 'Whether to create a new session' })),
    expertId: Type.Number({ description: 'Expert ID for AI personality and behavior' })
});

// Chat Response Schema (moved up to avoid temporal dead zone)

export const ChatResponseSchema = z.object({
    messages: z.array(z.string()).describe('Array of AI response messages to display with typing animation'),
    type: z.string().optional().describe('Response type'),
    nextQuestions: z.array(z.object({
        text: z.string().describe('What the user wants to say next - their intention/desire (e.g., "Main apna rasta khud banana chahta hun")'),
        metadata: z.string().describe('User\'s message in their dialect and persona - what they would actually type (e.g., "Main HTML seekhna chahta hun, please guide karo")')
    })).optional().describe('User intentions and their actual messages in their dialect'),
    learningPath: z.object({
        path_title: z.string().describe('Title of the learning path'),
        suggested: z.boolean().describe('Whether to suggest a learning path'),
        courses: z.array(z.object({
            id: z.number(),
            name: z.string(),
            description: z.string(),
            thumbnail_url: z.string().optional(),
            reason: z.string()
        })).optional().describe('Suggested courses')
    }).describe('Learning path suggestions'),
    sessionId: z.string().optional().describe('Session ID for conversation continuity')
});

export const ChatApiResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        messages: Type.Array(Type.String()),
        type: Type.Optional(Type.String()),
        nextQuestions: Type.Optional(Type.Array(Type.Object({
            text: Type.String(),
            metadata: Type.String()
        }))),
        learningPath: Type.Object({
            path_title: Type.String(),
            suggested: Type.Boolean(),
            courses: Type.Optional(Type.Array(Type.Object({
                id: Type.Number(),
                name: Type.String(),
                description: Type.String(),
                thumbnail_url: Type.Optional(Type.String()),
                reason: Type.String()
            })))
        }),
        sessionId: Type.Optional(Type.String()),
        expert: Type.Object({
            id: Type.Number(),
            name: Type.String(),
            title: Type.Optional(Type.String())
        })
    }),
    message: Type.String()
});

// TypeScript interfaces for request/response types
export interface CourseRecommendationRequest {
    userQuery: string;
    categoryId?: string;
}

export interface ContentDiscoveryRequest {
    courseId: string;
    contentType?: string;
}

export interface SimilarContentRequest {
    query: string;
    source: 'contents' | 'courses';
}

export interface VectorReindexRequest {
    source: 'contents' | 'courses' | 'all';
    batchSize: number;
}

export interface ChatRequest {
    message: string;
    type?: string;
    sessionId?: string;
    newSession?: boolean;
    expertId: number;
}

// Session Management Schemas
export const GetUserSessionsRequestSchema = Type.Object({
    userId: Type.String({ description: 'User ID to get sessions for' })
});

export const GetUserSessionsResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Array(Type.Object({
        session_id: Type.String(),
        title: Type.Union([Type.String(), Type.Null()]),
        created_at: Type.String(),
        updated_at: Type.String(),
        expert_id: Type.String()
    })),
    message: Type.String()
});

export const GetSessionMessagesRequestSchema = Type.Object({
    sessionId: Type.String({ description: 'Session ID to get messages for' }),
    limit: Type.Optional(Type.Number({ description: 'Number of recent messages to return' }))
});

export const GetSessionMessagesResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Array(Type.Object({
        role: Type.String(),
        content: Type.String(),
        timestamp: Type.String()
    })),
    message: Type.String()
});

export const DeleteSessionRequestSchema = Type.Object({
    sessionId: Type.String({ description: 'Session ID to delete' })
});

export const DeleteSessionResponseSchema = Type.Object({
    success: Type.Boolean(),
    message: Type.String()
});

export const UpdateSessionTitleRequestSchema = Type.Object({
    sessionId: Type.String({ description: 'Session ID to update' }),
    title: Type.String({ description: 'New title for the session' })
});

export const UpdateSessionTitleResponseSchema = Type.Object({
    success: Type.Boolean(),
    message: Type.String()
});

export const CreateSessionRequestSchema = Type.Object({
    userId: Type.String({ description: 'User ID to create session for' }),
    title: Type.Optional(Type.String({ description: 'Title for the new session' })),
    expertId: Type.Number({ description: 'Expert ID for this session' })
});

export const CreateSessionResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        sessionId: Type.String()
    }),
    message: Type.String()
});

// TypeScript interfaces for session management
export interface GetUserSessionsRequest {
    userId: string;
}

export interface GetSessionMessagesRequest {
    sessionId: string;
    limit?: number;
}

export interface DeleteSessionRequest {
    sessionId: string;
}

export interface UpdateSessionTitleRequest {
    sessionId: string;
    title: string;
}

export interface CreateSessionRequest {
    userId: string;
    title?: string;
    expertId: number;
}

// Expert Management Schemas
export const GetExpertsResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Array(Type.Object({
        id: Type.Number(),
        name: Type.String(),
        title: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
        avatar_url: Type.Optional(Type.String()),
        actions: Type.Array(Type.Object({
            icon: Type.String(),
            label: Type.String(),
            prompt: Type.String()
        })),
        tags: Type.Array(Type.String())
    })),
    message: Type.String()
});

export const GetExpertResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        id: Type.Number(),
        name: Type.String(),
        title: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
        avatar_url: Type.Optional(Type.String()),
        prompt_function_name: Type.String(),
        is_active: Type.Boolean(),
        actions: Type.Array(Type.Object({
            icon: Type.String(),
            label: Type.String(),
            prompt: Type.String()
        })),
        tags: Type.Array(Type.String()),
        created_at: Type.String(),
        updated_at: Type.String()
    }),
    message: Type.String()
});

export const CreateExpertRequestSchema = Type.Object({
    name: Type.String({ description: 'Expert display name' }),
    title: Type.Optional(Type.String({ description: 'Expert title or role' })),
    description: Type.Optional(Type.String({ description: 'Expert description' })),
    avatar_url: Type.Optional(Type.String({ description: 'Expert avatar URL' })),
    prompt_function_name: Type.String({ description: 'TypeScript function name for prompt generation' }),
    actions: Type.Optional(Type.Array(Type.Object({
        icon: Type.String({ description: 'Icon identifier for the action' }),
        label: Type.String({ description: 'Display label for the action' }),
        prompt: Type.String({ description: 'Prompt text for the action' })
    }))),
    tags: Type.Optional(Type.Array(Type.String({ description: 'Tags/categories for expert specialization' })))
});

export const UpdateExpertRequestSchema = Type.Object({
    name: Type.Optional(Type.String({ description: 'Expert display name' })),
    title: Type.Optional(Type.String({ description: 'Expert title or role' })),
    description: Type.Optional(Type.String({ description: 'Expert description' })),
    avatar_url: Type.Optional(Type.String({ description: 'Expert avatar URL' })),
    prompt_function_name: Type.Optional(Type.String({ description: 'TypeScript function name for prompt generation' })),
    is_active: Type.Optional(Type.Boolean({ description: 'Whether expert is active' })),
    actions: Type.Optional(Type.Array(Type.Object({
        icon: Type.String({ description: 'Icon identifier for the action' }),
        label: Type.String({ description: 'Display label for the action' }),
        prompt: Type.String({ description: 'Prompt text for the action' })
    }))),
    tags: Type.Optional(Type.Array(Type.String({ description: 'Tags/categories for expert specialization' })))
});

export const CreateExpertResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        id: Type.Number(),
        name: Type.String(),
        title: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
        avatar_url: Type.Optional(Type.String()),
        prompt_function_name: Type.String(),
        is_active: Type.Boolean(),
        actions: Type.Array(Type.Object({
            icon: Type.String(),
            label: Type.String(),
            prompt: Type.String()
        })),
        tags: Type.Array(Type.String()),
        created_at: Type.String(),
        updated_at: Type.String()
    }),
    message: Type.String()
});

export const UpdateExpertResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        id: Type.Number(),
        name: Type.String(),
        title: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
        avatar_url: Type.Optional(Type.String()),
        prompt_function_name: Type.String(),
        is_active: Type.Boolean(),
        actions: Type.Array(Type.Object({
            icon: Type.String(),
            label: Type.String(),
            prompt: Type.String()
        })),
        tags: Type.Array(Type.String()),
        created_at: Type.String(),
        updated_at: Type.String()
    }),
    message: Type.String()
});

export const DeleteExpertResponseSchema = Type.Object({
    success: Type.Boolean(),
    message: Type.String()
});

// TypeScript interfaces for expert management
export interface GetExpertsRequest {
    // No query parameters needed for listing all active experts
}

export interface GetExpertRequest {
    expertId: string;
}

export interface CreateExpertRequest {
    name: string;
    title?: string;
    description?: string;
    avatar_url?: string;
    prompt_function_name: string;
    actions?: Array<{
        icon: string;
        label: string;
        prompt: string;
    }>;
    tags?: string[];
}

export interface UpdateExpertRequest {
    name?: string;
    title?: string;
    description?: string;
    avatar_url?: string;
    prompt_function_name?: string;
    is_active?: boolean;
    actions?: Array<{
        icon: string;
        label: string;
        prompt: string;
    }>;
    tags?: string[];
}

export interface DeleteExpertRequest {
    expertId: string;
}

// Persona Detection Schema
export const PersonaDetectionSchema = z.object({
    persona: z.enum(['student', 'jobbie', 'dylan', 'content_creator', 'unknown']).describe('Detected user persona'),
    dialect: z.enum(['hinglish', 'assamese', 'telugu', 'tamil', 'bengali', 'punjabi', 'gujarati', 'unknown']).describe('Detected user dialect')
});

// Course Search Schemas
export const CourseSearchInputSchema = z.object({
    query: z.string().describe('Search query for courses'),
    categoryId: z.bigint().optional().describe('Filter by category ID'),
    limit: z.number().default(10).describe('Maximum number of results to return')
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
        is_active: z.boolean().nullable()
    })),
    total: z.number()
});

// User Profile Schema
export const UserProfileSchema = z.object({
    // Basic user information from users table
    name: z.string().optional().describe("User's full name"),

    gender: z.enum(['male', 'female', 'others', 'unknown']).optional().describe("User's gender"),

    dob: z.string().optional().describe("User's date of birth"),

    bio: z.string().optional().describe("User's bio or personal description"),

    // AI learning profile information
    persona: z.enum(['student', 'jobbie', 'dylan', 'content_creator', 'unknown']).optional().describe('User persona type'),

    tier: z.enum(['tier1', 'tier2', 'tier3', 'unknown']).optional().describe('User tier classification'),

    dialect: z.enum(['hinglish', 'assamese', 'telugu', 'tamil', 'bengali', 'punjabi', 'gujarati', 'unknown']).optional().describe('Preferred dialect or local language'),

    currentRole: z.string().optional().describe('Current job role, education status, or profession'),

    experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'unknown']).optional().describe('Overall learning experience level'),

    learningGoals: z.array(z.string()).optional().describe('Primary learning goals (e.g., get a job, start freelancing)'),

    interests: z.array(z.string()).optional().describe('Topics or areas of interest'),

    currentSkills: z.array(z.string()).optional().describe('Skills already known by the user'),

    challenges: z.array(z.string()).optional().describe('Current learning or career challenges'),

    timeCommitment: z.enum(['<1hr/day', '1-2hr/day', 'weekends', 'flexible', 'unknown']).optional().describe('Time available for learning'),

    preferredLearningStyle: z.enum(['video', 'text', 'practice', 'mentor_guided', 'unknown']).optional().describe('Preferred learning format')
});

// User Perspective Metadata Schema
export const UserPerspectiveMetadataSchema = z.object({
    metadata: z.string()
});


// Response interface for generation functions
export interface ResponseWithCTAs {
    messages: string[];
    nextQuestions: Array<{
        text: string;
        metadata: string;
    }>;
}
