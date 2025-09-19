CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email text UNIQUE,
  name text,
  phone text UNIQUE NOT NULL,
  avatar_url TEXT,
  preferred_language text NOT NULL DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  last_active_at TIMESTAMP DEFAULT NULL,
  paid_at TIMESTAMP DEFAULT NULL,
  dob DATE DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  gender TEXT DEFAULT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  whatsapp_allowed BOOLEAN DEFAULT FALSE,
  plan_type text NOT NULL DEFAULT 'free'
);

CREATE TABLE user_badges (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  badge_type text NOT NULL,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_enrollments (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  completed_at TIMESTAMP DEFAULT NULL,
  progress FLOAT DEFAULT 0
);

CREATE TABLE user_certificates (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  url TEXT UNIQUE NOT NULL
);

CREATE TABLE user_quiz_attempts (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT (now()),
  updated_at TIMESTAMP NOT NULL,
  user_id BIGINT NOT NULL,
  content_id BIGINT NOT NULL
);

-- Create indexes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_enrollments_user_id ON user_enrollments(user_id);
CREATE INDEX idx_user_certificates_user_id ON user_certificates(user_id);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_quiz_attempts_user_id ON user_quiz_attempts(user_id);
