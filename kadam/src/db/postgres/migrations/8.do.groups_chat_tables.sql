-- Migration: Groups Chat Tables
-- This migration creates tables for group chat functionality with PostgreSQL LISTEN/NOTIFY support

-- Create enum for group member roles
CREATE TYPE group_member_role AS ENUM (
  'admin',
  'moderator', 
  'member'
);

-- Create enum for message types
CREATE TYPE message_type AS ENUM (
  'text',
  'audio',
  'file',
  'image'
);

-- Groups table
CREATE TABLE groups (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Group members table
CREATE TABLE group_members (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role group_member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

-- Group messages table
CREATE TABLE group_messages (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type message_type NOT NULL DEFAULT 'text',
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  audio_duration INTEGER, -- Duration in seconds
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_is_active ON groups(is_active);
CREATE INDEX idx_groups_created_at ON groups(created_at DESC);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_role ON group_members(role);
CREATE INDEX idx_group_members_is_online ON group_members(is_online);
CREATE INDEX idx_group_members_joined_at ON group_members(joined_at);

CREATE INDEX idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX idx_group_messages_message_type ON group_messages(message_type);
CREATE INDEX idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX idx_group_messages_is_deleted ON group_messages(is_deleted);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_groups_updated_at();

CREATE OR REPLACE FUNCTION update_group_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_members_updated_at
  BEFORE UPDATE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_group_members_updated_at();

CREATE OR REPLACE FUNCTION update_group_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_messages_updated_at
  BEFORE UPDATE ON group_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_group_messages_updated_at();

-- PostgreSQL LISTEN/NOTIFY trigger for real-time messaging
CREATE OR REPLACE FUNCTION notify_new_group_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'group_chat_' || NEW.group_id,
    json_build_object(
      'message_id', NEW.id,
      'group_id', NEW.group_id,
      'sender_id', NEW.sender_id,
      'message_type', NEW.message_type,
      'content', NEW.content,
      'file_url', NEW.file_url,
      'file_name', NEW.file_name,
      'audio_duration', NEW.audio_duration,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_group_message
  AFTER INSERT ON group_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_group_message();

-- Add comments for documentation
COMMENT ON TABLE groups IS 'Groups for chat functionality, admin-created only';
COMMENT ON TABLE group_members IS 'Membership information for groups with roles';
COMMENT ON TABLE group_messages IS 'Messages within groups with support for text, audio, and file messages';
COMMENT ON COLUMN group_messages.audio_duration IS 'Duration in seconds for audio messages';
COMMENT ON COLUMN group_messages.is_deleted IS 'Soft delete flag for messages';
