import { z } from 'genkit';
import { ResponseWithCTAs, UserPerspectiveMetadataSchema } from '../../schemas/ai';
import { ConversationStage } from './conversation-flow';

export interface UserProfile {
  // Basic user information from users table
  name?: string;
  gender?: 'male' | 'female' | 'others' | 'unknown';
  dob?: string;
  bio?: string;

  // AI learning profile information
  currentRole?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'unknown';
  learningGoals?: string[];
  interests?: string[];
  timeCommitment?: string | 'unknown';
  preferredLearningStyle?: 'video' | 'text' | 'practice' | 'mentor_guided' | 'unknown';
  currentSkills?: string[];
  challenges?: string[];
  persona?: 'student' | 'jobbie' | 'dylan' | 'content_creator' | 'unknown';
  dialect?: 'hinglish' | 'assamese' | 'telugu' | 'tamil' | 'bengali' | 'punjabi' | 'gujarati' | 'unknown';
  tier?: 'tier1' | 'tier2' | 'tier3' | 'unknown';
}

export class ResponseGenerator {
  constructor(private ai: any) { }

  /**
   * Generate user-perspective metadata based on CTA text and user context
   */
  async generateUserPerspectiveMetadata(
    ctaText: string,
    userMessage: string,
    persona: string,
    dialect: string
  ): Promise<string> {
    const { output } = await this.ai.generate({
      prompt: this.buildUserPerspectivePrompt(ctaText, userMessage, persona, dialect),
      output: { schema: UserPerspectiveMetadataSchema },
      config: { temperature: 0 }
    });

    return output?.metadata || `Main ${ctaText.toLowerCase()}, please guide karo`;
  }

  /**
   * Generate greeting response - more casual and relationship-focused
   */
  async generateGreetingResponse(
    message: string,
    profile: UserProfile,
    systemPrompt: string
  ): Promise<ResponseWithCTAs> {
    const { output } = await this.ai.generate({
      prompt: this.buildGreetingPrompt(message, profile, systemPrompt),
      output: {
        schema: z.object({
          messages: z.array(z.string()),
          nextQuestions: z.array(z.object({
            text: z.string(),
            metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
          }))
        })
      },
      config: { temperature: 0 }
    });

    return output || this.getDefaultGreetingResponse();
  }

  /**
   * Generate role discovery response - more gradual and conversational
   */
  async generateRoleDiscoveryResponse(
    message: string,
    profile: UserProfile,
    systemPrompt: string
  ): Promise<ResponseWithCTAs> {
    const { output } = await this.ai.generate({
      prompt: this.buildRoleDiscoveryPrompt(message, profile, systemPrompt),
      output: {
        schema: z.object({
          messages: z.array(z.string()),
          nextQuestions: z.array(z.object({
            text: z.string(),
            metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
          }))
        })
      },
      config: { temperature: 0 }
    });

    return output || this.getDefaultRoleDiscoveryResponse();
  }

  /**
   * Generate goals discovery response - more gradual approach
   */
  async generateGoalsDiscoveryResponse(
    message: string,
    profile: UserProfile,
    systemPrompt: string
  ): Promise<ResponseWithCTAs> {
    const { output } = await this.ai.generate({
      prompt: this.buildGoalsDiscoveryPrompt(message, profile, systemPrompt),
      output: {
        schema: z.object({
          messages: z.array(z.string()),
          nextQuestions: z.array(z.object({
            text: z.string(),
            metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
          }))
        })
      },
      config: { temperature: 0 }
    });

    return output || this.getDefaultGoalsDiscoveryResponse();
  }

  /**
   * Generate recommendation response
   */
  async generateRecommendationResponse(
    message: string,
    profile: UserProfile,
    systemPrompt: string
  ): Promise<ResponseWithCTAs> {
    const { output } = await this.ai.generate({
      prompt: this.buildRecommendationPrompt(message, profile, systemPrompt),
      output: {
        schema: z.object({
          messages: z.array(z.string()),
          nextQuestions: z.array(z.object({
            text: z.string(),
            metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
          }))
        })
      },
      config: { temperature: 0 }
    });

    return output || this.getDefaultRecommendationResponse();
  }

  /**
   * Generate ongoing support response
   */
  async generateOngoingSupportResponse(
    message: string,
    profile: UserProfile,
    systemPrompt: string
  ): Promise<ResponseWithCTAs> {
    const { output } = await this.ai.generate({
      prompt: this.buildOngoingSupportPrompt(message, profile, systemPrompt),
      output: {
        schema: z.object({
          messages: z.array(z.string()),
          nextQuestions: z.array(z.object({
            text: z.string(),
            metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
          }))
        })
      },
      config: { temperature: 0 }
    });

    return output || this.getDefaultOngoingSupportResponse();
  }

  /**
   * Generate general response
   */
  async generateGeneralResponse(
    message: string,
    profile: UserProfile,
    systemPrompt: string
  ): Promise<ResponseWithCTAs> {
    const { output } = await this.ai.generate({
      prompt: this.buildGeneralPrompt(message, profile, systemPrompt),
      output: {
        schema: z.object({
          messages: z.array(z.string()),
          nextQuestions: z.array(z.object({
            text: z.string(),
            metadata: z.string().describe('What user would actually type in their dialect, e.g., "Main HTML seekhna chahta hun, please guide karo"')
          }))
        })
      },
      config: { temperature: 0 }
    });

    return output || this.getDefaultGeneralResponse();
  }

  // Private methods for building prompts

  private buildUserPerspectivePrompt(ctaText: string, userMessage: string, persona: string, dialect: string): string {
    return `You are generating metadata for a CTA button that a user clicked.

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

Return only the metadata text, nothing else.`;
  }

  private buildGreetingPrompt(message: string, profile: UserProfile, systemPrompt: string): string {
    return `${systemPrompt}

Respond to this greeting: "${message}"

User's detected persona: ${profile.persona || 'student'}
User's detected dialect: ${profile.dialect || 'hinglish'}

Generate MAX 2 short messages (MAX 12 words each) that:
1. Welcome them warmly and casually in their dialect
2. Show genuine interest in them as a person
3. Keep it conversational and friendly, not interrogative
4. Don't immediately ask about goals or career - just be friendly
5. Let them share what they want to share naturally

Then generate 3 casual, friendly next steps that represent:
- TEXT FIELD: What the user wants to say next - their intention/desire
- METADATA FIELD: What the user would actually type in their dialect

Focus on casual conversation topics, not formal learning questions.

Return as JSON with messages array and nextQuestions array with text and metadata fields.`;
  }

  private buildRoleDiscoveryPrompt(message: string, profile: UserProfile, systemPrompt: string): string {
    return `${systemPrompt}

The user said: "${message}"

Based on this message, continue the conversation naturally. Generate MAX 2 short messages (MAX 12 words each) that:
1. Show interest in what they've shared
2. Ask follow-up questions naturally, not like an interview
3. Keep it conversational and encouraging
4. Don't rush into formal questions about their role

Then generate 3 contextual next steps that feel natural:
- TEXT FIELD: What the user wants to say next - their intention/desire
- METADATA FIELD: What the user would actually type in their dialect

Return as JSON with messages array and nextQuestions array with text and metadata fields.`;
  }

  private buildGoalsDiscoveryPrompt(message: string, profile: UserProfile, systemPrompt: string): string {
    return `${systemPrompt}

The user said: "${message}"

Their current role: ${profile.currentRole || 'Not specified'}

Continue the conversation naturally. Generate MAX 2 short messages (MAX 12 words each) that:
1. Show enthusiasm about what they've shared
2. Gently explore what they're interested in learning
3. Don't rush into formal goal-setting questions
4. Keep it conversational and encouraging

Then generate 3 contextual next steps that feel natural:
- TEXT FIELD: What the user wants to say next - their intention/desire
- METADATA FIELD: What the user would actually type in their dialect

Return as JSON with messages array and nextQuestions array with text and metadata fields.`;
  }

  private buildRecommendationPrompt(message: string, profile: UserProfile, systemPrompt: string): string {
    return `${systemPrompt}

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

Return as JSON with messages array and nextQuestions array with text and metadata fields.`;
  }

  private buildOngoingSupportPrompt(message: string, profile: UserProfile, systemPrompt: string): string {
    return `${systemPrompt}

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

Return as JSON with messages array and nextQuestions array with text and metadata fields.`;
  }

  private buildGeneralPrompt(message: string, profile: UserProfile, systemPrompt: string): string {
    return `${systemPrompt}

The user said: "${message}"

Respond helpfully while trying to learn more about them. Generate MAX 2 short messages (MAX 12 words each) that:
1. Show interest in their current situation
2. Ask what they want to learn
3. Offer help and guidance
4. Keep it conversational and curious

Then generate 3 contextual next steps for general learning:
- TEXT FIELD: What the user wants to say next - their intention/desire
- METADATA FIELD: What the user would actually type in their dialect

Return as JSON with messages array and nextQuestions array with text and metadata fields.`;
  }

  // Default responses as fallbacks

  private getDefaultGreetingResponse(): ResponseWithCTAs {
    return {
      messages: [
        "Namaste! Kaise ho bhai? Main excited hun tumse baat karne ke liye 😊"
      ],
      nextQuestions: [
        { text: "Main apna rasta khud banana chahta hun", metadata: "Main English seekhna chahta hun, please meri help karo" },
        { text: "Main skills develop karna chahta hun", metadata: "Main AI ke bare mein jaanna chahta hun, guide karo" },
        { text: "Main career growth karna chahta hun", metadata: "Main digital marketing seekhna chahta hun, course suggest karo" }
      ]
    };
  }

  private getDefaultRoleDiscoveryResponse(): ResponseWithCTAs {
    return {
      messages: [
        "Interesting bhai! Tell me more about yourself 😊"
      ],
      nextQuestions: [
        { text: "Main career growth karna chahta hun", metadata: "Main career growth ke liye skills seekhna chahta hun, please guide karo" },
        { text: "Main industry-specific course karna chahta hun", metadata: "Main industry-specific course karna chahta hun, suggest karo" },
        { text: "Main leadership skills develop karna chahta hun", metadata: "Main leadership skills develop karna chahta hun, help karo" }
      ]
    };
  }

  private getDefaultGoalsDiscoveryResponse(): ResponseWithCTAs {
    return {
      messages: [
        "Great bhai! What interests you most? 😊"
      ],
      nextQuestions: [
        { text: "Main technical skills develop karna chahta hun", metadata: "Main technical skills develop karna chahta hun, please meri help karo" },
        { text: "Main soft skills improve karna chahta hun", metadata: "Main soft skills improve karna chahta hun, guide karo" },
        { text: "Main certification course karna chahta hun", metadata: "Main certification course karna chahta hun, suggest karo" }
      ]
    };
  }

  private getDefaultRecommendationResponse(): ResponseWithCTAs {
    return {
      messages: [
        "Excellent bhai! Ab maine tumhare goals aur background ko samajh liya hai ⭐",
        "Main excited hun tumhare liye personalized learning path banane mein 🚀"
      ],
      nextQuestions: [
        { text: "Main course recommendations dekhna chahta hun", metadata: "Main course recommendations dekhna chahta hun, please suggest karo" },
        { text: "Main learning timeline banane chahta hun", metadata: "Main learning timeline banane chahta hun, help karo" },
        { text: "Main progress tracking setup karna chahta hun", metadata: "Main progress tracking setup karna chahta hun, guide karo" }
      ]
    };
  }

  private getDefaultOngoingSupportResponse(): ResponseWithCTAs {
    return {
      messages: [
        "Main yahan hun tumhari learning journey mein support karne ke liye 🤝"
      ],
      nextQuestions: [
        { text: "Main daily practice routine banane chahta hun", metadata: "Main daily practice routine banane chahta hun, please help karo" },
        { text: "Main doubt clearing session karna chahta hun", metadata: "Main doubt clearing session karna chahta hun, guide karo" },
        { text: "Main next milestone set karna chahta hun", metadata: "Main next milestone set karna chahta hun, suggest karo" }
      ]
    };
  }

  private getDefaultGeneralResponse(): ResponseWithCTAs {
    return {
      messages: [
        "Main tumhari help karna chahta hun 🤝"
      ],
      nextQuestions: [
        { text: "Main popular courses explore karna chahta hun", metadata: "Main popular courses explore karna chahta hun, please suggest karo" },
        { text: "Main skill assessment karna chahta hun", metadata: "Main skill assessment karna chahta hun, help karo" },
        { text: "Main learning goals set karna chahta hun", metadata: "Main learning goals set karna chahta hun, guide karo" }
      ]
    };
  }
}
