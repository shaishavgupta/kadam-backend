-- Combined Migration: Chat Sessions, AI Preferences, and Data Migration
-- This migration creates chat sessions table, adds AI preferences column, and migrates existing data

-- 1. Create chat_sessions table
CREATE TABLE chat_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id BIGINT,
  title VARCHAR(500),
  state JSONB,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);


-- 2. Add ai_preferences JSONB column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT '{}'::jsonb;
