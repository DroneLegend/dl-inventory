-- =============================================================================
-- Add sort_order column to kit_types
-- =============================================================================
-- Allows admins to drag-and-reorder kit types so they control which kits
-- appear first in the Kit Calculator dropdown and Kit Manager table.
-- Default value of 0 means all existing kits start with the same priority;
-- they'll be further sorted alphabetically by name as a tiebreaker.

ALTER TABLE kit_types
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN kit_types.sort_order IS 'Controls display order of kit types. Lower numbers appear first.';
