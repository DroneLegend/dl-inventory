-- =============================================================================
-- DL Inventory - Opening Inventory Transactions
-- =============================================================================
-- This script adds an opening "adjust" transaction for each of the 23 items
-- so that the current_inventory view shows actual on-hand quantities instead
-- of 0 everywhere.
--
-- BEFORE YOU RUN THIS SCRIPT, YOU NEED TO DO THREE THINGS:
--
-- 1. FIND YOUR ADMIN UUID
--    - Go to your Supabase project dashboard: https://app.supabase.com
--    - Click "Authentication" in the left sidebar
--    - Click "Users"
--    - Find your admin user in the list and copy the value in the "UID" column
--    - It looks like: a1b2c3d4-e5f6-7890-abcd-ef1234567890
--
-- 2. REPLACE THE UUID PLACEHOLDER
--    - In the line below that says: v_user_id UUID := 'REPLACE-WITH-YOUR-ADMIN-UUID';
--    - Replace REPLACE-WITH-YOUR-ADMIN-UUID with your actual UUID (keep the quotes)
--    - Example: v_user_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
--
-- 3. FILL IN YOUR ACTUAL QUANTITIES
--    - Find each item in the INSERT block below
--    - Change the quantity value (currently 0) to your actual on-hand count
--    - For example, if you have 150 drone motors, change the 0 next to STM-101 to 150
--
-- HOW TO RUN THIS SCRIPT:
--    - Go to your Supabase project dashboard
--    - Click "SQL Editor" in the left sidebar
--    - Paste the entire contents of this file
--    - Click "Run" (or press Ctrl+Enter / Cmd+Enter)
-- =============================================================================

DO $$
DECLARE
  -- ⬇ REPLACE THIS with your actual admin UUID from Supabase Auth → Users
  v_user_id UUID := '0ceb97bf-63e6-4c87-b3b2-34a93ff7f114';

BEGIN
  INSERT INTO public.inventory_transactions
    (item_id, transaction_type, quantity, notes, created_by)
  VALUES
    -- STM-002
    ((SELECT id FROM public.items WHERE sku = 'STM-002'), 'adjust', 526, 'Opening inventory count', v_user_id),
    -- STM-003
    ((SELECT id FROM public.items WHERE sku = 'STM-003'), 'adjust', 40, 'Opening inventory count', v_user_id),
    -- STM-004
    ((SELECT id FROM public.items WHERE sku = 'STM-004'), 'adjust', 200, 'Opening inventory count', v_user_id),
    -- STM-005
    ((SELECT id FROM public.items WHERE sku = 'STM-005'), 'adjust', 379, 'Opening inventory count', v_user_id),
    -- STM-011
    ((SELECT id FROM public.items WHERE sku = 'STM-011'), 'adjust', 326, 'Opening inventory count', v_user_id),
    -- STM-012
    ((SELECT id FROM public.items WHERE sku = 'STM-012'), 'adjust', 32, 'Opening inventory count', v_user_id),
    -- STM-101
    ((SELECT id FROM public.items WHERE sku = 'STM-101'), 'adjust', 37, 'Opening inventory count', v_user_id),
    -- STM-102
    ((SELECT id FROM public.items WHERE sku = 'STM-102'), 'adjust', 10, 'Opening inventory count', v_user_id),
    -- STM-103
    ((SELECT id FROM public.items WHERE sku = 'STM-103'), 'adjust', 24, 'Opening inventory count', v_user_id),
    -- STM-104
    ((SELECT id FROM public.items WHERE sku = 'STM-104'), 'adjust', 17, 'Opening inventory count', v_user_id),
    -- STM-105
    ((SELECT id FROM public.items WHERE sku = 'STM-105'), 'adjust', 235, 'Opening inventory count', v_user_id),
    -- STM-106
    ((SELECT id FROM public.items WHERE sku = 'STM-106'), 'adjust', 27, 'Opening inventory count', v_user_id),
    -- STM-108
    ((SELECT id FROM public.items WHERE sku = 'STM-108'), 'adjust', 15, 'Opening inventory count', v_user_id),
    -- STM-109
    ((SELECT id FROM public.items WHERE sku = 'STM-109'), 'adjust', 25, 'Opening inventory count', v_user_id),
    -- STM-111
    ((SELECT id FROM public.items WHERE sku = 'STM-111'), 'adjust', 130, 'Opening inventory count', v_user_id),
    -- STM-112
    ((SELECT id FROM public.items WHERE sku = 'STM-112'), 'adjust', 40, 'Opening inventory count', v_user_id),
    -- STM-113
    ((SELECT id FROM public.items WHERE sku = 'STM-113'), 'adjust', 29, 'Opening inventory count', v_user_id),
    -- STM-114
    ((SELECT id FROM public.items WHERE sku = 'STM-114'), 'adjust', 13, 'Opening inventory count', v_user_id),
    -- STM-116
    ((SELECT id FROM public.items WHERE sku = 'STM-116'), 'adjust', 17, 'Opening inventory count', v_user_id),
    -- STM-201
    ((SELECT id FROM public.items WHERE sku = 'STM-201'), 'adjust', 36, 'Opening inventory count', v_user_id),
    -- STM-202
    ((SELECT id FROM public.items WHERE sku = 'STM-202'), 'adjust', 54, 'Opening inventory count', v_user_id),
    -- STM-203
    ((SELECT id FROM public.items WHERE sku = 'STM-203'), 'adjust', 48, 'Opening inventory count', v_user_id),
    -- STM-204
    ((SELECT id FROM public.items WHERE sku = 'STM-204'), 'adjust', 34, 'Opening inventory count', v_user_id)
  ;

END $$;
