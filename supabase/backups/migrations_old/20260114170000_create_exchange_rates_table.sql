-- Exchange rates table for currency conversion fallback
-- Used when Redis cache misses and as permanent storage for historical rates

CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL,
  target_currency text NOT NULL,
  rate numeric(20, 8) NOT NULL,
  rate_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exchange_rates_unique_rate UNIQUE(base_currency, target_currency, rate_date),
  CONSTRAINT exchange_rates_positive_rate CHECK (rate > 0)
);

-- Index for efficient lookups by currency pair and date
CREATE INDEX idx_exchange_rates_lookup
  ON exchange_rates(base_currency, target_currency, rate_date DESC);

COMMENT ON TABLE exchange_rates IS 'Cached exchange rates with date for historical lookups and API fallback';
