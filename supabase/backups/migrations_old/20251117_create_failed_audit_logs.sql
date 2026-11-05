-- Create failed_audit_logs table for storing audit logs that failed to process after max retries
-- This table is populated by li2-worker when audit log processing fails after 3 retry attempts

CREATE TABLE IF NOT EXISTS logs.failed_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Original event data that failed to process
  event_data jsonb NOT NULL,

  -- Error information
  error_message text,

  -- Retry history: array of {attempt: number, timestamp: string, error: string}
  retry_history jsonb,

  -- Auto-retry configuration
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 5,
  next_retry_at timestamptz,
  permanently_failed boolean NOT NULL DEFAULT false,

  -- Timestamps
  failed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for time-based queries (most recent failures first)
CREATE INDEX IF NOT EXISTS failed_audit_logs_failed_at_idx
  ON logs.failed_audit_logs (failed_at DESC);

-- Index for querying by organization (using JSONB field)
CREATE INDEX IF NOT EXISTS failed_audit_logs_organization_idx
  ON logs.failed_audit_logs ((event_data->>'organization_id'));

-- Index for auto-retry queries (find logs ready to retry)
CREATE INDEX IF NOT EXISTS failed_audit_logs_retry_idx
  ON logs.failed_audit_logs (next_retry_at, permanently_failed)
  WHERE permanently_failed = false AND next_retry_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE logs.failed_audit_logs IS 'Stores audit log events that failed to process after maximum retry attempts with auto-retry support';
COMMENT ON COLUMN logs.failed_audit_logs.event_data IS 'Original audit log event payload (OrgAuditLog JSON)';
COMMENT ON COLUMN logs.failed_audit_logs.retry_history IS 'Array of retry attempts with timestamps and error messages';
COMMENT ON COLUMN logs.failed_audit_logs.retry_count IS 'Number of retry attempts made (max 5)';
COMMENT ON COLUMN logs.failed_audit_logs.next_retry_at IS 'Timestamp when this log should be retried next';
COMMENT ON COLUMN logs.failed_audit_logs.permanently_failed IS 'True if max retries exceeded and no more retries will be attempted';
COMMENT ON COLUMN logs.failed_audit_logs.failed_at IS 'Timestamp when the event was first moved to failed queue';
