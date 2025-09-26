-- Create enums for qualification and achievement types
CREATE TYPE qualification_types AS ENUM (
  'degree',
  'diploma',
  'certification'
);

CREATE TYPE achievement_types AS ENUM (
  'academic',
  'sports',
  'professional'
);

-- Main creators table
CREATE TABLE creators (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  bio TEXT,
  profile_pic TEXT,
  rating INTEGER CHECK (rating >= 0 AND rating <= 5) NOT NULL DEFAULT 0,
  email TEXT NOT NULL,
  phone_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
);

-- Qualifications table
CREATE TABLE qualifications (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  qualification_type qualification_types NOT NULL,
  start_date DATE,
  end_date DATE,
  grade TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Achievements table
CREATE TABLE achievements (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  title TEXT NOT NULL,
  description TEXT,
  types achievement_types NOT NULL,
  date_achieved DATE NOT NULL
);

-- Junction table for creator-achievement relationship
CREATE TABLE creator_achievements (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  achievement_id BIGINT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  creator_id BIGINT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  UNIQUE(achievement_id, creator_id)
);

-- Junction table for creator-qualification relationship
CREATE TABLE creator_qualifications (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  qualification_id BIGINT NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
  creator_id BIGINT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  UNIQUE(qualification_id, creator_id)
);

-- Create indexes for better performance
CREATE INDEX idx_creators_name ON creators(name);
CREATE INDEX idx_creators_rating ON creators(rating);
CREATE INDEX idx_qualifications_type ON qualifications(qualification_type);
CREATE INDEX idx_achievements_type ON achievements(types);
CREATE INDEX idx_creator_achievements_creator_id ON creator_achievements(creator_id);
CREATE INDEX idx_creator_qualifications_creator_id ON creator_qualifications(creator_id);
