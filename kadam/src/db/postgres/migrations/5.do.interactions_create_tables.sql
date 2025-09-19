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

CREATE TABLE views (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  user_id BIGINT NOT NULL,
  parent_id BIGINT NOT NULL,
  parent_type TEXT NOT NULL,
  duration INTEGER
);

CREATE TABLE ratings (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  user_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  rating float NOT NULL,
  review TEXT
);
