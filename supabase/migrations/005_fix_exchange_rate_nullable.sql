-- Migration: Fix exchange_rate_usd to allow NULL values
--
-- Problem: CartPanda API returns NULL for exchange_rate_USD on some orders (e.g., USD orders)
-- Impact: Sync fails with "null value in column violates not-null constraint"
-- Solution: Make exchange_rate_usd nullable
--
-- Affected orders: #10360, #9178, and potentially others

-- Make exchange_rate_usd nullable
ALTER TABLE public.orders
  ALTER COLUMN exchange_rate_usd DROP NOT NULL;

-- Add comment explaining why it's nullable
COMMENT ON COLUMN public.orders.exchange_rate_usd IS
  'Exchange rate to USD. NULL when order currency is already USD or when CartPanda API does not provide the value.';
