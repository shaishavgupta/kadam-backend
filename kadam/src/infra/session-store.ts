import { Pool } from 'pg';
import { cache } from '../infra/cache';
import { db } from '../infra/db';
import { UserRepository } from '../repository/users.repository';

// User state interface for session management
export interface UserState {
  userId: string;
  userName: string;
}

// Session data interface
export interface SessionData<S = UserState> {
  state: S;
  messages: any[];
}

// Session store interface
export interface SessionStore<S = UserState> {
  get(sessionId: string): Promise<SessionData<S> | undefined>;
  save(sessionId: string, sessionData: SessionData<S>): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

// Custom SessionStore implementation with PostgreSQL and Redis
export class PostgresRedisSessionStore<S = UserState> implements SessionStore<S> {
  constructor(
    private pool: Pool,
    private redis: typeof cache,
  ) {}

  async get(sessionId: string): Promise<SessionData<S> | undefined> {
    // Try Redis cache first
    const cacheKey = `session:${sessionId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Fallback to PostgreSQL
    const result = await this.pool.query(
      'SELECT state, messages FROM chat_sessions WHERE session_id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    const sessionData: SessionData<S> = {
      state: result.rows[0].state,
      messages: result.rows[0].messages,
    };

    // Cache for 5 minutes
    await this.redis.set(cacheKey, sessionData, 300);

    return sessionData;
  }

  async save(sessionId: string, sessionData: SessionData<S>): Promise<void> {
    // Save to PostgreSQL
    await this.pool.query(
      `INSERT INTO chat_sessions (session_id, state, messages, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (session_id) 
       DO UPDATE SET 
         state = $2,
         messages = $3,
         updated_at = CURRENT_TIMESTAMP`,
      [sessionId, JSON.stringify(sessionData.state), JSON.stringify(sessionData.messages)]
    );

    // Update Redis cache
    const cacheKey = `session:${sessionId}`;
    await this.redis.set(cacheKey, sessionData, 300);
    
    // Invalidate user session list cache if userId exists in state
    if (sessionData.state && (sessionData.state as any).userId) {
      await this.redis.delete(`user_sessions:${(sessionData.state as any).userId}`);
    }
  }

  async delete(sessionId: string): Promise<void> {
    // Get state to invalidate user cache
    const session = await this.get(sessionId);
    
    await this.pool.query(
      'DELETE FROM chat_sessions WHERE session_id = $1',
      [sessionId]
    );
    
    await this.redis.delete(`session:${sessionId}`);
    
    if (session?.state && (session.state as any).userId) {
      await this.redis.delete(`user_sessions:${(session.state as any).userId}`);
    }
  }
}

// Database helper functions for chat sessions
export class ChatDatabase {
  private userRepository: UserRepository;

  constructor(
    private pool: Pool,
    private redis: typeof cache,
  ) {
    this.userRepository = new UserRepository();
  }

  async getOrCreateUser(userId: string): Promise<string> {
    // Check if user exists in our users table
    const result = await this.pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return userId;
  }

  async getUserSessions(userId: string) {
    const cacheKey = `user_sessions:${userId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await this.pool.query(
      `SELECT session_id, title, created_at, updated_at 
       FROM chat_sessions 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [userId]
    );

    const sessions = result.rows;
    await this.redis.set(cacheKey, sessions, 300);
    return sessions;
  }

  async linkSessionToUser(sessionId: string, userId: string, title?: string) {
    await this.pool.query(
      `UPDATE chat_sessions 
       SET user_id = $1, title = COALESCE($2, title)
       WHERE session_id = $3`,
      [userId, title, sessionId]
    );
    
    await this.redis.delete(`user_sessions:${userId}`);
  }

  async updateSessionTitle(sessionId: string, title: string) {
    await this.pool.query(
      'UPDATE chat_sessions SET title = $1 WHERE session_id = $2',
      [title, sessionId]
    );
  }

  async getSessionMessages(sessionId: string, limit?: number) {
    const result = await this.pool.query(
      'SELECT messages FROM chat_sessions WHERE session_id = $1',
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return [];
    }
    
    const messages = result.rows[0].messages;
    
    // If limit is specified, return only the last N messages
    if (limit && limit > 0) {
      return messages.slice(-limit);
    }
    
    return messages;
  }

  async createSession(sessionId: string, userId: string, title?: string) {
    await this.pool.query(
      `INSERT INTO chat_sessions (session_id, user_id, title, state, messages, created_at, updated_at)
       VALUES ($1, $2, $3, '{}', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [sessionId, userId, title || 'New Chat']
    );
    
    // Invalidate user session list cache
    await this.redis.delete(`user_sessions:${userId}`);
  }

  async deleteSession(sessionId: string) {
    await this.pool.query(
      'DELETE FROM chat_sessions WHERE session_id = $1',
      [sessionId]
    );
    
    // Also delete from cache
    await this.redis.delete(`session:${sessionId}`);
  }

  async getSessionById(sessionId: string) {
    const result = await this.pool.query(
      'SELECT * FROM chat_sessions WHERE session_id = $1',
      [sessionId]
    );
    
    return result.rows[0] || null;
  }

  // User Profile Management Methods
  
  async getUserProfile(userId: string) {
    const cacheKey = `user_profile:${userId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Get user basic information and preferences from users table
    const user = await this.userRepository.findUserById(parseInt(userId));
    if (!user) {
      return {};
    }

    // Combine basic user info with AI preferences
    const profile = {
      name: user.name,
      gender: user.gender,
      dob: user.dob,
      bio: user.bio
    };
    
    await this.redis.set(cacheKey, profile, 300);
    return profile;
  }

  async updateUserProfile(userId: string, profile: any) {
    const cacheKey = `user_profile:${userId}`;
    
    // Update user preferences in users table
    await this.userRepository.updateUserPreferences(parseInt(userId), profile);
    
    // Update cache
    await this.redis.set(cacheKey, profile, 300);
    
    // Invalidate user session list cache
    await this.redis.delete(`user_sessions:${userId}`);
  }

  async mergeUserProfile(userId: string, profile: any) {
    const cacheKey = `user_profile:${userId}`;
    
    // Merge user preferences in users table
    await this.userRepository.mergeUserPreferences(parseInt(userId), profile);
    
    // Get updated profile and update cache
    const updatedProfile = await this.userRepository.getUserPreferences(parseInt(userId));
    await this.redis.set(cacheKey, updatedProfile || {}, 300);
    
    // Invalidate user session list cache
    await this.redis.delete(`user_sessions:${userId}`);
  }

  async clearUserProfile(userId: string) {
    const cacheKey = `user_profile:${userId}`;
    
    // Clear user preferences in users table
    await this.userRepository.clearUserPreferences(parseInt(userId));
    
    // Clear cache
    await this.redis.delete(cacheKey);
    await this.redis.delete(`user_sessions:${userId}`);
  }

  async getAllUserProfiles() {
    const result = await this.pool.query(
      `SELECT id as user_id, ai_preferences as profile
       FROM users 
       WHERE ai_preferences IS NOT NULL 
       AND ai_preferences != '{}'::jsonb`
    );
    
    const profiles: Record<string, any> = {};
    result.rows.forEach(row => {
      if (row.profile) {
        profiles[row.user_id] = row.profile;
      }
    });
    
    return profiles;
  }

  async getUserProfileStats() {
    const result = await this.pool.query(
      `SELECT COUNT(*) as total_users,
              COUNT(CASE WHEN ai_preferences IS NOT NULL AND ai_preferences != '{}'::jsonb THEN 1 END) as total_users_with_profiles
       FROM users`
    );
    
    return result.rows[0];
  }
}

// Create instances
export const sessionStore = new PostgresRedisSessionStore<UserState>(db as any, cache);
export const chatDatabase = new ChatDatabase(db as any, cache);
