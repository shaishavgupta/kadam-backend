CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE admins (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP DEFAULT (now()),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
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
  admin_id BIGINT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id BIGINT NOT NULL,
  details JSONB NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL
);
