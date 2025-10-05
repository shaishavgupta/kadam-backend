import { genkit, z } from 'genkit';
import { xAI } from '@genkit-ai/compat-oai/xai';
import { sessionStore, chatDatabase } from '../../infra/session-store';

// Import all modules
import * as schemas from '../../schemas/ai';
import { PersonaDetector } from './persona-detector';
import { PromptGenerator } from './prompt-generator';
import { ConversationFlowManager, ConversationStage } from './conversation-flow';
import { ResponseGenerator } from './response-generator';
import { SessionManager, SessionData, UserProfile } from './session-manager';

// Initialize Genkit with xAI plugin
export const ai = genkit({
  plugins: [xAI({ apiKey: process.env.XAI_API_KEY })],
  model: xAI.model('grok-4-fast-non-reasoning', {
    temperature: 0.8,
  }),
});

// Initialize all managers
const personaDetector = new PersonaDetector(ai);
const promptGenerator = new PromptGenerator();
const conversationFlowManager = new ConversationFlowManager();
const responseGenerator = new ResponseGenerator(ai);
const sessionManager = new SessionManager();

// Main Chat Flow with User Discovery and Session Management
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

      // Get user profile from user table
      const currentProfile = await sessionManager.getUserProfile(userId);

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

        IMPORTANT: For enum fields (gender, experienceLevel, timeCommitment, preferredLearningStyle, persona, dialect, tier),
        if you cannot determine the value, return "unknown" instead of omitting the field.

        Current profile: ${JSON.stringify(currentProfile)}

        User's basic information:
        - Name: ${currentProfile.name || 'unknown'}
        - Gender: ${currentProfile.gender || 'unknown'}
        - Date of Birth: ${currentProfile.dob || 'unknown'}
        - Bio: ${currentProfile.bio || 'unknown'}`,
        output: { schema: schemas.UserProfileSchema },
      });

      // Merge new information with existing profile
      const updatedProfile: UserProfile = {
        ...currentProfile,
        ...profileAnalysis.output,
      };

      // Detect user persona and dialect
      const { persona: detectedPersona, dialect: detectedDialect } = await personaDetector
        .detectPersonaAndDialect(updatedProfile, input.message, userId)
        .catch(() => {
          console.log('LLM detection failed, using unknown fallback');
          return { persona: 'unknown', dialect: 'unknown' };
        });

      const detectedTier = 'unknown'; // Use unknown instead of default tier2

      // Update profile with detected persona, dialect, and tier
      updatedProfile.persona = detectedPersona as 'student' | 'jobbie' | 'dylan' | 'content_creator' | 'unknown';
      updatedProfile.dialect = detectedDialect as 'hinglish' | 'telugu' | 'tamil' | 'bengali' | 'punjabi' | 'gujarati' | 'unknown';
      updatedProfile.tier = detectedTier as 'tier1' | 'tier2' | 'tier3' | 'unknown';

      // Store updated profile in user table
      await sessionManager.updateUserProfile(userId, updatedProfile);

      // Get system prompt based on persona, dialect, tier, and user profile
      const systemPrompt = promptGenerator.getSystemPrompt(detectedPersona, detectedDialect, detectedTier, updatedProfile);

      // Determine conversation stage and generate appropriate response
      const conversationStage = conversationFlowManager.determineConversationStage(updatedProfile);

      let response: string[];
      let nextQuestions: Array<{ text: string; metadata: string }> = [];
      let learningPath: any = {
        suggested: false,
        courses: []
      };

      // Generate response based on conversation stage
      const responseResult = await generateStageResponse(
        conversationStage,
        input.message,
        updatedProfile,
        systemPrompt,
        detectedPersona,
        detectedDialect
      );

      response = responseResult.messages;
      nextQuestions = responseResult.nextQuestions;
      learningPath = responseResult.learningPath || learningPath;

      // Add messages to session history
      sessionManager.addMessageToSession(sessionData, 'user', input.message);
      sessionManager.addMessageToSession(sessionData, 'assistant', response.join(' '));

      // Save session data
      await sessionManager.saveSession(sessionId, sessionData);

      return {
        messages: response,
        type: input.type || 'text',
        userProfile: updatedProfile,
        nextQuestions,
        learningPath,
        sessionId, // Return session ID for client to use
      };
    } catch (error) {
      console.error('Error in chat flow:', error);
      return getErrorResponse(input);
    }
  }
);

// Helper method to generate response based on conversation stage
async function generateStageResponse(
  stage: ConversationStage,
  message: string,
  profile: UserProfile,
  systemPrompt: string,
  persona: string,
  dialect: string
): Promise<{
  messages: string[];
  nextQuestions: Array<{ text: string; metadata: string }>;
  learningPath?: any;
}> {
  let responseResult: any;

  switch (stage) {
    case 'greeting':
      responseResult = await responseGenerator.generateGreetingResponse(message, profile, systemPrompt);
      // Generate user-perspective metadata for each CTA
      const nextQuestions = await Promise.all(responseResult.nextQuestions.map(async (q: any) => ({
        text: q.text,
        metadata: await responseGenerator.generateUserPerspectiveMetadata(q.text, message, persona, dialect)
      })));
      return {
        messages: responseResult.messages,
        nextQuestions,
        learningPath: { suggested: false, courses: [] }
      };

    case 'role_discovery':
      responseResult = await responseGenerator.generateRoleDiscoveryResponse(message, profile, systemPrompt);
      return {
        messages: responseResult.messages,
        nextQuestions: responseResult.nextQuestions,
        learningPath: { suggested: false, courses: [] }
      };

    case 'goals_discovery':
      responseResult = await responseGenerator.generateGoalsDiscoveryResponse(message, profile, systemPrompt);
      return {
        messages: responseResult.messages,
        nextQuestions: responseResult.nextQuestions,
        learningPath: { suggested: false, courses: [] }
      };

    case 'ready_for_recommendations':
      responseResult = await responseGenerator.generateRecommendationResponse(message, profile, systemPrompt);
      return {
        messages: responseResult.messages,
        nextQuestions: responseResult.nextQuestions,
        learningPath: { suggested: true, courses: [] }
      };

    case 'ongoing_support':
      responseResult = await responseGenerator.generateOngoingSupportResponse(message, profile, systemPrompt);
      return {
        messages: responseResult.messages,
        nextQuestions: responseResult.nextQuestions,
        learningPath: { suggested: false, courses: [] }
      };

    default:
      responseResult = await responseGenerator.generateGeneralResponse(message, profile, systemPrompt);
      return {
        messages: responseResult.messages,
        nextQuestions: responseResult.nextQuestions,
        learningPath: { suggested: false, courses: [] }
      };
  }
}

// Error response helper
function getErrorResponse(input: any) {
  return {
    messages: ["Sorry bhai, maine error face kiya hai 😅 Chalo fresh start karte hain - tum kya sikhna chahte ho? 🎯"],
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

// Export individual managers for advanced usage
export {
  personaDetector,
  promptGenerator,
  conversationFlowManager,
  responseGenerator,
  sessionManager as sessionManagerInstance,
};

// Export schemas
export * from '../../schemas/ai';
