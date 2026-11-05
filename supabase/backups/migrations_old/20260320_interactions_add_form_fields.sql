-- Add form-specific fields to interactions table
-- Altering the parent partitioned table propagates to all partitions automatically.

-- x and y are NOT NULL for clicks but form events have no coordinates.
-- Make them nullable to support form_fill and form_submit interaction types.
ALTER TABLE "public"."interactions"
  ALTER COLUMN "x" DROP NOT NULL,
  ALTER COLUMN "y" DROP NOT NULL;

-- Form-specific fields
ALTER TABLE "public"."interactions"
  ADD COLUMN IF NOT EXISTS "form_id"      varchar(256),
  ADD COLUMN IF NOT EXISTS "form_name"    varchar(256),
  ADD COLUMN IF NOT EXISTS "form_action"  varchar(2048),
  ADD COLUMN IF NOT EXISTS "form_method"  varchar(4),
  ADD COLUMN IF NOT EXISTS "input_count"  int,
  ADD COLUMN IF NOT EXISTS "filled_count" int,
  ADD COLUMN IF NOT EXISTS "time_on_form" bigint;  -- milliseconds

-- Index for event-rule matching on form interactions
CREATE INDEX IF NOT EXISTS idx_int_org_form_ts
  ON "public"."interactions" ("organization_id", "interaction_type", "timestamp")
  WHERE interaction_type IN ('form_fill', 'form_submit');
