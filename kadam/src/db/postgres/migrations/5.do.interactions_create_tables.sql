CREATE TABLE likes (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  user_id BIGINT NOT NULL,
  parent_id BIGINT NOT NULL,
  parent_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE comments (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP DEFAULT (now()),
  user_id BIGINT NOT NULL,
  parent_id BIGINT NOT NULL,
  parent_type TEXT NOT NULL,
  is_active BOOLEAN,
  comment_text TEXT NOT NULL
);

CREATE TABLE shares (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  user_id BIGINT NOT NULL,
  parent_id BIGINT NOT NULL,
  parent_type TEXT NOT NULL,
  shared_url TEXT
);

CREATE TABLE saves (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  user_id BIGINT NOT NULL,
  parent_id BIGINT NOT NULL,
  parent_type TEXT NOT NULL
);

CREATE TABLE user_enrollments (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  module_id BIGINT,
  content_id BIGINT,
  progress FLOAT DEFAULT 0,
  completed_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE user_enrolled_paths (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP NOT NULL,
  user_id BIGINT NOT NULL,
  path_id BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id, path_id)
);

