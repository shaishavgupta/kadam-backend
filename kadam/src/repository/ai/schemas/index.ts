import { z } from 'genkit';

// Export all schemas from a single file for easy importing
export * from './course-search';
export * from './user-profile';
export * from './chat-response';

// Persona Detection Schema
export const PersonaDetectionSchema = z.object({
  persona: z.enum(['student', 'jobbie', 'dylan', 'content_creator', 'unknown']).describe('Detected user persona'),
  dialect: z.enum(['hinglish', 'assamese', 'telugu', 'tamil', 'bengali', 'punjabi', 'gujarati', 'unknown']).describe('Detected user dialect')
});
