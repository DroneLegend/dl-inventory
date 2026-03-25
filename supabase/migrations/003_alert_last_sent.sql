-- =============================================================================
-- Migration 003: Add last_alert_sent to alert_settings
-- =============================================================================
-- Adds a timestamp column that tracks when an alert email was last sent for
-- each item. Used to prevent sending duplicate alerts within a 24-hour window.
--
-- Run this in the Supabase SQL Editor after running 001 and 002.
-- =============================================================================

ALTER TABLE alert_settings
  ADD COLUMN last_alert_sent TIMESTAMPTZ;

COMMENT ON COLUMN alert_settings.last_alert_sent IS
  'Timestamp of the last alert email sent for this item. Used for 24-hour deduplication.';

-- =============================================================================
-- UPDATE RLS POLICY
-- =============================================================================
-- The existing "Admins can update alert settings" policy only allows admins.
-- We also need the server-side alert system (running as service role) to update
-- last_alert_sent. Service role bypasses RLS entirely, so no policy change needed —
-- but we do need to make sure this column isn't accidentally editable by
-- warehouse users. The existing policies already restrict updates to admins only.
-- =============================================================================
