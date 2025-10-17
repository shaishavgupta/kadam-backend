-- 1. ADMINS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- 2. ADMIN CONFIGURATIONS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_admin_configurations_key ON admin_configurations(key);

-- 3. ADMIN ACTIVITIES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_id ON admin_activities(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activities_resource ON admin_activities(resource_type, resource_id);

-- 4. CATEGORIES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_categories_priority ON categories(priority DESC);

-- 5. COURSES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_courses_language ON courses(language);
CREATE INDEX IF NOT EXISTS idx_courses_active_approved ON courses(is_active, approved_at, rank);

-- 7. COURSE_CATEGORIES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_course_categories_course_id ON course_categories(course_id);
CREATE INDEX IF NOT EXISTS idx_course_categories_category_id ON course_categories(category_id);

-- 8. COURSE_CREATORS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_course_creators_creator_id ON course_creators(creator_id);
CREATE INDEX IF NOT EXISTS idx_course_creators_course_id ON course_creators(course_id);

-- 9. MODULES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_is_active_approved ON modules(is_active, approved_at);

-- 10. CONTENTS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_contents_module_id ON contents(module_id);
CREATE INDEX IF NOT EXISTS idx_contents_is_active_approved ON contents(is_active, approved_at);
CREATE INDEX IF NOT EXISTS idx_contents_category_id ON contents(category_id);

-- 11. VECTORS TABLE INDEXES (Semantic Search)
CREATE INDEX IF NOT EXISTS idx_vectors_source ON vectors(source);
CREATE INDEX IF NOT EXISTS idx_vectors_source_id ON vectors(source_id);
CREATE INDEX IF NOT EXISTS idx_vectors_combined_unique ON vectors(source, source_id);
CREATE INDEX IF NOT EXISTS idx_vectors_vector_cosine ON vectors USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);

-- 12. CREATORS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_creators_name ON creators(name, is_active);
CREATE INDEX IF NOT EXISTS idx_creators_rating ON creators(rating);

-- 13. QUALIFICATIONS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_qualifications_institution ON qualifications(institution, qualification_type);

-- 14. ACHIEVEMENTS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(types);
CREATE INDEX IF NOT EXISTS idx_achievements_date ON achievements(date_achieved);

-- 15. CREATOR_ACHIEVEMENTS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_creator_achievements_creator_id ON creator_achievements(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_achievements_achievement_id ON creator_achievements(achievement_id);

-- 16. CREATOR_QUALIFICATIONS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_creator_qualifications_creator_id ON creator_qualifications(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_qualifications_qualification_id ON creator_qualifications(qualification_id);

-- 17. USERS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_is_active_plan_type ON users(is_active, plan_type);
CREATE INDEX IF NOT EXISTS idx_users_ai_preferences ON users USING GIN (ai_preferences);

-- 18. USER_BADGES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_type ON user_badges(badge_type);

-- 19. USER_CERTIFICATES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_user_certificates_user_id ON user_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_certificates_course_id ON user_certificates(course_id);

-- 20. USER_QUIZ_ATTEMPTS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user_id ON user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_content_id ON user_quiz_attempts(content_id);

-- 21. LIKES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_parent ON likes(parent_type, parent_id);

-- 22. COMMENTS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- 23. SHARES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_parent ON shares(parent_type, parent_id);

-- 24. SAVES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
CREATE INDEX IF NOT EXISTS idx_saves_parent ON saves(parent_type, parent_id);

-- 25. USER_ENROLLMENTS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_user_enrollments_user_id ON user_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_course_id ON user_enrollments(course_id, progress);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_completed_at ON user_enrollments(completed_at);

-- 26. CHAT_SESSIONS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id, is_active);

-- 27. GROUPS TABLE INDEXES (Additional indexes for groups functionality)
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by, is_active);

-- 28. GROUP_MEMBERS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);
CREATE INDEX IF NOT EXISTS idx_group_members_is_online ON group_members(is_online);
CREATE INDEX IF NOT EXISTS idx_group_members_joined_at ON group_members(joined_at);

-- 29. GROUP_MESSAGES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_message_type ON group_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_group_messages_is_deleted ON group_messages(is_deleted);

-- 30. PATHS TABLE INDEXES (Additional indexes for paths functionality)
CREATE INDEX IF NOT EXISTS idx_paths_is_active ON paths(name, is_active);

-- 31. USER_ENROLLED_PATHS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_user_enrolled_paths_user_id ON user_enrolled_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enrolled_paths_path_id ON user_enrolled_paths(path_id);

-- 32. CHAT_SESSIONS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at);

-- ADMINS
ALTER TABLE admins
  ADD CONSTRAINT uq_admins_email UNIQUE (email),
  ADD CONSTRAINT uq_admins_phone UNIQUE (phone);

-- ADMIN CONFIGURATIONS
ALTER TABLE admin_configurations
  ADD CONSTRAINT uq_admin_configurations_key UNIQUE (key);

-- CATEGORIES
ALTER TABLE categories
  ADD CONSTRAINT uq_categories_name UNIQUE (name);

-- COURSES
ALTER TABLE courses
  ADD CONSTRAINT uq_courses_name_language UNIQUE (name, language);
  -- Reason: Same course name can exist in multiple languages.

-- CERTIFICATES
ALTER TABLE certificates
  ADD CONSTRAINT uq_certificates_name UNIQUE (name);

-- COURSE_CATEGORIES
ALTER TABLE course_categories
  ADD CONSTRAINT uq_course_categories UNIQUE (course_id, category_id);

-- COURSE_CREATORS
ALTER TABLE course_creators
  ADD CONSTRAINT uq_course_creators UNIQUE (creator_id, course_id);

-- MODULES
ALTER TABLE modules
  ADD CONSTRAINT uq_modules_name_course UNIQUE (course_id, name);
  -- Prevent duplicate module names within the same course.

-- CONTENTS
ALTER TABLE contents
  ADD CONSTRAINT uq_contents_module_name UNIQUE (module_id, name);
  -- Each module can’t have two contents with the same name.
  -- next_content_id is already unique in schema.

-- VECTORS
ALTER TABLE vectors
  ADD CONSTRAINT uq_vectors_source_source_id UNIQUE (source, source_id);
  -- Already defined but reaffirming for clarity.

-- CREATORS
ALTER TABLE creators
  ADD CONSTRAINT uq_creators_email UNIQUE (email);
  -- Assume creator emails are unique identifiers.

-- QUALIFICATIONS
ALTER TABLE qualifications
  ADD CONSTRAINT uq_qualifications_name_institution UNIQUE (name, institution, qualification_type);
  -- Same degree/diploma name from same institution shouldn’t repeat.

-- ACHIEVEMENTS
ALTER TABLE achievements
  ADD CONSTRAINT uq_achievements_title_date UNIQUE (title, date_achieved);

-- CREATOR_ACHIEVEMENTS
ALTER TABLE creator_achievements
  ADD CONSTRAINT uq_creator_achievements UNIQUE (achievement_id, creator_id);
  -- Already declared in schema, kept for completeness.

-- CREATOR_QUALIFICATIONS
ALTER TABLE creator_qualifications
  ADD CONSTRAINT uq_creator_qualifications UNIQUE (qualification_id, creator_id);
  -- Already declared, reaffirmed.

-- USERS
ALTER TABLE users
  ADD CONSTRAINT uq_users_phone UNIQUE (phone),
  ADD CONSTRAINT uq_users_email UNIQUE (email);

-- USER_BADGES
ALTER TABLE user_badges
  ADD CONSTRAINT uq_user_badges UNIQUE (user_id, badge_type);

-- USER_CERTIFICATES
ALTER TABLE user_certificates
  ADD CONSTRAINT uq_user_certificates UNIQUE (user_id, course_id);
  -- URL already unique.

-- USER_QUIZ_ATTEMPTS
ALTER TABLE user_quiz_attempts
  ADD CONSTRAINT uq_user_quiz_attempts UNIQUE (user_id, content_id);

-- LIKES
ALTER TABLE likes
  ADD CONSTRAINT uq_likes UNIQUE (user_id, parent_id, parent_type);

-- COMMENTS
-- (No unique constraint, as user can post multiple comments per entity)

-- SHARES
ALTER TABLE shares
  ADD CONSTRAINT uq_shares UNIQUE (user_id, parent_id, parent_type);

-- SAVES
ALTER TABLE saves
  ADD CONSTRAINT uq_saves UNIQUE (user_id, parent_id, parent_type);

-- USER_ENROLLMENTS
ALTER TABLE user_enrollments
  ADD CONSTRAINT uq_user_enrollments UNIQUE (user_id, course_id, module_id, content_id);

-- CHAT_SESSIONS
ALTER TABLE chat_sessions
  ADD CONSTRAINT uq_chat_sessions_user_title UNIQUE (user_id, title);

-- USER_ENROLLED_PATHS
ALTER TABLE user_enrolled_paths
  ADD CONSTRAINT uq_user_enrolled_paths UNIQUE (user_id, path_id);

-- PATHS
ALTER TABLE paths
  ADD CONSTRAINT uq_paths_name UNIQUE (name);
