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
  language TEXT NOT NULL,
  price decimal DEFAULT 0,
  thumbnail_url TEXT,
  certificate_id BIGINT,
  priority FLOAT DEFAULT 0,
  rank FLOAT DEFAULT 0,
  rejected_at TIMESTAMP,
  rejected_by BIGINT,
  rejection_reason TEXT
  creator_published_at TIMESTAMP,
  next_course_ids BIGINT[],
);

CREATE TABLE certificates (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP NOT NULL,
  name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE course_categories (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP NOT NULL
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
  course_id BIGINT NOT NULL,
  thumbnail_url TEXT,
  approved_at TIMESTAMP,
  approved_by BIGINT,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN,
  position INTEGER DEFAULT 0,
  rejected_at TIMESTAMP NULL,
  rejected_by BIGINT NULL,
  rejection_reason TEXT NULL
);

CREATE TABLE contents (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  module_id BIGINT,
  content_type TEXT NOT NULL,
  next_content_id BIGINT UNIQUE,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  approved_at TIMESTAMP,
  approved_by BIGINT,
  position INTEGER DEFAULT 0,
  url TEXT,
  abs_url TEXT,
  duration INTEGER,
  thumbnail_url TEXT,
  category_id BIGINT,
  rejected_at TIMESTAMP NULL,
  rejected_by BIGINT NULL,
  rejection_reason TEXT NULL
);

CREATE TABLE vectors (
  id BIGSERIAL PRIMARY KEY,
  string TEXT NOT NULL,
  vector vector(1536) NOT NULL,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('contents', 'courses')),
  source_id BIGINT NOT NULL,
  UNIQUE(source, source_id)
);

