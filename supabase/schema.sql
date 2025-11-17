-- CartPanda Orders Table
-- Execute this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.orders (
  -- Primary key (CartPanda order ID)
  id BIGINT PRIMARY KEY,

  -- Order identification
  order_number VARCHAR(255) NOT NULL,
  status_id VARCHAR(50) NOT NULL,

  -- Payment status
  financial_status INTEGER NOT NULL,
  payment_status INTEGER NOT NULL,

  -- Pricing (stored as strings to match CartPanda API format)
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  total_price VARCHAR(50) NOT NULL,
  subtotal_price VARCHAR(50) NOT NULL,
  current_total_discounts VARCHAR(50) NOT NULL DEFAULT '0',
  local_currency_amount VARCHAR(50) NOT NULL,
  exchange_rate_usd VARCHAR(50) NOT NULL,

  -- Complex data stored as JSONB
  customer JSONB NOT NULL,
  line_items JSONB NOT NULL,
  payment JSONB NOT NULL,

  -- Affiliate information
  afid VARCHAR(255),
  affiliate_name VARCHAR(255),
  affiliate_email VARCHAR(255),
  affiliate_slug VARCHAR(255) NOT NULL DEFAULT '',
  affiliate_amount VARCHAR(50) NOT NULL DEFAULT '0',

  -- Refunds and chargebacks
  refunds JSONB,
  chargeback_received INTEGER NOT NULL DEFAULT 0,
  chargeback_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_financial_status ON public.orders(financial_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_email ON public.orders(affiliate_email);
CREATE INDEX IF NOT EXISTS idx_orders_synced_at ON public.orders(synced_at DESC);

-- Index for chargeback queries
CREATE INDEX IF NOT EXISTS idx_orders_chargeback ON public.orders(chargeback_received) WHERE chargeback_received = 1;

-- GIN index for JSONB columns (for searching inside JSON)
CREATE INDEX IF NOT EXISTS idx_orders_customer_gin ON public.orders USING gin(customer);
CREATE INDEX IF NOT EXISTS idx_orders_line_items_gin ON public.orders USING gin(line_items);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations for authenticated users
-- Adjust this based on your security requirements
CREATE POLICY "Allow all for authenticated users"
  ON public.orders
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Create a policy to allow service role (for sync job)
CREATE POLICY "Allow all for service role"
  ON public.orders
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE public.orders IS 'CartPanda orders synced from CartPanda API';
COMMENT ON COLUMN public.orders.id IS 'CartPanda order ID (primary key)';
COMMENT ON COLUMN public.orders.financial_status IS '3 = paid, check CartPanda docs for other values';
COMMENT ON COLUMN public.orders.synced_at IS 'Timestamp when this record was last synced from CartPanda API';
