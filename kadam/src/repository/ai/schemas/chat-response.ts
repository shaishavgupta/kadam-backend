import { z } from 'genkit';

// Chat Response Schema
export const ChatResponseSchema = z.object({
  messages: z.array(z.string()).describe('Array of AI response messages to display with typing animation'),
  type: z.string().optional().describe('Response type'),
  userProfile: z.object({
    currentRole: z.string().optional().describe('User\'s current job role or profession'),
    experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'unknown']).optional().describe('Experience level'),
    learningGoals: z.array(z.string()).optional().describe('What they want to learn'),
    interests: z.array(z.string()).optional().describe('Areas of interest'),
    timeCommitment: z.string().optional().describe('How much time they can commit to learning'),
    preferredLearningStyle: z.string().optional().describe('How they prefer to learn'),
    currentSkills: z.array(z.string()).optional().describe('Skills they already have'),
    challenges: z.array(z.string()).optional().describe('Current challenges they face'),
    persona: z.enum(['student', 'jobbie', 'dylan', 'content_creator', 'unknown']).optional().describe('User persona type'),
    tier: z.enum(['tier1', 'tier2', 'tier3', 'unknown']).optional().describe('User tier classification'),
  }).optional().describe('Updated user profile'),
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
  sessionId: z.string().optional().describe('Session ID for conversation continuity'),
});

// Response interface for generation functions
export interface ResponseWithCTAs {
  messages: string[];
  nextQuestions: Array<{
    text: string;
    metadata: string;
  }>;
}
