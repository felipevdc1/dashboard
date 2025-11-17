-- Webhook Events Table
-- Stores log of all webhook events received from CartPanda

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id BIGSERIAL PRIMARY KEY,

  -- Event info
  event_type TEXT NOT NULL,
  order_id BIGINT,
  order_number TEXT,

  -- Payload
  payload JSONB NOT NULL,

  -- Processing
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS webhook_events_created_at_idx ON public.webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_events_order_id_idx ON public.webhook_events(order_id);
CREATE INDEX IF NOT EXISTS webhook_events_processed_idx ON public.webhook_events(processed);
CREATE INDEX IF NOT EXISTS webhook_events_event_type_idx ON public.webhook_events(event_type);

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access to webhook_events"
  ON public.webhook_events
  FOR SELECT
  USING (true);

CREATE POLICY "Allow insert to webhook_events"
  ON public.webhook_events
  FOR INSERT
  WITH CHECK (true);

-- View for monitoring
CREATE OR REPLACE VIEW public.webhook_stats AS
SELECT
  event_type,
  COUNT(*) as total_events,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT processed THEN 1 ELSE 0 END) as failed,
  MAX(created_at) as last_event_at
FROM public.webhook_events
GROUP BY event_type
ORDER BY total_events DESC;

COMMENT ON TABLE public.webhook_events IS 'Logs all webhook events received from CartPanda';
COMMENT ON VIEW public.webhook_stats IS 'Webhook processing statistics by event type';
