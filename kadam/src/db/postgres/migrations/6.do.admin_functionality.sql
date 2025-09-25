-- Migration 006: Add admin functionality for content management and authentication

-- Add missing columns to contents table for video rejection tracking
ALTER TABLE contents ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP NULL;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS rejected_by BIGINT NULL;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL;


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
LEFT JOIN admins a ON c.rejected_by = a.id
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

-- Add trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to admins if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_admins_updated_at') THEN
        CREATE TRIGGER update_admins_updated_at
        BEFORE UPDATE ON admins
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
