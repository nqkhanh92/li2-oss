-- Fix is_required default to match frontend behavior (optional by default)
-- DB had DEFAULT true but frontend always sends false for new steps — align them.

-- Note by Kei - 18-03-2026: This migration is wrong, is_required should be true by default, we have a fix in the frontend that require first and last step need to be required, the middle steps are optional but default to true.
-- So the correct fix is to set default to true, or ignore this migration.
ALTER TABLE funnel_steps ALTER COLUMN is_required SET DEFAULT false;
