-- Migration: Fix event_rules.created_by foreign key
-- Description: Change FK reference from auth.users(id) to profiles(id) to match project convention
-- Date: 2026-02-26
-- Fix: 500 error on event rule creation (Casdoor user IDs live in profiles, not auth.users)

ALTER TABLE event_rules
  DROP CONSTRAINT event_rules_created_by_fkey;

ALTER TABLE event_rules
  ADD CONSTRAINT event_rules_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id);
