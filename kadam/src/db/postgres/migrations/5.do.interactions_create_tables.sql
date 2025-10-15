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

CREATE TABLE user_enrolled_paths (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP NOT NULL,
  user_id BIGINT NOT NULL,
  path_id BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id, path_id)
);

