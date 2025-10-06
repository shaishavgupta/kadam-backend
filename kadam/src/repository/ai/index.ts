import { genkit, z } from 'genkit';
import { xAI } from '@genkit-ai/compat-oai/xai';
import { sessionStore, chatDatabase } from '../../infra/session-store';
import { CoursesRepository } from '../courses.repository';
import { db } from '../../infra/db';

// Import all modules
import * as schemas from '../../schemas/ai';
import { SessionManager } from './session-manager';

// Initialize Genkit with xAI plugin
export const ai = genkit({
  plugins: [xAI({ apiKey: process.env.XAI_API_KEY })],
  model: xAI.model('grok-4-fast-non-reasoning', {
    temperature: 0.8,
  }),
});

// Initialize managers
const sessionManager = new SessionManager();
const coursesRepository = new CoursesRepository();

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
  ttl: 5 * 60 * 1000 // 5 minutes cache
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
    }),
    outputSchema: schemas.ChatResponseSchema,
  },
  async (input: any) => {
    try {
      const userId = input.userId;

      // Ensure userId is provided
      if (!userId) {
        throw new Error('User ID is required for chat flow');
      }

      // Handle session management
      const { sessionId, sessionData } = await sessionManager.handleSession(
        userId,
        input.sessionId,
        input.newSession
      );

      // Get user profile from user table (for basic info only)
      const currentProfile = await sessionManager.getUserProfile(userId);

      // Get conversation history
      const conversationHistory = sessionData.messages || [];

      // Get available courses
      const availableCourses = await getActiveCourses();

      // Generate simplified response using single LLM call with full history
      const responseResult = await ai.generate({
        prompt: 
`# AI Learning Assistant Prompt

## Role & Purpose
You are a helpful AI learning assistant designed to guide users through their learning journey by:
- Understanding their learning goals and current role
- Recommending relevant courses when available
- Creating custom learning roadmaps when no courses match
- Maintaining conversational, personalized interactions

## Core Instructions

### 1. Learning Goal Discovery
- **Check**: Has the user already shared their learning goal?
- **If NO**: Ask them about their learning objectives and current role
- **If YES**: Proceed to course matching or custom roadmap creation

### 2. Course Recommendation Logic
- **When goal is known**: Check if it matches any available courses
- **If match found**: Recommend the course and encourage enrollment
- **If no match**: Appreciate their intent, and provide custom roadmap

### 3. Custom Learning Roadmap
When no courses match the user's goals:
- Appreciate their learning intent
- Tell them Kadam is currently working on this course and will be available soon and we will let them know when it is ready
- Provide a practical 5-10 step learning roadmap
- Focus on actionable steps (no third-party/external apps/softwares recommendations)
- Keep it simple and achievable

## Communication Style Rules

### Tone & Approach
- **Be friendly and conversational**
- **Keep responses concise**: Maximum 2 messages, ≤12 words each
- **Match user's style**: Mirror their tone, dialect, and writing style
- **Use Hinglish**: If the user communicates in Hinglish, respond accordingly

### Response Structure
- Always end with **3 helpful next question options**
- Make questions relevant to their current learning stage
- Use natural, conversational language

## Context Information

### User Profile
- **Name**: ${currentProfile.name || 'unknown'}

### Available Courses
${availableCourses.map(course => `- **${course.name}**: ${course.description}`).join('\n')}

### Conversation History
${conversationHistory.map((msg: any) => `**${msg.role}**: ${msg.content}`).join('\n')}

### Current Message
**User**: "${input.message}"

## Response Requirements

Generate a response that:

1. **Addresses** their current message directly
2. **Evaluates** if their query matches available courses
3. **Recommends** matching courses if found
4. **Provides** custom learning plan if no courses match
5. **Inquires** about role/goals if not known from history
6. **Includes** 3 helpful next questions

## Output Format

Return as JSON with the following structure:
- **messages**: Array of response messages (strings)
- **nextQuestions**: Array of objects with text and metadata fields
- **recommendedCourses**: Array of matching courses (if any) with id, name, description, thumbnail_url
- **learningPlan**: Array of 5-10 step learning plan strings (if no courses match)`,
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
              thumbnail_url: z.string().optional()
            })).optional(),
            learningPlan: z.array(z.string()).optional()
          })
        },
        config: { temperature: 0.8 }
      });

      const response = responseResult.output?.messages || ["Sorry bhai, maine response generate nahi kar paya 😅"];
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
        userProfile: currentProfile,
        nextQuestions,
        recommendedCourses,
        learningPlan,
        learningPath: {
          suggested: recommendedCourses.length > 0,
          courses: recommendedCourses
        },
        sessionId, // Return session ID for client to use
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
    userProfile: {},
    nextQuestions: [
      { text: "Main apna current role share karna chahta/chahti hun", metadata: "Main apna current role share karna chahta/chahti hun" },
      { text: "Main apne learning goals define karna chahta/chahti hun", metadata: "Main apne learning goals define karna chahta/chahti hun" },
      { text: "Main samajhna chahta/chahti hun ki aap kaise help kar sakte hain", metadata: "Main samajhna chahta/chahti hun ki aap kaise help kar sakte hain" }
    ],
    recommendedCourses: [],
    learningPlan: [],
    learningPath: {
      suggested: false,
      courses: []
    },
    sessionId: input.sessionId || `session_${input.userId}_${Date.now()}`
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
