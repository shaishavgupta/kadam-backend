import { Type } from '@sinclair/typebox';

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
    userId: Type.Optional(Type.String({ description: 'User ID for profile tracking' }))
});

export const ChatApiResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        messages: Type.Array(Type.String()),
        type: Type.Optional(Type.String()),
        userProfile: Type.Optional(Type.Object({
            currentRole: Type.Optional(Type.String()),
            experienceLevel: Type.Optional(Type.Union([Type.Literal('beginner'), Type.Literal('intermediate'), Type.Literal('advanced')])),
            learningGoals: Type.Optional(Type.Array(Type.String())),
            interests: Type.Optional(Type.Array(Type.String())),
            timeCommitment: Type.Optional(Type.String()),
            preferredLearningStyle: Type.Optional(Type.String()),
            currentSkills: Type.Optional(Type.Array(Type.String())),
            challenges: Type.Optional(Type.Array(Type.String())),
            persona: Type.Optional(Type.Union([Type.Literal('student'), Type.Literal('jobbie'), Type.Literal('dylan'), Type.Literal('content_creator')])),
            tier: Type.Optional(Type.Union([Type.Literal('tier1'), Type.Literal('tier2'), Type.Literal('tier3')]))
        })),
        nextQuestions: Type.Optional(Type.Array(Type.Object({
            text: Type.String(),
            metadata: Type.String()
        }))),
        learningPath: Type.Object({
            suggested: Type.Boolean(),
            courses: Type.Optional(Type.Array(Type.Object({
                id: Type.String(),
                name: Type.String(),
                reason: Type.String()
            })))
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
    userId?: string;
}
