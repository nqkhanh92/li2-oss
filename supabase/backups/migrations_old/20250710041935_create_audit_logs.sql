-- Create a dedicated schema for logs
CREATE SCHEMA IF NOT EXISTS logs;

-- ================================
-- audit_logs table
-- ================================
CREATE TABLE logs.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    request_id VARCHAR(100),
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    result VARCHAR(20), -- SUCCESS, FAILED, ERROR
    reason VARCHAR(50),
    counter_before INTEGER,
    counter_after INTEGER,
    user_sequence_number INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT,

    CONSTRAINT chk_audit_result CHECK (result IN ('SUCCESS', 'FAILED', 'ERROR'))
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_event_type ON logs.audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON logs.audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON logs.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_result ON logs.audit_logs(result);
CREATE INDEX idx_audit_logs_request_id ON logs.audit_logs(request_id);

-- Composite index
CREATE INDEX idx_audit_logs_event_result_time 
  ON logs.audit_logs(event_type, result, timestamp DESC);

-- ================================
-- premium_grants_log table
-- ================================
CREATE TABLE logs.premium_grants_log (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_email VARCHAR(255),
    sequence_number INTEGER NOT NULL,
    grant_type VARCHAR(20) NOT NULL DEFAULT 'AUTO',
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    granted_by VARCHAR(50) DEFAULT 'SYSTEM',
    ip_address INET,
    user_agent TEXT,
    device_fp TEXT,
    registration_date TIMESTAMP WITH TIME ZONE,
    registration_source VARCHAR(50),
    registration_campaign TEXT,
    premium_expires_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    request_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_grant_type CHECK (grant_type IN ('AUTO', 'MANUAL', 'MIGRATION'))
);

-- Unique constraint for sequence_number
CREATE UNIQUE INDEX idx_premium_grants_sequence 
  ON logs.premium_grants_log(sequence_number);

-- Indexes for premium_grants_log
CREATE INDEX idx_premium_grants_user 
  ON logs.premium_grants_log(user_id);
CREATE INDEX idx_premium_grants_granted_at 
  ON logs.premium_grants_log(granted_at DESC);
CREATE INDEX idx_premium_grants_source 
  ON logs.premium_grants_log(registration_source);

-- ================================
-- Permissions (tighten access)
-- ================================

-- Remove access from all
REVOKE ALL ON SCHEMA logs FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA logs FROM PUBLIC;

-- (Optional) Grant access to a specific admin role
-- Replace your_admin_role with actual role name
-- GRANT USAGE ON SCHEMA logs TO your_admin_role;
-- GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA logs TO your_admin_role;
