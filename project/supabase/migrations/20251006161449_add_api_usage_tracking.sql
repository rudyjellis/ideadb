/*
  # API Usage Tracking and Cost Monitoring

  ## Overview
  This migration adds comprehensive API usage tracking and cost monitoring capabilities.
  Users can track every Claude API call, monitor spending, set alerts, and analyze usage patterns.

  ## New Tables

  ### `api_usage_logs`
  Tracks every Claude API call with detailed token usage and cost information.
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References users(id)
  - `idea_id` (uuid, foreign key, nullable) - References ideas(id) if applicable
  - `operation_type` (text) - Type of operation: extract_idea, generate_prd, generate_gtm, generate_marketing
  - `model_used` (text) - Claude model version used
  - `input_tokens` (integer) - Number of input tokens consumed
  - `output_tokens` (integer) - Number of output tokens generated
  - `total_tokens` (integer) - Total tokens (input + output)
  - `cost_usd` (decimal) - Cost in USD for this operation
  - `created_at` (timestamptz) - When the API call was made

  ### `spending_alerts`
  Tracks user alert configurations and notification history.
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References users(id)
  - `alert_type` (text) - Type: per_operation, monthly_budget
  - `threshold_usd` (decimal) - Alert threshold in USD
  - `enabled` (boolean) - Whether alert is active
  - `last_triggered_at` (timestamptz) - Last time alert was triggered
  - `created_at` (timestamptz) - When alert was created
  - `updated_at` (timestamptz) - Last update time

  ## Modifications to Existing Tables

  ### `ideas` table
  Add cost tracking columns to track cumulative spending per idea:
  - `extraction_cost` (decimal) - Cost of initial idea extraction
  - `prd_cost` (decimal) - Cost of PRD generation
  - `gtm_cost` (decimal) - Cost of GTM strategy generation
  - `marketing_cost` (decimal) - Cost of marketing plan generation
  - `total_cost` (decimal) - Sum of all costs for this idea

  ### `user_api_keys` table
  Add balance tracking:
  - `last_balance_usd` (decimal) - Last fetched Anthropic account balance
  - `last_balance_check` (timestamptz) - When balance was last checked

  ## Security
  - RLS enabled on all new tables
  - Users can only access their own usage logs and alerts
  - Indexes added for performance on common queries

  ## Notes
  - Cost calculations based on Claude Sonnet 4 pricing: $3/M input tokens, $15/M output tokens
  - Default per-operation alert threshold: $0.50
  - Default monthly budget alert: $50.00
  - All costs stored with precision to 6 decimal places
*/

-- Create api_usage_logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id uuid REFERENCES ideas(id) ON DELETE SET NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('extract_idea', 'generate_prd', 'generate_gtm', 'generate_marketing')),
  model_used text NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost_usd decimal(10, 6) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create spending_alerts table
CREATE TABLE IF NOT EXISTS spending_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('per_operation', 'monthly_budget')),
  threshold_usd decimal(10, 2) NOT NULL,
  enabled boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add cost tracking columns to ideas table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'extraction_cost'
  ) THEN
    ALTER TABLE ideas ADD COLUMN extraction_cost decimal(10, 6) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'prd_cost'
  ) THEN
    ALTER TABLE ideas ADD COLUMN prd_cost decimal(10, 6) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'gtm_cost'
  ) THEN
    ALTER TABLE ideas ADD COLUMN gtm_cost decimal(10, 6) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'marketing_cost'
  ) THEN
    ALTER TABLE ideas ADD COLUMN marketing_cost decimal(10, 6) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE ideas ADD COLUMN total_cost decimal(10, 6) DEFAULT 0;
  END IF;
END $$;

-- Add balance tracking to user_api_keys table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_api_keys' AND column_name = 'last_balance_usd'
  ) THEN
    ALTER TABLE user_api_keys ADD COLUMN last_balance_usd decimal(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_api_keys' AND column_name = 'last_balance_check'
  ) THEN
    ALTER TABLE user_api_keys ADD COLUMN last_balance_check timestamptz;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_usage_logs table
CREATE POLICY "Users can view own usage logs"
  ON api_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs"
  ON api_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for spending_alerts table
CREATE POLICY "Users can view own spending alerts"
  ON spending_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spending alerts"
  ON spending_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spending alerts"
  ON spending_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own spending alerts"
  ON spending_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_operation_type ON api_usage_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_idea_id ON api_usage_logs(idea_id);
CREATE INDEX IF NOT EXISTS idx_spending_alerts_user_id ON spending_alerts(user_id);

-- Insert default spending alerts for existing users
INSERT INTO spending_alerts (user_id, alert_type, threshold_usd, enabled)
SELECT id, 'per_operation', 0.50, true
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM spending_alerts
  WHERE spending_alerts.user_id = users.id
  AND spending_alerts.alert_type = 'per_operation'
);

INSERT INTO spending_alerts (user_id, alert_type, threshold_usd, enabled)
SELECT id, 'monthly_budget', 50.00, true
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM spending_alerts
  WHERE spending_alerts.user_id = users.id
  AND spending_alerts.alert_type = 'monthly_budget'
);

-- Function to create default spending alerts for new users
CREATE OR REPLACE FUNCTION public.create_default_spending_alerts()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.spending_alerts (user_id, alert_type, threshold_usd, enabled)
  VALUES 
    (new.id, 'per_operation', 0.50, true),
    (new.id, 'monthly_budget', 50.00, true);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default spending alerts for new users
DROP TRIGGER IF EXISTS on_user_created_spending_alerts ON users;
CREATE TRIGGER on_user_created_spending_alerts
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_spending_alerts();
