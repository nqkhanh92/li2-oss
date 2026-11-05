-- Add default_currency column to organizations table
-- Supports: USD (US Dollar), VND (Vietnamese Dong)
-- Default: USD

-- Add column (nullable for backward compatibility with existing organizations)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'USD';

-- Add constraint to ensure only supported currencies
ALTER TABLE organizations
ADD CONSTRAINT organizations_default_currency_check
CHECK (default_currency IS NULL OR default_currency IN ('USD', 'VND'));

-- Add comment for documentation
COMMENT ON COLUMN organizations.default_currency IS 'Default currency for conversion tracking. Used when sale events do not specify currency. Supported: USD, VND';
