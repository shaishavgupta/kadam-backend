import { sessionStore, chatDatabase, UserState } from '../../infra/session-store';

export interface SessionData {
  state: UserState;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  expertId: number;
}

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

export class SessionManager {
  /**
   * Handle session management - create new or load existing session
   */
  async handleSession(
    userId: string, 
    sessionId?: string, 
    newSession: boolean = false,
    expertId?: number
  ): Promise<{ sessionId: string; sessionData: SessionData }> {
    let finalSessionId = sessionId;
    let sessionData: SessionData | null = null;

    // Validate expertId is provided
    if (!expertId) {
      throw new Error('Expert ID is required for session management');
    }

    // Handle session management
    if (newSession || !sessionId) {
      // Create new session
      finalSessionId = `session_${userId}_${expertId}_${Date.now()}`;
      await chatDatabase.createSession(finalSessionId, userId, 'New Chat', expertId);
      
      // Initialize session data
      sessionData = {
        state: {
          userId,
          userName: userId, // You might want to fetch actual user name
        } as UserState,
        messages: [],
        expertId
      };
    } else {
      // Load existing session
      sessionData = await sessionStore.get(finalSessionId!) as SessionData | null;
      if (!sessionData) {
        // Session not found, create new one
        finalSessionId = `session_${userId}_${expertId}_${Date.now()}`;
        await chatDatabase.createSession(finalSessionId, userId, 'New Chat', expertId);
        sessionData = {
          state: {
            userId,
            userName: userId,
          } as UserState,
          messages: [],
          expertId
        };
      } else {
        // Verify session belongs to the correct expert
        if (sessionData.expertId !== expertId) {
          // Create new session for different expert
          finalSessionId = `session_${userId}_${expertId}_${Date.now()}`;
          await chatDatabase.createSession(finalSessionId, userId, 'New Chat', expertId);
          sessionData = {
            state: {
              userId,
              userName: userId,
            } as UserState,
            messages: [],
            expertId
          };
        }
      }
    }

    return { sessionId: finalSessionId!, sessionData };
  }

  /**
   * Get user profile from user table
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    return await chatDatabase.getUserProfile(userId);
  }

  /**
   * Update user profile in user table
   */
  async updateUserProfile(userId: string, updatedProfile: UserProfile): Promise<void> {
    await chatDatabase.updateUserProfile(userId, updatedProfile);
  }

  /**
   * Merge user profile in user table
   */
  async mergeUserProfile(userId: string, profileUpdate: Partial<UserProfile>): Promise<void> {
    await chatDatabase.mergeUserProfile(userId, profileUpdate);
  }

  /**
   * Add message to session history
   */
  addMessageToSession(sessionData: SessionData, role: 'user' | 'assistant', content: string): void {
    sessionData.messages.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Save session data
   */
  async saveSession(sessionId: string, sessionData: SessionData): Promise<void> {
    await sessionStore.save(sessionId, sessionData);
  }


  /**
   * Clean up old sessions (optional utility method)
   */
  async cleanupOldSessions(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    // This would need to be implemented based on your session store implementation
    // For now, it's a placeholder
    console.log('Session cleanup not implemented yet');
  }

  /**
   * Export session data for backup
   */
  exportSessionData(sessionId: string): Promise<SessionData | null> {
    return sessionStore.get(sessionId) as Promise<SessionData | null>;
  }

  /**
   * Import session data from backup
   */
  async importSessionData(sessionId: string, sessionData: SessionData): Promise<void> {
    await sessionStore.save(sessionId, sessionData);
  }
}
