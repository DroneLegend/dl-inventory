-- =============================================================================
-- DL Inventory - Initial Database Schema
-- =============================================================================
-- Run this file in the Supabase SQL Editor (supabase.com > your project > SQL Editor)
-- It creates all tables, views, security policies, and triggers for the app.
-- =============================================================================


-- =============================================================================
-- CUSTOM TYPES
-- =============================================================================

-- User roles: admin can do everything, warehouse can only read/add transactions
CREATE TYPE user_role AS ENUM ('admin', 'warehouse');

-- The type of inventory movement being recorded
CREATE TYPE transaction_type AS ENUM (
  'receive',   -- Stock arriving (purchase, return from field)
  'consume',   -- Stock used to build kits
  'adjust',    -- Manual correction to inventory count
  'return'     -- Unused stock returned to inventory
);


-- =============================================================================
-- PROFILES TABLE
-- =============================================================================
-- Stores user information. Linked 1-to-1 with Supabase Auth users.
-- When someone signs up, a profile row is automatically created (see trigger below).

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        user_role NOT NULL DEFAULT 'warehouse', -- new users start as warehouse
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles, linked to Supabase Auth users.';
COMMENT ON COLUMN profiles.role IS 'admin = full access, warehouse = read + create transactions';


-- =============================================================================
-- KIT TYPES TABLE
-- =============================================================================
-- A "kit type" is a product you build and ship (e.g. "Starter Drone Kit").
-- Each kit type has a bill of materials (bom_items) listing what parts it needs.

CREATE TABLE kit_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE, -- soft delete: hide without removing
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE kit_types IS 'Product kits that are built and shipped.';


-- =============================================================================
-- ITEMS TABLE
-- =============================================================================
-- An "item" is a physical component or part tracked in inventory
-- (e.g. "Propeller 5-inch", "Battery 4S 1500mAh").

CREATE TABLE items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku              TEXT UNIQUE NOT NULL,         -- unique part number / SKU
  name             TEXT NOT NULL,
  description      TEXT,
  unit_of_measure  TEXT NOT NULL DEFAULT 'each', -- e.g. "each", "pair", "set"
  reorder_point    INTEGER NOT NULL DEFAULT 0,   -- alert triggers below this quantity
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE items IS 'Physical components/parts tracked in inventory.';
COMMENT ON COLUMN items.reorder_point IS 'Alert is triggered when current stock falls below this number.';


-- =============================================================================
-- BOM_ITEMS TABLE (Bill of Materials)
-- =============================================================================
-- Links items to kit types, defining how many of each item is needed per kit.
-- Example: "Starter Drone Kit" needs 4x Propeller 5-inch, 1x Battery, etc.

CREATE TABLE bom_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_type_id         UUID NOT NULL REFERENCES kit_types(id) ON DELETE CASCADE,
  item_id             UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity_required   INTEGER NOT NULL CHECK (quantity_required > 0), -- must be positive
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate item entries for the same kit type
  UNIQUE (kit_type_id, item_id)
);

COMMENT ON TABLE bom_items IS 'Bill of materials: which items (and how many) are needed per kit type.';


-- =============================================================================
-- INVENTORY_TRANSACTIONS TABLE
-- =============================================================================
-- An append-only log of every inventory movement. Current stock levels are
-- calculated by summing all transactions for an item (see current_inventory view).
-- Never delete rows — add an adjustment transaction to correct mistakes.

CREATE TABLE inventory_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  transaction_type transaction_type NOT NULL,
  quantity         INTEGER NOT NULL, -- positive = stock in, negative = stock out
  notes            TEXT,             -- optional context (e.g. "PO #1234", "Kit build #5")
  created_by       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE inventory_transactions IS 'Append-only log of all inventory movements. Do not delete rows.';
COMMENT ON COLUMN inventory_transactions.quantity IS 'Positive = stock added, negative = stock removed.';


-- =============================================================================
-- KIT_TARGETS TABLE
-- =============================================================================
-- Stores the target number of kits to have built/ready for each kit type.
-- Used to calculate how many more kits can be built from current inventory.

CREATE TABLE kit_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_type_id     UUID NOT NULL REFERENCES kit_types(id) ON DELETE CASCADE,
  target_quantity INTEGER NOT NULL CHECK (target_quantity >= 0),
  effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE kit_targets IS 'Target build quantities for each kit type.';


-- =============================================================================
-- ALERT_SETTINGS TABLE
-- =============================================================================
-- Per-item settings for low-stock email alerts.
-- If no row exists for an item, the item-level reorder_point is used instead.

CREATE TABLE alert_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id             UUID NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
  alert_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  override_threshold  INTEGER, -- if set, overrides items.reorder_point for alerts
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_settings IS 'Per-item overrides for low-stock alert behavior.';
COMMENT ON COLUMN alert_settings.override_threshold IS 'If set, overrides items.reorder_point for alert purposes.';


-- =============================================================================
-- CURRENT_INVENTORY VIEW
-- =============================================================================
-- Calculates each item's current stock level by summing all transactions.
-- Also shows whether the item is below its reorder point (low stock alert).

CREATE VIEW current_inventory AS
SELECT
  i.id                                            AS item_id,
  i.sku,
  i.name,
  i.description,
  i.unit_of_measure,
  i.reorder_point,
  i.is_active,
  -- Sum all transaction quantities; default to 0 if no transactions yet
  COALESCE(SUM(t.quantity), 0)                    AS quantity_on_hand,
  -- Flag as low stock if current quantity is at or below the reorder point
  COALESCE(SUM(t.quantity), 0) <= i.reorder_point AS is_low_stock
FROM items i
LEFT JOIN inventory_transactions t ON t.item_id = i.id
GROUP BY i.id, i.sku, i.name, i.description, i.unit_of_measure, i.reorder_point, i.is_active;

COMMENT ON VIEW current_inventory IS 'Live inventory levels calculated from transaction history.';


-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
-- Automatically updates the updated_at timestamp whenever a row is modified.
-- Applied to all tables that have an updated_at column.

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the updated_at trigger to each relevant table
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON kit_types
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON kit_targets
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON alert_settings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- =============================================================================
-- AUTO-CREATE PROFILE TRIGGER
-- =============================================================================
-- When a new user signs up via Supabase Auth, automatically create their profile.
-- This fires after a row is inserted into auth.users (Supabase's internal auth table).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    -- Try to pull the full name from OAuth metadata (Google, etc.), fallback to null
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER runs with owner privileges to write to profiles

-- Attach the trigger to the auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- RLS ensures users can only see and modify data they're allowed to.
-- We enable it on every table, then define who can do what.
-- Without a matching policy, all access is denied by default.

ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_types              ENABLE ROW LEVEL SECURITY;
ALTER TABLE items                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_targets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings         ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- HELPER FUNCTION: get current user's role
-- -----------------------------------------------------------------------------
-- Used in RLS policies below to check if the logged-in user is an admin.
-- Looks up the role from the profiles table for the current auth session.

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- PROFILES policies
-- -----------------------------------------------------------------------------

-- Users can always read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (e.g. change their name)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (get_my_role() = 'admin');

-- Admins can update any profile (e.g. change someone's role)
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (get_my_role() = 'admin');

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (get_my_role() = 'admin');


-- -----------------------------------------------------------------------------
-- KIT_TYPES policies
-- -----------------------------------------------------------------------------

-- All authenticated users can read kit types
CREATE POLICY "Authenticated users can view kit types"
  ON kit_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can create, update, or delete kit types
CREATE POLICY "Admins can insert kit types"
  ON kit_types FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins can update kit types"
  ON kit_types FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins can delete kit types"
  ON kit_types FOR DELETE
  USING (get_my_role() = 'admin');


-- -----------------------------------------------------------------------------
-- ITEMS policies
-- -----------------------------------------------------------------------------

-- All authenticated users can read items
CREATE POLICY "Authenticated users can view items"
  ON items FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can create, update, or delete items
CREATE POLICY "Admins can insert items"
  ON items FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins can update items"
  ON items FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins can delete items"
  ON items FOR DELETE
  USING (get_my_role() = 'admin');


-- -----------------------------------------------------------------------------
-- BOM_ITEMS policies
-- -----------------------------------------------------------------------------

-- All authenticated users can read the bill of materials
CREATE POLICY "Authenticated users can view bom items"
  ON bom_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can modify the bill of materials
CREATE POLICY "Admins can insert bom items"
  ON bom_items FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins can update bom items"
  ON bom_items FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins can delete bom items"
  ON bom_items FOR DELETE
  USING (get_my_role() = 'admin');


-- -----------------------------------------------------------------------------
-- INVENTORY_TRANSACTIONS policies
-- -----------------------------------------------------------------------------

-- All authenticated users can read transactions
CREATE POLICY "Authenticated users can view transactions"
  ON inventory_transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All authenticated users can create transactions (warehouse workers log movements)
CREATE POLICY "Authenticated users can insert transactions"
  ON inventory_transactions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid() -- can only log transactions as themselves
  );

-- Only admins can update or delete transactions (corrections must go through admins)
CREATE POLICY "Admins can update transactions"
  ON inventory_transactions FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins can delete transactions"
  ON inventory_transactions FOR DELETE
  USING (get_my_role() = 'admin');


-- -----------------------------------------------------------------------------
-- KIT_TARGETS policies
-- -----------------------------------------------------------------------------

-- All authenticated users can read kit targets
CREATE POLICY "Authenticated users can view kit targets"
  ON kit_targets FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can set or change kit targets
CREATE POLICY "Admins can insert kit targets"
  ON kit_targets FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins can update kit targets"
  ON kit_targets FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins can delete kit targets"
  ON kit_targets FOR DELETE
  USING (get_my_role() = 'admin');


-- -----------------------------------------------------------------------------
-- ALERT_SETTINGS policies
-- -----------------------------------------------------------------------------

-- All authenticated users can read alert settings
CREATE POLICY "Authenticated users can view alert settings"
  ON alert_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can configure alert settings
CREATE POLICY "Admins can insert alert settings"
  ON alert_settings FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins can update alert settings"
  ON alert_settings FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins can delete alert settings"
  ON alert_settings FOR DELETE
  USING (get_my_role() = 'admin');


-- =============================================================================
-- INDEXES
-- =============================================================================
-- Indexes speed up common queries. Without them, the database scans every row.

-- Speeds up looking up items by SKU
CREATE INDEX idx_items_sku ON items(sku);

-- Speeds up filtering items by active status
CREATE INDEX idx_items_is_active ON items(is_active);

-- Speeds up fetching all BOM entries for a given kit type
CREATE INDEX idx_bom_items_kit_type_id ON bom_items(kit_type_id);

-- Speeds up fetching all BOM entries that reference a specific item
CREATE INDEX idx_bom_items_item_id ON bom_items(item_id);

-- Speeds up fetching transaction history for a specific item
CREATE INDEX idx_inventory_transactions_item_id ON inventory_transactions(item_id);

-- Speeds up looking up transactions by who created them
CREATE INDEX idx_inventory_transactions_created_by ON inventory_transactions(created_by);

-- Speeds up filtering transactions by date
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);

-- Speeds up fetching kit targets for a specific kit type
CREATE INDEX idx_kit_targets_kit_type_id ON kit_targets(kit_type_id);
