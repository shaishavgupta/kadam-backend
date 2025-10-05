-- Combined Migration: Chat Sessions, AI Preferences, and Data Migration
-- This migration creates chat sessions table, adds AI preferences column, and migrates existing data

-- 1. Create chat_sessions table
CREATE TABLE chat_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  state JSONB,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance on chat_sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON chat_sessions(created_at DESC);

-- 2. Add ai_preferences JSONB column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT '{}'::jsonb;

-- Create index for better performance on ai_preferences queries
CREATE INDEX IF NOT EXISTS idx_users_ai_preferences ON users USING GIN (ai_preferences);

-- Add comment to document the column
COMMENT ON COLUMN users.ai_preferences IS 'AI preferences and profile data stored as JSONB';