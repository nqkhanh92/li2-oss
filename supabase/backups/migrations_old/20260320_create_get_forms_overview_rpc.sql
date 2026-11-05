-- get_forms_overview: one row per unique form with fills, submits, completion rate, avg time
CREATE OR REPLACE FUNCTION get_forms_overview(
  _org_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  form_id text,
  form_name text,
  form_action text,
  page_path text,
  fills bigint,
  submits bigint,
  completion_pct numeric,
  avg_time_on_form numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    form_id,
    form_name,
    form_action,
    page_path,
    COUNT(*) FILTER (WHERE interaction_type = 'form_fill')   AS fills,
    COUNT(*) FILTER (WHERE interaction_type = 'form_submit') AS submits,
    ROUND(
      COUNT(*) FILTER (WHERE interaction_type = 'form_submit')::numeric
      / NULLIF(COUNT(*) FILTER (WHERE interaction_type = 'form_fill'), 0) * 100,
      1
    ) AS completion_pct,
    ROUND(AVG(time_on_form) FILTER (WHERE interaction_type = 'form_submit') / 1000) AS avg_time_on_form
  FROM interactions
  WHERE organization_id = _org_id
    AND interaction_type IN ('form_fill', 'form_submit')
    AND timestamp BETWEEN _from AND _to
    AND is_bot = false
  GROUP BY form_id, form_name, form_action, page_path
  ORDER BY fills DESC;
$$;

-- get_forms_daily: daily breakdown, optionally filtered to one form
CREATE OR REPLACE FUNCTION get_forms_daily(
  _org_id uuid,
  _from timestamptz,
  _to timestamptz,
  _form_id text DEFAULT NULL,
  _form_name text DEFAULT NULL,
  _page_path text DEFAULT NULL
)
RETURNS TABLE (
  day date,
  fills bigint,
  submits bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    date_trunc('day', timestamp)::date AS day,
    COUNT(*) FILTER (WHERE interaction_type = 'form_fill')   AS fills,
    COUNT(*) FILTER (WHERE interaction_type = 'form_submit') AS submits
  FROM interactions
  WHERE organization_id = _org_id
    AND interaction_type IN ('form_fill', 'form_submit')
    AND timestamp BETWEEN _from AND _to
    AND is_bot = false
    AND (_form_id   IS NULL OR form_id   = _form_id)
    AND (_form_name IS NULL OR form_name = _form_name)
    AND (_page_path IS NULL OR page_path = _page_path)
  GROUP BY 1
  ORDER BY 1;
$$;
