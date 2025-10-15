-- Migration: Create Comprehensive Database Indexes
-- This migration creates all necessary indexes for optimal database performance
-- Organized by table for better maintainability

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

CREATE INDEX IF NOT EXISTS idx_admin_configurations_key ON admin_configurations(key);

CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_id ON admin_activities(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activities_resource ON admin_activities(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_categories_priority ON categories(priority DESC);

CREATE INDEX IF NOT EXISTS idx_courses_language ON courses(language);
CREATE INDEX IF NOT EXISTS idx_courses_active_approved ON courses(is_active, approved_at, rank);
CREATE INDEX IF NOT EXISTS idx_courses_creator_published ON courses(creator_published_at);

CREATE INDEX IF NOT EXISTS idx_course_categories_course_id ON course_categories(course_id);
CREATE INDEX IF NOT EXISTS idx_course_categories_category_id ON course_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_course_creators_creator_id ON course_creators(creator_id);
CREATE INDEX IF NOT EXISTS idx_course_creators_course_id ON course_creators(course_id);

CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_is_active ON modules(is_active);
CREATE INDEX IF NOT EXISTS idx_modules_position ON modules(position);
CREATE INDEX IF NOT EXISTS idx_modules_approved_at ON modules(approved_at);

CREATE INDEX IF NOT EXISTS idx_contents_module_id ON contents(module_id);
CREATE INDEX IF NOT EXISTS idx_contents_is_active ON contents(is_active);
CREATE INDEX IF NOT EXISTS idx_contents_position ON contents(position);
CREATE INDEX IF NOT EXISTS idx_contents_content_type ON contents(content_type);
CREATE INDEX IF NOT EXISTS idx_contents_approved_at ON contents(approved_at);
CREATE INDEX IF NOT EXISTS idx_contents_category_id ON contents(category_id);

CREATE INDEX IF NOT EXISTS idx_vectors_source ON vectors(source);
CREATE INDEX IF NOT EXISTS idx_vectors_source_id ON vectors(source_id);
CREATE INDEX IF NOT EXISTS idx_vectors_combined_unique ON vectors(source, source_id);
CREATE INDEX IF NOT EXISTS idx_vectors_vector_cosine ON vectors USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_creators_name ON creators(name);
CREATE INDEX IF NOT EXISTS idx_creators_rating ON creators(rating);
CREATE INDEX IF NOT EXISTS idx_creators_is_active ON creators(is_active);

CREATE INDEX IF NOT EXISTS idx_qualifications_type ON qualifications(qualification_type);
CREATE INDEX IF NOT EXISTS idx_qualifications_institution ON qualifications(institution);

CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(types);
CREATE INDEX IF NOT EXISTS idx_achievements_date ON achievements(date_achieved DESC);

CREATE INDEX IF NOT EXISTS idx_creator_achievements_creator_id ON creator_achievements(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_achievements_achievement_id ON creator_achievements(achievement_id);

CREATE INDEX IF NOT EXISTS idx_creator_qualifications_creator_id ON creator_qualifications(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_qualifications_qualification_id ON creator_qualifications(qualification_id);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_plan_type ON users(plan_type);
CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_ai_preferences ON users USING GIN (ai_preferences);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_type ON user_badges(badge_type);

CREATE INDEX IF NOT EXISTS idx_user_certificates_user_id ON user_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_certificates_course_id ON user_certificates(course_id);

CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user_id ON user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_content_id ON user_quiz_attempts(content_id);

CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_parent ON likes(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_likes_is_active ON likes(is_active);

CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_is_active ON comments(is_active);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_parent ON shares(parent_type, parent_id);

CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
CREATE INDEX IF NOT EXISTS idx_saves_parent ON saves(parent_type, parent_id);

CREATE INDEX IF NOT EXISTS idx_user_enrollments_user_id ON user_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_course_id ON user_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_progress ON user_enrollments(progress);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_completed_at ON user_enrollments(completed_at);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);


CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_is_active ON groups(is_active);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);
CREATE INDEX IF NOT EXISTS idx_group_members_is_online ON group_members(is_online);
CREATE INDEX IF NOT EXISTS idx_group_members_joined_at ON group_members(joined_at);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_message_type ON group_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_is_deleted ON group_messages(is_deleted);


CREATE INDEX IF NOT EXISTS idx_paths_is_active ON paths(is_active);
CREATE INDEX IF NOT EXISTS idx_paths_created_at ON paths(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_enrolled_paths_user_id ON user_enrolled_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enrolled_paths_path_id ON user_enrolled_paths(path_id);
CREATE INDEX IF NOT EXISTS idx_user_enrolled_paths_is_active ON user_enrolled_paths(is_active);
