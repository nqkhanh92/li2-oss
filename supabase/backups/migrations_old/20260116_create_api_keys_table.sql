-- Migration: Create API Keys table and update org_members
-- Description: Add API key management with bot user support

-- Create enum for API key type
DO $$ BEGIN
  CREATE TYPE api_key_type AS ENUM ('user', 'bot');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add is_bot field to org_members table
ALTER TABLE org_members 
ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

-- Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Basic info
  name TEXT NOT NULL,
  key_type api_key_type NOT NULL DEFAULT 'user',
  
  -- The actual API key (hashed)
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  key_suffix TEXT NOT NULL,
  salt TEXT NOT NULL,

  -- Relations
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Only for bot type
  
  -- Permissions stored as JSONB array of permission keys
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT api_keys_name_org_unique UNIQUE(organization_id, name)
);

-- Indexes for api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_bot_user_id ON api_keys(bot_user_id) WHERE bot_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();


-- Update comment to reflect new structure
COMMENT ON COLUMN api_keys.key_prefix IS 'First N characters of the API key for lookup (e.g., "qk_abcd")';
COMMENT ON COLUMN api_keys.key_suffix IS 'Last N characters of the API key for lookup (e.g., "wxyz")';
COMMENT ON COLUMN api_keys.salt IS 'Random salt used for hashing the API key';
COMMENT ON COLUMN api_keys.key_hash IS 'Salted hash of the API key for verification';

-- Create index on prefix and suffix for faster lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_suffix ON api_keys(key_suffix);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix_suffix ON api_keys(key_prefix, key_suffix);

  