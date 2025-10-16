-- 1. Create experts table
CREATE TABLE IF NOT EXISTS experts (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(200),
  description TEXT,
  avatar_url VARCHAR(500),
  prompt_function_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  actions JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_experts_is_active ON experts(is_active);
CREATE INDEX IF NOT EXISTS idx_experts_tags ON experts USING GIN (tags);

-- Insert initial experts with comprehensive data
INSERT INTO experts (name, title, description, prompt_function_name, actions, tags) VALUES
('Disha', 'Career Guidance Expert',
 'Your dedicated career guidance expert specializing in personal development, daily routine optimization, habit building, and professional counseling. Disha helps you create structured learning paths, build productive habits, and achieve your career goals through personalized guidance and actionable strategies.',
 'generateDishaPrompt',
 '[
   {
     "icon": "school_outlined",
     "label": "Career Guidance",
     "prompt": "Career Guidance for me"
   },
   {
     "icon": "schedule_outlined",
     "label": "Daily Routine",
     "prompt": "Help me create a daily routine"
   },
   {
     "icon": "psychology_outlined",
     "label": "Habit Building",
     "prompt": "Help me build better habits"
   }
 ]'::jsonb,
 ARRAY['career', 'guidance', 'habits', 'routine', 'counseling', 'personal-development', 'goal-setting']),


('Mittal Sir', 'Business Mentor',
 'Your experienced business mentor and strategic advisor specializing in entrepreneurship, market research, business model development, and growth strategies. Mittal Sir provides comprehensive guidance on starting businesses, analyzing markets, developing business plans, and scaling operations for sustainable success.',
 'generateVivekPrompt',
 '[
   {
     "icon": "lightbulb_outline",
     "label": "Research a business idea",
     "prompt": "Research a business idea for me"
   },
   {
     "icon": "analytics_outlined",
     "label": "Market Analysis",
     "prompt": "Help me analyze the market"
   },
   {
     "icon": "trending_up_outlined",
     "label": "Growth Strategy",
     "prompt": "Create a growth strategy"
   }
 ]'::jsonb,
 ARRAY['business', 'entrepreneurship', 'market-research', 'strategy', 'startup', 'growth', 'business-planning', 'investment']),

('Aisha', 'AI Specialist',
 'Your AI and automation specialist who helps you leverage cutting-edge artificial intelligence tools, automation workflows, and smart technologies to enhance productivity and innovation. Aisha provides expert guidance on AI implementation, prompt optimization, workflow automation, and staying ahead of technological trends.',
 'generateAishaPrompt',
 '[
   {
     "icon": "visibility_outlined",
     "label": "Optimise prompt",
     "prompt": "Optimise prompt"
   },
   {
     "icon": "smart_toy_outlined",
     "label": "AI Tools",
     "prompt": "Recommend AI tools for me"
   },
   {
     "icon": "auto_awesome_outlined",
     "label": "Automation Ideas",
     "prompt": "Suggest automation ideas"
   }
 ]'::jsonb,
 ARRAY['ai', 'automation', 'productivity', 'technology', 'prompt-engineering', 'workflow', 'innovation', 'ai-tools']),


('Rohit', 'Social Media Expert',
 'Your social media and content creation specialist who excels in viral content strategies, platform optimization, audience growth, and digital marketing. Rohit provides expert guidance on content planning, social media trends, engagement tactics, and building a strong online presence across all major platforms.',
 'generateRohitPrompt',
 '[
   {
     "icon": "edit_outlined",
     "label": "Write Script",
     "prompt": "Write Script for me"
   },
   {
     "icon": "trending_up_outlined",
     "label": "Content Strategy",
     "prompt": "Create a content strategy for me"
   },
   {
     "icon": "share_outlined",
     "label": "Social Media Tips",
     "prompt": "Give me social media tips"
   }
 ]'::jsonb,
 ARRAY['social-media', 'content-creation', 'marketing', 'viral-content', 'audience-growth', 'digital-strategy', 'platform-optimization']);

-- 2. Update chat_sessions table to include expert_id
ALTER TABLE chat_sessions ALTER COLUMN expert_id TYPE bigint USING expert_id::bigint;

-- Add foreign key constraint
ALTER TABLE chat_sessions
ALTER COLUMN expert_id TYPE bigint USING expert_id::bigint;

ALTER TABLE chat_sessions
ADD CONSTRAINT fk_chat_sessions_expert_id
FOREIGN KEY (expert_id) REFERENCES experts(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expert_id ON chat_sessions(expert_id);

-- Now make the column NOT NULL
ALTER TABLE chat_sessions ALTER COLUMN expert_id SET NOT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN chat_sessions.expert_id IS 'Expert ID for this chat session - determines AI personality and behavior';
COMMENT ON COLUMN experts.actions IS 'JSON array of quick actions available for this expert';
COMMENT ON COLUMN experts.tags IS 'Array of tags/categories for expert specialization and filtering';
