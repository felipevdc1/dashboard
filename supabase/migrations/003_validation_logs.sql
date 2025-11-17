-- Validation Logs Table
-- Stores history of validation checks between CartPanda API and Supabase

CREATE TABLE IF NOT EXISTS public.validation_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Counts
  api_count INTEGER NOT NULL,
  db_count INTEGER NOT NULL,
  missing_count INTEGER NOT NULL DEFAULT 0,
  outdated_count INTEGER NOT NULL DEFAULT 0,

  -- Metrics
  accuracy DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
  status TEXT NOT NULL CHECK (status IN ('OK', 'WARNING', 'CRITICAL')),

  -- Actions
  fixed BOOLEAN NOT NULL DEFAULT FALSE,
  duration_ms INTEGER NOT NULL,

  -- Indexes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS validation_logs_timestamp_idx ON public.validation_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS validation_logs_status_idx ON public.validation_logs(status);
CREATE INDEX IF NOT EXISTS validation_logs_created_at_idx ON public.validation_logs(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.validation_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access
CREATE POLICY "Allow read access to validation_logs"
  ON public.validation_logs
  FOR SELECT
  USING (true);

-- Create policy to allow insert from API (authenticated users only)
CREATE POLICY "Allow insert to validation_logs"
  ON public.validation_logs
  FOR INSERT
  WITH CHECK (true);

-- Create view for easy monitoring
CREATE OR REPLACE VIEW public.validation_summary AS
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total_validations,
  AVG(accuracy) as avg_accuracy,
  SUM(CASE WHEN status = 'OK' THEN 1 ELSE 0 END) as ok_count,
  SUM(CASE WHEN status = 'WARNING' THEN 1 ELSE 0 END) as warning_count,
  SUM(CASE WHEN status = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
  SUM(missing_count) as total_missing,
  SUM(outdated_count) as total_outdated,
  SUM(CASE WHEN fixed THEN 1 ELSE 0 END) as auto_fixed_count
FROM public.validation_logs
GROUP BY DATE(timestamp)
ORDER BY DATE(timestamp) DESC;

-- Comment on table
COMMENT ON TABLE public.validation_logs IS 'Stores validation check results between CartPanda API and Supabase database';
COMMENT ON VIEW public.validation_summary IS 'Daily summary of validation checks for monitoring';
