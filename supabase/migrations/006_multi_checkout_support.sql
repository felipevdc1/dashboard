-- Migration 006: Multi-Checkout Support (CartPanda + Digistore24)
-- Adds support for multiple checkout platforms while maintaining backward compatibility
-- Execute this in Supabase SQL Editor

-- Step 1: Add new columns for multi-checkout support
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cartpanda',
  ADD COLUMN IF NOT EXISTS source_order_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- Step 2: Backfill source_order_id for existing CartPanda orders
UPDATE public.orders
SET source_order_id = id::TEXT
WHERE source_order_id IS NULL;

-- Step 3: Make source and source_order_id NOT NULL (after backfill)
ALTER TABLE public.orders
  ALTER COLUMN source SET NOT NULL,
  ALTER COLUMN source_order_id SET NOT NULL;

-- Step 4: Create composite unique constraint (source + source_order_id)
-- This allows different platforms to have overlapping order IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_source_order_id
  ON public.orders(source, source_order_id);

-- Step 5: Add index for source column (for filtering by platform)
CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders(source);

-- Step 6: Add GIN index for raw_payload (for searching within payload)
CREATE INDEX IF NOT EXISTS idx_orders_raw_payload_gin
  ON public.orders USING gin(raw_payload);

-- Step 7: Add check constraint to ensure source is valid
ALTER TABLE public.orders
  ADD CONSTRAINT check_orders_source
  CHECK (source IN ('cartpanda', 'digistore24'));

-- Step 8: Update table comment
COMMENT ON TABLE public.orders IS 'Multi-checkout orders from CartPanda and Digistore24';
COMMENT ON COLUMN public.orders.source IS 'Checkout platform: cartpanda or digistore24';
COMMENT ON COLUMN public.orders.source_order_id IS 'Original order ID from the source platform';
COMMENT ON COLUMN public.orders.raw_payload IS 'Complete raw API response for debugging and auditing';

-- Step 9: Create view for CartPanda orders only (backward compatibility)
CREATE OR REPLACE VIEW public.cartpanda_orders AS
SELECT * FROM public.orders
WHERE source = 'cartpanda';

-- Step 10: Create view for Digistore24 orders only
CREATE OR REPLACE VIEW public.digistore24_orders AS
SELECT * FROM public.orders
WHERE source = 'digistore24';

-- Migration complete!
-- All existing orders are now tagged as 'cartpanda'
-- Ready to receive Digistore24 orders when integration is complete
