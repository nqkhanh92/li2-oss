CREATE TABLE system_counters (
  id SERIAL PRIMARY KEY,
  is_active BOOLEAN DEFAULT TRUE,
  counter_type VARCHAR(50) UNIQUE,
  current_value INT DEFAULT 0,
  max_value INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);