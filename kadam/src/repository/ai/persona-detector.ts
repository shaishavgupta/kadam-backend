import { z } from 'genkit';
import { PersonaDetectionSchema } from './schemas';

// Cache for persona and dialect detection
const detectionCache = new Map<string, { persona: string; dialect: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export interface PersonaDetectionResult {
  persona: string;
  dialect: string;
}

export class PersonaDetector {
  constructor(private ai: any) {}

  /**
   * Detect user persona and dialect based on their profile and message
   */
  async detectPersonaAndDialect(
    userProfile: any, 
    message: string, 
    userId: string
  ): Promise<PersonaDetectionResult> {
    // Check cache first
    const cacheKey = `${userId}-${message.substring(0, 50)}`;
    const cached = detectionCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return { persona: cached.persona, dialect: cached.dialect };
    }

    try {
      const { output } = await this.ai.generate({
        prompt: this.buildDetectionPrompt(userProfile, message),
        output: {
          schema: PersonaDetectionSchema
        },
      });

      const result = {
        persona: output?.persona || 'unknown',
        dialect: output?.dialect || 'unknown'
      };

      // Cache the result
      detectionCache.set(cacheKey, {
        ...result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Error in LLM-based detection:', error);
      // Fallback to unknown when detection fails
      const fallback = { persona: 'unknown', dialect: 'unknown' };
      detectionCache.set(cacheKey, {
        ...fallback,
        timestamp: Date.now()
      });
      return fallback;
    }
  }

  /**
   * Build the detection prompt for LLM
   */
  private buildDetectionPrompt(userProfile: any, message: string): string {
    return `Analyze this user message and profile to detect their persona and dialect:

User Profile: ${JSON.stringify(userProfile)}
User Message: "${message}"

Detect:
1. PERSONA: Based on their role, goals, and communication style, classify them as one of:
   - student: College students, recent graduates, those preparing for placements
   - jobbie: Early professionals (0-3 years), career switchers, upskillers
   - dylan: Entrepreneurs, freelancers, hustlers, startup enthusiasts
   - content_creator: YouTubers, social media creators, influencers
   - unknown: If you cannot determine their persona from the available information

2. DIALECT: Based on their language patterns, classify their regional dialect:
   - hinglish: Hindi + English mix
   - telugu: Telugu words in English letters
   - tamil: Tamil words in English letters
   - bengali: Bengali words in English letters
   - punjabi: Punjabi words in English letters
   - gujarati: Gujarati words in English letters
   - unknown: If you cannot determine their dialect from the available information

IMPORTANT: Only return "unknown" if you genuinely cannot determine the persona or dialect from the available information. Do not use default values.

Return only a JSON object with persona and dialect fields.`;
  }

  /**
   * Clear detection cache for a specific user
   */
  clearUserCache(userId: string): void {
    for (const [key] of detectionCache) {
      if (key.startsWith(`${userId}-`)) {
        detectionCache.delete(key);
      }
    }
  }

  /**
   * Clear all detection cache
   */
  clearAllCache(): void {
    detectionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: detectionCache.size,
      keys: Array.from(detectionCache.keys())
    };
  }
}
