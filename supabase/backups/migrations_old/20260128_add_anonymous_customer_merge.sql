-- Migration: add_anonymous_customer_merge_fields
-- Purpose: Enable anonymous customer tracking and merging into identified customers
-- Date: 2026-01-28

-- ============================================================================
-- STEP 1: Add columns to customer_profiles table
-- ============================================================================

-- is_anonymous: Flag to identify anonymous customers (tracked by click_id only)
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- merged_into_id: When an anonymous customer is merged, points to the identified customer
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES customer_profiles(id);

-- merged_from_ids: Array of anonymous customer IDs that were merged into this customer
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS merged_from_ids UUID[] DEFAULT '{}';

-- merged_at: Timestamp when the customer was merged
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Create indexes for query performance
-- ============================================================================

-- Index for finding anonymous customers by click_id (used in TrackLead)
-- Partial index on anonymous customers only to reduce index size
CREATE INDEX IF NOT EXISTS idx_customer_profiles_anonymous_click
    ON customer_profiles(organization_id, first_click_id)
    WHERE is_anonymous = true;

-- Index for finding customers that have been merged into another
-- Used for query filtering to exclude merged customers
CREATE INDEX IF NOT EXISTS idx_customer_profiles_merged_into
    ON customer_profiles(merged_into_id)
    WHERE merged_into_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Create merge_customer_profiles RPC function
-- ============================================================================

-- This function atomically merges one or more anonymous customers into an identified customer.
-- It handles:
-- 1. Row-level locking to prevent race conditions
-- 2. First-touch attribution preservation (keeps earliest first_click_id)
-- 3. Aggregation of lead_count, sale_count, and revenue
-- 4. Transfer of all conversion events to the identified customer
-- 5. Marking anonymous customers as merged
CREATE OR REPLACE FUNCTION merge_customer_profiles(
    p_anonymous_ids UUID[],
    p_identified_id UUID
) RETURNS VOID AS $$
DECLARE
    v_anon_id UUID;
    v_total_leads INT := 0;
    v_total_sales INT := 0;
    v_total_revenue BIGINT := 0;
    v_total_revenue_usd BIGINT := 0;
    v_total_revenue_vnd BIGINT := 0;
    v_earliest_click_id TEXT;
    v_earliest_tp_id UUID;
    v_earliest_created_at TIMESTAMPTZ;
    v_identified_created_at TIMESTAMPTZ;
BEGIN
    -- Exit early if no anonymous IDs provided
    IF array_length(p_anonymous_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    -- Lock rows to prevent concurrent modifications (race condition prevention)
    PERFORM 1 FROM customer_profiles
    WHERE id = ANY(p_anonymous_ids) OR id = p_identified_id
    FOR UPDATE;

    -- Get the identified customer's created_at for comparison
    SELECT created_at INTO v_identified_created_at
    FROM customer_profiles
    WHERE id = p_identified_id;

    -- Find earliest first_click_id among all customers being merged
    -- Uses created_at to determine which attribution should be preserved
    SELECT first_click_id, first_touch_point_id, created_at
    INTO v_earliest_click_id, v_earliest_tp_id, v_earliest_created_at
    FROM customer_profiles
    WHERE (id = p_identified_id OR id = ANY(p_anonymous_ids))
    AND first_click_id IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 1;

    -- Aggregate totals from all anonymous customers
    SELECT
        COALESCE(SUM(lead_count), 0),
        COALESCE(SUM(sale_count), 0),
        COALESCE(SUM(total_revenue), 0),
        COALESCE(SUM(total_revenue_usd), 0),
        COALESCE(SUM(total_revenue_vnd), 0)
    INTO v_total_leads, v_total_sales, v_total_revenue, v_total_revenue_usd, v_total_revenue_vnd
    FROM customer_profiles
    WHERE id = ANY(p_anonymous_ids);

    -- Transfer all conversion events from anonymous customers to identified customer
    UPDATE conversion_events
    SET customer_profile_id = p_identified_id
    WHERE customer_profile_id = ANY(p_anonymous_ids);

    -- Update identified customer with aggregated data
    UPDATE customer_profiles
    SET
        lead_count = lead_count + v_total_leads,
        sale_count = sale_count + v_total_sales,
        total_revenue = total_revenue + v_total_revenue,
        total_revenue_usd = total_revenue_usd + v_total_revenue_usd,
        total_revenue_vnd = total_revenue_vnd + v_total_revenue_vnd,
        merged_from_ids = array_cat(merged_from_ids, p_anonymous_ids),
        -- Preserve earliest first-touch attribution
        first_click_id = CASE
            WHEN v_earliest_created_at < v_identified_created_at AND v_earliest_click_id IS NOT NULL
            THEN v_earliest_click_id
            ELSE first_click_id
        END,
        first_touch_point_id = CASE
            WHEN v_earliest_created_at < v_identified_created_at AND v_earliest_tp_id IS NOT NULL
            THEN v_earliest_tp_id
            ELSE first_touch_point_id
        END,
        updated_at = NOW()
    WHERE id = p_identified_id;

    -- Mark all anonymous customers as merged
    UPDATE customer_profiles
    SET
        merged_into_id = p_identified_id,
        merged_at = NOW(),
        is_anonymous = false,
        -- Zero out counts to prevent double-counting in reports
        lead_count = 0,
        sale_count = 0,
        total_revenue = 0,
        total_revenue_usd = 0,
        total_revenue_vnd = 0,
        updated_at = NOW()
    WHERE id = ANY(p_anonymous_ids);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Add comment for documentation
-- ============================================================================

COMMENT ON FUNCTION merge_customer_profiles(UUID[], UUID) IS
'Atomically merges anonymous customer profiles into an identified customer.
Handles first-touch attribution preservation, event transfer, and count aggregation.
Uses row-level locks to prevent race conditions.';

-- ============================================================================
-- ROLLBACK (if needed - run these statements to undo the migration)
-- ============================================================================
-- DROP FUNCTION IF EXISTS merge_customer_profiles(UUID[], UUID);
-- DROP INDEX IF EXISTS idx_customer_profiles_merged_into;
-- DROP INDEX IF EXISTS idx_customer_profiles_anonymous_click;
-- ALTER TABLE customer_profiles DROP COLUMN IF EXISTS merged_at;
-- ALTER TABLE customer_profiles DROP COLUMN IF EXISTS merged_from_ids;
-- ALTER TABLE customer_profiles DROP COLUMN IF EXISTS merged_into_id;
-- ALTER TABLE customer_profiles DROP COLUMN IF EXISTS is_anonymous;
