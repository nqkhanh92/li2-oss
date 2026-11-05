-- Migration: Add support for default domains stored in database
-- This migration adds the ability to store system-wide default domains
-- that are available to all organizations without verification

-- Add is_default column to domains table
ALTER TABLE public.domains
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false NOT NULL;

-- Create index for efficient queries on default domains
CREATE INDEX IF NOT EXISTS idx_domains_is_default
ON public.domains(is_default)
WHERE is_default = true;

-- Insert default domains (li2.sh and li2.link)
-- These domains are system-wide and not tied to any organization
-- Using gen_random_uuid() for proper UUID generation
INSERT INTO public.domains (
  id,
  domain,
  name,
  is_default,
  is_verified,
  organization_id,
  user_id,
  txt_name,
  txt_code,
  verified_at,
  created_at
) VALUES
  (
    gen_random_uuid(),
    'li2.sh',
    'li2.sh',
    true,
    true,
    NULL,
    NULL,
    '',
    NULL,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'li2.link',
    'li2.link',
    true,
    true,
    NULL,
    NULL,
    '',
    NULL,
    NOW(),
    NOW()
  )

-- no need for this
-- Only insert if default domains don't already exist
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.domains WHERE is_default = true AND domain IN ('li2.sh', 'li2.link')
-- );

-- -- Add comment to the new column
-- COMMENT ON COLUMN public.domains.is_default IS 'Indicates if this domain is a system-wide default domain available to all organizations';
