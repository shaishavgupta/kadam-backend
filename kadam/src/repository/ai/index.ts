import { genkit, z } from 'genkit';
import { xAI } from '@genkit-ai/compat-oai/xai';
import { sessionStore, chatDatabase } from '../../infra/session-store';
import { db } from '../../infra/db';

// Import all modules
import * as schemas from '../../schemas/ai';
import { SessionManager } from './session-manager';
import { ExpertRepository } from '../experts.repository';

// Initialize Genkit with xAI plugin
export const ai = genkit({
  plugins: [xAI({ apiKey: process.env.XAI_API_KEY })],
  model: xAI.model('grok-4-fast-non-reasoning', {
    temperature: 0.8,
  }),
});

// Initialize managers
const sessionManager = new SessionManager();
const expertRepository = new ExpertRepository();

// Course cache interface
interface CourseCache {
  courses: Array<{
    id: number;
    name: string;
    description: string;
    thumbnail_url?: string;
  }>;
  lastUpdated: number;
  ttl: number; // Time to live in milliseconds
}

// Course cache instance
let courseCache: CourseCache = {
  courses: [],
  lastUpdated: 0,
  ttl: 60 * 60 * 1000 // 1 hour cache
};

// Function to get active courses with caching
async function getActiveCourses(): Promise<Array<{
  id: number;
  name: string;
  description: string;
  thumbnail_url?: string;
}>> {
  const now = Date.now();
  
  // Check if cache is still valid
  if (courseCache.courses.length > 0 && (now - courseCache.lastUpdated) < courseCache.ttl) {
    return courseCache.courses;
  }
  
  try {
    // Fetch active courses from database
    const result = await db.query(`
      SELECT id, name, description, thumbnail_url 
      FROM courses 
      WHERE is_active = true
      ORDER BY rank DESC, created_at DESC
    `);
    
    // Update cache
    courseCache.courses = result.rows;
    courseCache.lastUpdated = now;
    
    return courseCache.courses;
  } catch (error) {
    console.error('Error fetching active courses:', error);
    // Return cached data if available, even if expired
    return courseCache.courses;
  }
}

// Simplified Chat Flow with User Discovery and Session Management
export const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: z.object({
      message: z.string().describe('User message'),
      userId: z.string().describe('User ID for profile tracking (extracted from JWT)'),
      sessionId: z.string().optional().describe('Session ID for conversation continuity'),
      newSession: z.boolean().default(false).describe('Whether to create a new session'),
      type: z.string().optional().describe('Message type'),
      expertId: z.number().describe('Expert ID for AI personality and behavior'),
    }),
    outputSchema: schemas.ChatResponseSchema,
  },
  async (input: any) => {
    try {
      const userId = input.userId;

      // Ensure userId and expertId are provided
      if (!userId) {
        throw new Error('User ID is required for chat flow');
      }

      if (!input.expertId) {
        throw new Error('Expert ID is required for chat flow');
      }

      // Validate expert exists and is active
      const expert = await expertRepository.getExpertById(input.expertId);
      if (!expert) {
        throw new Error(`Expert with ID '${input.expertId}' not found`);
      }

      if (!expert.is_active) {
        throw new Error(`Expert '${expert.name}' is currently inactive`);
      }

      // Handle session management with expert context
      const { sessionId, sessionData } = await sessionManager.handleSession(
        userId,
        input.sessionId,
        input.newSession,
        input.expertId
      );

      // Get user profile from user table (for basic info only)
      const currentProfile = await sessionManager.getUserProfile(userId);

      // Get conversation history
      const conversationHistory = sessionData.messages || [];

      // Get available courses
      const availableCourses = await getActiveCourses();

      // Generate expert-specific prompt
      const expertPrompt = await expertRepository.getExpertPrompt(input.expertId, {
        userProfile: currentProfile,
        availableCourses,
        conversationHistory,
        userMessage: input.message
      });

      // Generate simplified response using single LLM call with full history
      const responseResult = await ai.generate({
        prompt: expertPrompt,
        output: {
          schema: z.object({
            messages: z.array(z.string()),
            nextQuestions: z.array(z.object({
              text: z.string(),
              metadata: z.string().describe('What user would actually type in their dialect')
            })),
            recommendedCourses: z.array(z.object({
              id: z.number(),
              name: z.string(),
              description: z.string(),
              thumbnail_url: z.string().optional(),
              reason: z.string()
            })).optional(),
            learningPlan: z.array(z.string()).optional()
          })
        },
        config: { temperature: 0.8 }
      });

      const response = responseResult.output?.messages || ["Sorry, maine response generate nahi kar paya 😅"];
      const nextQuestions = responseResult.output?.nextQuestions || [
        { text: "Main apna current role share karna chahta/chahti hun", metadata: "Main apna current role share karna chahta/chahti hun" },
        { text: "Main apne learning goals define karna chahta/chahti hun", metadata: "Main apne learning goals define karna chahta/chahti hun" },
        { text: "Main samajhna chahta/chahti hun ki aap kaise help kar sakte hain", metadata: "Main samajhna chahta/chahti hun ki aap kaise help kar sakte hain" }
      ];
      const recommendedCourses = responseResult.output?.recommendedCourses || [];
      const learningPlan = responseResult.output?.learningPlan || [];

      // Add messages to session history
      sessionManager.addMessageToSession(sessionData, 'user', input.message);
      sessionManager.addMessageToSession(sessionData, 'assistant', response.join(' '));

      // Save session data
      await sessionManager.saveSession(sessionId, sessionData);

      return {
        messages: response,
        type: input.type || 'text',
        nextQuestions,
        learningPath: {
          path_title: recommendedCourses.length > 0 ? 'Recommended Courses' : 'Custom Learning Path',
          suggested: recommendedCourses.length > 0,
          courses: recommendedCourses
        },
        sessionId, // Return session ID for client to use
        expert: {
          id: expert.id,
          name: expert.name,
          title: expert.title
        }
      };
    } catch (error) {
      console.error('Error in chat flow:', error);
      return getErrorResponse(input);
    }
  }
);


// Error response helper
function getErrorResponse(input: any) {
  return {
    messages: ["Sorry, maine error face kiya hai 😅 Thode der me wapas try kar? 🎯"],
    type: 'text',
    nextQuestions: [
      { text: "Main apna current role share karna chahta/chahti hun", metadata: "Main apna current role share karna chahta/chahti hun" },
      { text: "Main apne learning goals define karna chahta/chahti hun", metadata: "Main apne learning goals define karna chahta/chahti hun" },
      { text: "Main samajhna chahta/chahti hun ki aap kaise help kar sakte hain", metadata: "Main samajhna chahta/chahti hun ki aap kaise help kar sakte hain" }
    ],
    learningPath: {
      path_title: 'Learning Support',
      suggested: false,
      courses: []
    },
    sessionId: input.sessionId || `session_${input.userId}_${Date.now()}`,
    expert: {
      id: 0,
      name: 'Unknown',
      title: 'Assistant'
    }
  };
}

// Export flows for use
export const flows = {
  chatFlow,
};

// Export session management functions
export const sessionManagerExports = {
  sessionStore,
  chatDatabase,
};

// Export user profile management functions
export const userProfileManager = {
  getProfile: (userId: string) => chatDatabase.getUserProfile(userId),
  updateProfile: (userId: string, updates: any) => chatDatabase.updateUserProfile(userId, updates),
  clearProfile: (userId: string) => chatDatabase.clearUserProfile(userId),
  getAllProfiles: () => chatDatabase.getAllUserProfiles(),
  getProfileStats: () => chatDatabase.getUserProfileStats(),
};

// Function to clear course cache (useful for admin operations)
export function clearCourseCache(): void {
  courseCache.courses = [];
  courseCache.lastUpdated = 0;
}

// Function to refresh course cache
export async function refreshCourseCache(): Promise<void> {
  courseCache.lastUpdated = 0; // Force refresh
  await getActiveCourses();
}

// Export individual managers for advanced usage
export {
  sessionManager as sessionManagerInstance,
  getActiveCourses,
};

// Export schemas
export * from '../../schemas/ai';
