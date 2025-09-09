CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE admins (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP DEFAULT (now()),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  is_active BOOLEAN,
  last_active_at TIMESTAMP,
  profile_pic TEXT
);

CREATE TABLE admin_configurations (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP DEFAULT (now()),
  created_by BIGINT NOT NULL,
  updated_by BIGINT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL
);

CREATE TABLE admin_activities (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  created_by BIGINT NOT NULL,
  activity_type TEXT NOT NULL,
  value JSONB NOT NULL
);

CREATE INDEX idx_admin_configurations_key ON admin_configurations(key);
CREATE INDEX idx_admin_configurations_value ON admin_configurations(value);
