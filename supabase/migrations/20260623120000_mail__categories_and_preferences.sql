ALTER TABLE mail_template
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS respect_preference BOOLEAN;

CREATE TABLE IF NOT EXISTS user_email_preference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  categories JSONB DEFAULT '{"system": true, "security": true, "analytics": true}'::jsonb,
  unsubscribe_token VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
