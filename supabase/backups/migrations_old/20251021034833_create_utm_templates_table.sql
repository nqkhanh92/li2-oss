CREATE TABLE utm_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  utm_source VARCHAR(60),
  utm_medium VARCHAR(60),
  utm_campaign VARCHAR(60),
  utm_term VARCHAR(255),
  utm_content VARCHAR(255),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(organization_id, name),
  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_utm_templates_org_id ON utm_templates(organization_id);
CREATE INDEX idx_utm_templates_created_at ON utm_templates(created_at DESC);

-- Enable RLS
ALTER TABLE utm_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Note: Using org_members table (actual table name in database)
CREATE POLICY "Users can view their org templates"
ON utm_templates FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert templates in their org"
ON utm_templates FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update templates in their org"
ON utm_templates FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete templates in their org"
ON utm_templates FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  )
);