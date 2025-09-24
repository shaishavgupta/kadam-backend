-- Manual setup script for admin functionality (for testing)
-- Run this script manually in your database to add admin functionality

-- Add missing columns to contents table for video rejection tracking
ALTER TABLE contents ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP NULL;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS rejected_by BIGINT NULL;  
ALTER TABLE contents ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL;

-- Create admin tokens table for authentication
CREATE TABLE IF NOT EXISTS admin_tokens (
    id BIGSERIAL PRIMARY KEY,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin', -- 'admin' or 'super_admin'
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for admin_tokens
CREATE INDEX IF NOT EXISTS idx_admin_tokens_hash ON admin_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_tokens_email ON admin_tokens(email);
CREATE INDEX IF NOT EXISTS idx_admin_tokens_is_active ON admin_tokens(is_active);

-- Insert a default admin token (you should change this in production)
-- Token: 'admin-access-token-2024' (hashed)
INSERT INTO admin_tokens (token_hash, email, role, is_active) 
VALUES (
    'b8c6b8c6c5f3d5e8a9b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6', -- hash of 'admin-access-token-2024'
    'admin@kadam.com',
    'super_admin',
    true
) ON CONFLICT (token_hash) DO NOTHING;

-- Create admin activity log table for audit trail
CREATE TABLE IF NOT EXISTS admin_activities (
    id BIGSERIAL PRIMARY KEY,
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'course_approved', 'course_rejected', 'video_deleted', etc.
    resource_type VARCHAR(50) NOT NULL, -- 'course', 'content', 'user', etc.
    resource_id BIGINT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for admin_activities
CREATE INDEX IF NOT EXISTS idx_admin_activities_email ON admin_activities(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_activities_action ON admin_activities(action);
CREATE INDEX IF NOT EXISTS idx_admin_activities_resource ON admin_activities(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at);

-- Create indexes for performance on courses and contents
CREATE INDEX IF NOT EXISTS idx_courses_approved_at ON courses(approved_at);
CREATE INDEX IF NOT EXISTS idx_courses_approved_by ON courses(approved_by);
CREATE INDEX IF NOT EXISTS idx_courses_rejected_at ON courses(rejected_at);
CREATE INDEX IF NOT EXISTS idx_courses_rejected_by ON courses(rejected_by);
CREATE INDEX IF NOT EXISTS idx_courses_approval_status ON courses(published_at, rejected_at);

CREATE INDEX IF NOT EXISTS idx_contents_rejected_at ON contents(rejected_at);
CREATE INDEX IF NOT EXISTS idx_contents_rejected_by ON contents(rejected_by);
CREATE INDEX IF NOT EXISTS idx_contents_title ON contents(title);

-- Create useful views for admin functionality

-- View for unapproved courses
CREATE OR REPLACE VIEW unapproved_courses AS
SELECT 
    c.id,
    c.name,
    c.description,
    c.is_paid,
    c.price,
    c.thumbnail_url,
    c.created_at,
    c.updated_at,
    cat.name as category_name,
    cat.id as category_id,
    cr.name as creator_name,
    cr.id as creator_id,
    COUNT(cont.id) as video_count,
    SUM(CASE WHEN cont.duration IS NOT NULL THEN cont.duration ELSE 0 END) as total_duration
FROM courses c
LEFT JOIN course_categories cc ON c.id = cc.course_id
LEFT JOIN categories cat ON cc.category_id = cat.id
LEFT JOIN course_creators crc ON c.id = crc.course_id
LEFT JOIN creators cr ON crc.creator_id = cr.id
LEFT JOIN contents cont ON c.id = cont.course_id AND cont.is_active = true
WHERE c.published_at IS NULL 
  AND c.rejected_at IS NULL
  AND c.is_active = true
GROUP BY c.id, c.name, c.description, c.is_paid, c.price, c.thumbnail_url, 
         c.created_at, c.updated_at, cat.name, cat.id, cr.name, cr.id
ORDER BY c.created_at DESC;

-- View for rejected videos with course information
CREATE OR REPLACE VIEW rejected_videos AS
SELECT 
    c.id,
    c.title,
    c.url,
    c.course_id,
    co.name as course_name,
    c.rejected_by,
    COALESCE(at.email, 'Unknown Admin') as rejected_by_name,
    c.rejected_at,
    c.rejection_reason,
    c.created_at,
    c.updated_at
FROM contents c
JOIN courses co ON c.course_id = co.id
LEFT JOIN admin_tokens at ON c.rejected_by::text = at.email -- Assuming rejected_by stores email
WHERE c.rejected_at IS NOT NULL
ORDER BY c.rejected_at DESC;

-- View for course approval statistics
CREATE OR REPLACE VIEW course_approval_stats AS
SELECT 
    COUNT(*) as total_courses,
    COUNT(CASE WHEN published_at IS NOT NULL THEN 1 END) as approved_courses,
    COUNT(CASE WHEN rejected_at IS NOT NULL THEN 1 END) as rejected_courses,
    COUNT(CASE WHEN published_at IS NULL AND rejected_at IS NULL THEN 1 END) as pending_courses,
    ROUND(
        COUNT(CASE WHEN published_at IS NOT NULL THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    ) as approval_rate_percentage
FROM courses
WHERE is_active = true;

-- Sample data for testing
-- Insert a test course (unapproved)
INSERT INTO courses (
    name, description, is_paid, price, is_active, 
    thumbnail_url, certificate_url, updated_at
) VALUES (
    'Test Course for Admin Approval',
    'This is a test course to verify admin approval functionality',
    true,
    99.99,
    true,
    'https://example.com/thumbnail.jpg',
    'https://example.com/certificate.pdf',
    NOW()
) ON CONFLICT DO NOTHING;

-- Insert a test category if it doesn't exist
INSERT INTO categories (name, image_url, priority) 
VALUES ('Test Category', 'https://example.com/category.jpg', 1)
ON CONFLICT (name) DO NOTHING;

-- Insert a test creator if it doesn't exist
INSERT INTO creators (name, email, phone, bio, avatar_url, created_at, updated_at) 
VALUES ('Test Creator', 'creator@test.com', '+1234567890', 'Test creator bio', 'https://example.com/avatar.jpg', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE admin_tokens IS 'Stores admin authentication tokens and user information';
COMMENT ON TABLE admin_activities IS 'Audit log for admin actions and activities';