-- =============================================================================
-- DL Inventory - Seed Data
-- =============================================================================
-- Populates the database with the STEM Fundamentals kit type, all 23 items,
-- the bill of materials, kit target, and alert settings.
--
-- NOTE: Initial inventory transactions (on-hand quantities) are NOT included
-- here because they require a created_by user UUID. After you create your
-- admin user and run the app for the first time, use the "Adjust" transaction
-- feature in the UI to enter starting quantities — or run the separate
-- 003_seed_transactions.sql script (provided later) with your user UUID.
-- =============================================================================

DO $$
DECLARE
  -- These variables hold the generated IDs so we can reference them below
  v_kit_type_id  UUID;

  -- Item IDs — one variable per item so we can use them in the BOM and alert settings
  v_id_stm002  UUID;
  v_id_stm003  UUID;
  v_id_stm004  UUID;
  v_id_stm005  UUID;
  v_id_stm011  UUID;
  v_id_stm012  UUID;
  v_id_stm101  UUID;
  v_id_stm102  UUID;
  v_id_stm103  UUID;
  v_id_stm104  UUID;
  v_id_stm105  UUID;
  v_id_stm106  UUID;
  v_id_stm108  UUID;
  v_id_stm109  UUID;
  v_id_stm111  UUID;
  v_id_stm112  UUID;
  v_id_stm113  UUID;
  v_id_stm114  UUID;
  v_id_stm116  UUID;
  v_id_stm201  UUID;
  v_id_stm202  UUID;
  v_id_stm203  UUID;
  v_id_stm204  UUID;

BEGIN

-- =============================================================================
-- STEP 1: KIT TYPE
-- =============================================================================

INSERT INTO public.kit_types (name, description)
VALUES (
  'STEM Fundamentals',
  'Complete STEM education kit including programmable micro drones, building supplies, mission guides, and all supporting materials.'
)
RETURNING id INTO v_kit_type_id;

RAISE NOTICE 'Created kit type: STEM Fundamentals (id: %)', v_kit_type_id;


-- =============================================================================
-- STEP 2: ITEMS
-- =============================================================================
-- Each item gets:
--   - sku: unique part number
--   - name: full descriptive name
--   - description: includes source (supplier) since it's not a separate column yet
--   - unit_of_measure: how this item is counted
--   - reorder_point: 10% of (qty_per_kit × 20 kits)
--
-- Unit costs are noted in comments for reference.
-- A future migration can add a unit_cost column if needed.

-- STM-002 | reorder = 15 × 20 × 10% = 30 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-002', '15x Rechargeable Batteries', 'Source: Alibaba', 'each', 30)
RETURNING id INTO v_id_stm002;

-- STM-003 | reorder = 10 × 20 × 10% = 20 | cost: $400.00
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-003', '10x Replacement Props (4 pack)', 'Source: Amazon | Unit cost: $400.00', '4-pack', 20)
RETURNING id INTO v_id_stm003;

-- STM-004 | reorder = 5 × 20 × 10% = 10 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-004', '5x Replacement Prop Guards (4 pack)', 'Source: Alibaba', '4-pack', 10)
RETURNING id INTO v_id_stm004;

-- STM-005 | reorder = 5 × 20 × 10% = 10 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-005', '5x Programmable Micro Drones', 'Source: Inventory', 'each', 10)
RETURNING id INTO v_id_stm005;

-- STM-011 | reorder = 5 × 20 × 10% = 10 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-011', '5x Tello Battery Charging Hub', 'Source: TBC', 'each', 10)
RETURNING id INTO v_id_stm011;

-- STM-012 | reorder = 5 × 20 × 10% = 10 | cost: $229.00
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-012', '5x USB Cables', 'Source: Amazon | Unit cost: $229.00', 'each', 10)
RETURNING id INTO v_id_stm012;

-- STM-101 | reorder = 1 × 20 × 10% = 2 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-101', '1x 158pc Builder Set', 'Source: Alibaba', 'each', 2)
RETURNING id INTO v_id_stm101;

-- STM-102 | reorder = 2 × 20 × 10% = 4 | cost: $160.00
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-102', '2x Mechanical Pencils (12 pack)', 'Source: Amazon | Unit cost: $160.00', '12-pack', 4)
RETURNING id INTO v_id_stm102;

-- STM-103 | reorder = 1 × 20 × 10% = 2 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-103', '1x Sticky Notes (6 pack)', 'Source: Amazon', '6-pack', 2)
RETURNING id INTO v_id_stm103;

-- STM-104 | reorder = 2 × 20 × 10% = 4 | cost: $309.00
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-104', '2x Clipboards (set of 6)', 'Source: Amazon | Unit cost: $309.00', 'set of 6', 4)
RETURNING id INTO v_id_stm104;

-- STM-105 | reorder = 8 × 20 × 10% = 16 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-105', '8x Launch and Landing Pads', 'Source: TBC', 'each', 16)
RETURNING id INTO v_id_stm105;

-- STM-106 | reorder = 1 × 20 × 10% = 2 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-106', '1x Safety Goggles (12 pack)', 'Source: Amazon', '12-pack', 2)
RETURNING id INTO v_id_stm106;

-- STM-108 | reorder = 1 × 20 × 10% = 2 | cost: $40.00
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-108', '12x Lanyards (12 pack)', 'Source: Amazon | Unit cost: $40.00', '12-pack', 2)
RETURNING id INTO v_id_stm108;

-- STM-109 | reorder = 1 × 20 × 10% = 2 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-109', '1x Pack of 6x 3D Printed Cups', 'Source: Scott Makes', 'pack of 6', 2)
RETURNING id INTO v_id_stm109;

-- STM-111 | reorder = 2 × 20 × 10% = 4 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-111', '2x Spiky Hedge Balls (12 pack)', 'Source: Amazon', '12-pack', 4)
RETURNING id INTO v_id_stm111;

-- STM-112 | reorder = 10 × 20 × 10% = 20 | cost: $304.00
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-112', '10x Measuring Tapes', 'Source: Amazon | Unit cost: $304.00', 'each', 20)
RETURNING id INTO v_id_stm112;

-- STM-113 | reorder = 6 × 20 × 10% = 12 | cost: $371.00
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-113', '6x 6-Quart Storage Boxes', 'Source: Uline | Unit cost: $371.00', 'each', 12)
RETURNING id INTO v_id_stm113;

-- STM-114 | reorder = 1 × 20 × 10% = 2 | cost: $112.00
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-114', '1x Pack of 24x Koala Clip-Ons', 'Source: Amazon | Unit cost: $112.00', 'pack of 24', 2)
RETURNING id INTO v_id_stm114;

-- STM-116 | reorder = 1 × 20 × 10% = 2 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-116', '1x Pack of 50x Drone Legends Stickers', 'Source: Sticker Mule', 'pack of 50', 2)
RETURNING id INTO v_id_stm116;

-- STM-201 | reorder = 2 × 20 × 10% = 4 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-201', '2x Pack of 6x Student Mission Guides', 'Source: IPAK', 'pack of 6', 4)
RETURNING id INTO v_id_stm201;

-- STM-202 | reorder = 2 × 20 × 10% = 4 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-202', '2x Lesson Planners', 'Source: IPAK', 'each', 4)
RETURNING id INTO v_id_stm202;

-- STM-203 | reorder = 2 × 20 × 10% = 4 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-203', '2x Pack of 3x Operations Manuals', 'Source: IPAK', 'pack of 3', 4)
RETURNING id INTO v_id_stm203;

-- STM-204 | reorder = 2 × 20 × 10% = 4 | cost: N/A
INSERT INTO public.items (sku, name, description, unit_of_measure, reorder_point)
VALUES ('STM-204', '2x Pack of 6x Safety Cards', 'Source: IPAK', 'pack of 6', 4)
RETURNING id INTO v_id_stm204;

RAISE NOTICE 'Inserted 23 items.';


-- =============================================================================
-- STEP 3: BILL OF MATERIALS (BOM)
-- =============================================================================
-- Links each item to the STEM Fundamentals kit with the correct quantity per kit.

INSERT INTO public.bom_items (kit_type_id, item_id, quantity_required) VALUES
  (v_kit_type_id, v_id_stm002, 15),
  (v_kit_type_id, v_id_stm003, 10),
  (v_kit_type_id, v_id_stm004,  5),
  (v_kit_type_id, v_id_stm005,  5),
  (v_kit_type_id, v_id_stm011,  5),
  (v_kit_type_id, v_id_stm012,  5),
  (v_kit_type_id, v_id_stm101,  1),
  (v_kit_type_id, v_id_stm102,  2),
  (v_kit_type_id, v_id_stm103,  1),
  (v_kit_type_id, v_id_stm104,  2),
  (v_kit_type_id, v_id_stm105,  8),
  (v_kit_type_id, v_id_stm106,  1),
  (v_kit_type_id, v_id_stm108,  1),
  (v_kit_type_id, v_id_stm109,  1),
  (v_kit_type_id, v_id_stm111,  2),
  (v_kit_type_id, v_id_stm112, 10),
  (v_kit_type_id, v_id_stm113,  6),
  (v_kit_type_id, v_id_stm114,  1),
  (v_kit_type_id, v_id_stm116,  1),
  (v_kit_type_id, v_id_stm201,  2),
  (v_kit_type_id, v_id_stm202,  2),
  (v_kit_type_id, v_id_stm203,  2),
  (v_kit_type_id, v_id_stm204,  2);

RAISE NOTICE 'Inserted 23 BOM entries.';


-- =============================================================================
-- STEP 4: KIT TARGET
-- =============================================================================
-- Sets the target of 20 kits to have ready for STEM Fundamentals.

INSERT INTO public.kit_targets (kit_type_id, target_quantity, notes)
VALUES (
  v_kit_type_id,
  20,
  'Initial target: 20 STEM Fundamentals kits'
);

RAISE NOTICE 'Inserted kit target: 20 kits for STEM Fundamentals.';


-- =============================================================================
-- STEP 5: ALERT SETTINGS
-- =============================================================================
-- Creates an alert_settings row for each item.
-- override_threshold = 10% of (qty_per_kit × 20 kits).

INSERT INTO public.alert_settings (item_id, alert_enabled, override_threshold) VALUES
  (v_id_stm002, true, 30),  -- 15 per kit × 20 kits × 10% = 30
  (v_id_stm003, true, 20),  -- 10 × 20 × 10% = 20
  (v_id_stm004, true, 10),  -- 5 × 20 × 10% = 10
  (v_id_stm005, true, 10),  -- 5 × 20 × 10% = 10
  (v_id_stm011, true, 10),  -- 5 × 20 × 10% = 10
  (v_id_stm012, true, 10),  -- 5 × 20 × 10% = 10
  (v_id_stm101, true,  2),  -- 1 × 20 × 10% = 2
  (v_id_stm102, true,  4),  -- 2 × 20 × 10% = 4
  (v_id_stm103, true,  2),  -- 1 × 20 × 10% = 2
  (v_id_stm104, true,  4),  -- 2 × 20 × 10% = 4
  (v_id_stm105, true, 16),  -- 8 × 20 × 10% = 16
  (v_id_stm106, true,  2),  -- 1 × 20 × 10% = 2
  (v_id_stm108, true,  2),  -- 1 × 20 × 10% = 2
  (v_id_stm109, true,  2),  -- 1 × 20 × 10% = 2
  (v_id_stm111, true,  4),  -- 2 × 20 × 10% = 4
  (v_id_stm112, true, 20),  -- 10 × 20 × 10% = 20
  (v_id_stm113, true, 12),  -- 6 × 20 × 10% = 12
  (v_id_stm114, true,  2),  -- 1 × 20 × 10% = 2
  (v_id_stm116, true,  2),  -- 1 × 20 × 10% = 2
  (v_id_stm201, true,  4),  -- 2 × 20 × 10% = 4
  (v_id_stm202, true,  4),  -- 2 × 20 × 10% = 4
  (v_id_stm203, true,  4),  -- 2 × 20 × 10% = 4
  (v_id_stm204, true,  4);  -- 2 × 20 × 10% = 4

RAISE NOTICE 'Inserted 23 alert settings.';

RAISE NOTICE '==============================================';
RAISE NOTICE 'Seed complete! STEM Fundamentals kit is ready.';
RAISE NOTICE 'NEXT STEP: After creating your first user,';
RAISE NOTICE 'run 003_seed_transactions.sql to enter';
RAISE NOTICE 'the starting on-hand quantities.';
RAISE NOTICE '==============================================';

END $$;


-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
-- Run this after the seed to confirm everything looks correct.
-- On-hand will show 0 for all items until transactions are entered.

SELECT
  i.sku,
  i.name,
  i.reorder_point,
  b.quantity_required  AS qty_per_kit,
  a.override_threshold AS alert_threshold
FROM items i
JOIN bom_items b       ON b.item_id    = i.id
JOIN alert_settings a  ON a.item_id    = i.id
ORDER BY i.sku;
