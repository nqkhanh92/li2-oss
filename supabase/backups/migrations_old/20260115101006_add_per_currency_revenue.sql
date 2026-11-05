-- Add per-currency revenue columns to customer_profiles
-- This allows storing revenue in original currency without conversion loss

-- Add per-currency revenue columns
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS total_revenue_usd bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue_vnd bigint DEFAULT 0;

-- Migrate existing data from conversion_events
WITH currency_totals AS (
  SELECT
    customer_profile_id,
    SUM(CASE WHEN UPPER(currency) = 'USD' OR currency IS NULL THEN amount ELSE 0 END) as usd_total,
    SUM(CASE WHEN UPPER(currency) = 'VND' THEN amount ELSE 0 END) as vnd_total
  FROM conversion_events
  WHERE event_type = 'sale' AND amount IS NOT NULL
  GROUP BY customer_profile_id
)
UPDATE customer_profiles cp
SET
  total_revenue_usd = COALESCE(ct.usd_total, 0),
  total_revenue_vnd = COALESCE(ct.vnd_total, 0)
FROM currency_totals ct
WHERE cp.id = ct.customer_profile_id;

-- Update the increment function to accept currency and update appropriate column
CREATE OR REPLACE FUNCTION increment_customer_sale(
  customer_id uuid,
  sale_amount bigint,
  sale_currency text DEFAULT 'USD'
)
RETURNS void AS $$
BEGIN
  UPDATE customer_profiles
  SET
    sale_count = sale_count + 1,
    -- Increment the appropriate currency column
    total_revenue_usd = CASE WHEN UPPER(sale_currency) = 'USD' THEN total_revenue_usd + COALESCE(sale_amount, 0) ELSE total_revenue_usd END,
    total_revenue_vnd = CASE WHEN UPPER(sale_currency) = 'VND' THEN total_revenue_vnd + COALESCE(sale_amount, 0) ELSE total_revenue_vnd END,
    -- Keep legacy total_revenue updated for backward compatibility
    total_revenue = total_revenue + COALESCE(sale_amount, 0),
    updated_at = now()
  WHERE id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN customer_profiles.total_revenue_usd IS 'Lifetime revenue in USD cents';
COMMENT ON COLUMN customer_profiles.total_revenue_vnd IS 'Lifetime revenue in VND dong';
