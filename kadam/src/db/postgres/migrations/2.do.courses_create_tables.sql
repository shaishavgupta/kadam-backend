CREATE TABLE tags (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  name TEXT UNIQUE NOT NULL,
  image_url TEXT NOT NULL,
  priority FLOAT DEFAULT 0
);

CREATE TABLE courses (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  approved_at TIMESTAMP,
  approved_by BIGINT,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN,
  price decimal DEFAULT 0,
  thumbnail_url TEXT,
  certificate_url TEXT NOT NULL,
  priority FLOAT DEFAULT 0,
  rank FLOAT DEFAULT 0,
  rejected_at TIMESTAMP,
  rejected_by BIGINT,
  rejected_reason TEXT,
  published_at TIMESTAMP
);

CREATE TABLE course_categories (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT (now())
);

CREATE TABLE course_tags (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL,
  tag_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT (now())
);

CREATE TABLE course_creators (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP NOT NULL,
  is_active BOOLEAN,
  creator_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL
);

CREATE TABLE modules (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  approved_at TIMESTAMP,
  approved_by BIGINT,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN,
  position INTEGER DEFAULT 0
);

CREATE TABLE contents (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  module_id BIGINT,
  course_id BIGINT NOT NULL,
  content_type TEXT NOT NULL,
  next_content_id BIGINT UNIQUE,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  approved_at TIMESTAMP,
  approved_by BIGINT,
  position INTEGER DEFAULT 0,
  url TEXT,
  duration INTEGER,
  thumbnail_url TEXT,
  category_id BIGINT
);

CREATE TABLE course_vector (
  id BIGSERIAL PRIMARY KEY,
  name vector(1536) UNIQUE NOT NULL,
  description vector(1536) UNIQUE NOT NULL,
  course_id BIGINT UNIQUE NOT NULL
);

CREATE TABLE user_enrollments (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  content_id BIGINT NOT NULL,
  completed_at TIMESTAMP DEFAULT NULL,
  progress FLOAT DEFAULT 0
);

CREATE INDEX idx_user_enrollments_user_id ON user_enrollments(user_id);
