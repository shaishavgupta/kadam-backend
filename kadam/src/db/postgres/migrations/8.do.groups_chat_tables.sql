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
  created_by BIGINT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Group members table
CREATE TABLE group_members (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  group_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
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
  group_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  audio_duration INTEGER, -- Duration in seconds
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by BIGINT
);

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
