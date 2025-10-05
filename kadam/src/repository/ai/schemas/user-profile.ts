import { z } from 'genkit';

export const UserProfileSchema = z.object({
  // Basic user information from users table
  name: z
    .string()
    .optional()
    .describe("User's full name"),

  gender: z
    .enum(["male", "female", "others", "unknown"])
    .optional()
    .describe("User's gender"),

  dob: z
    .string()
    .optional()
    .describe("User's date of birth"),

  bio: z
    .string()
    .optional()
    .describe("User's bio or personal description"),

  // AI learning profile information
  persona: z
    .enum(["student", "jobbie", "dylan", "content_creator", "unknown"])
    .optional()
    .describe("User persona type"),

  tier: z
    .enum(["tier1", "tier2", "tier3", "unknown"])
    .optional()
    .describe("User tier classification"),

  dialect: z
    .enum(["hinglish", "assamese", "telugu", "tamil", "bengali", "punjabi", "gujarati", "unknown"])
    .optional()
    .describe("Preferred dialect or local language"),

  currentRole: z
    .string()
    .optional()
    .describe("Current job role, education status, or profession"),

  experienceLevel: z
    .enum(["beginner", "intermediate", "advanced", "unknown"])
    .optional()
    .describe("Overall learning experience level"),

  learningGoals: z
    .array(z.string())
    .optional()
    .describe("Primary learning goals (e.g., get a job, start freelancing)"),

  interests: z
    .array(z.string())
    .optional()
    .describe("Topics or areas of interest"),

  currentSkills: z
    .array(z.string())
    .optional()
    .describe("Skills already known by the user"),

  challenges: z
    .array(z.string())
    .optional()
    .describe("Current learning or career challenges"),

  timeCommitment: z
    .enum(["<1hr/day", "1-2hr/day", "weekends", "flexible", "unknown"])
    .optional()
    .describe("Time available for learning"),

  preferredLearningStyle: z
    .enum(["video", "text", "practice", "mentor_guided", "unknown"])
    .optional()
    .describe("Preferred learning format"),
});


// User Perspective Metadata Schema
export const UserPerspectiveMetadataSchema = z.object({
  metadata: z.string()
});
