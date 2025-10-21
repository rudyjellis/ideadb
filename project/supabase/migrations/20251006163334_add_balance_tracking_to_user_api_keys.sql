/*
  # Add Balance Tracking to User API Keys

  ## Purpose
  Enables users to manually track their Anthropic account balance by syncing it from the console.
  Provides foundation for future Admin API integration for automated balance tracking.

  ## Changes Made

  1. **New Columns Added to `user_api_keys` Table:**
     - `starting_balance_usd` (DECIMAL(10,2)): Stores the user's manually entered balance from Anthropic console
     - `balance_synced_at` (TIMESTAMPTZ): Timestamp of when the user last updated their balance
     - `balance_sync_source` (TEXT): Tracks whether balance was set manually or via Admin API (future)
     - `low_balance_threshold_usd` (DECIMAL(10,2)): Customizable threshold for low balance alerts (default: $10.00)

  ## Usage Flow
  1. User checks their balance at console.anthropic.com
  2. User enters their current balance in Settings page
  3. System tracks spending from that sync point forward
  4. System calculates remaining balance and shows alerts as it approaches zero

  ## Future Admin API Integration
  The `balance_sync_source` column allows easy transition to automated balance fetching
  when the app switches to using an Admin API key for organization accounts.

  ## Security
  - All columns are nullable to support existing users
  - RLS policies already in place on user_api_keys table protect this data
*/

-- Add balance tracking columns to user_api_keys table
DO $$
BEGIN
  -- Add starting_balance_usd column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_api_keys' AND column_name = 'starting_balance_usd'
  ) THEN
    ALTER TABLE user_api_keys 
    ADD COLUMN starting_balance_usd DECIMAL(10,2) DEFAULT NULL;
  END IF;

  -- Add balance_synced_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_api_keys' AND column_name = 'balance_synced_at'
  ) THEN
    ALTER TABLE user_api_keys 
    ADD COLUMN balance_synced_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  -- Add balance_sync_source column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_api_keys' AND column_name = 'balance_sync_source'
  ) THEN
    ALTER TABLE user_api_keys 
    ADD COLUMN balance_sync_source TEXT DEFAULT 'manual';
  END IF;

  -- Add low_balance_threshold_usd column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_api_keys' AND column_name = 'low_balance_threshold_usd'
  ) THEN
    ALTER TABLE user_api_keys 
    ADD COLUMN low_balance_threshold_usd DECIMAL(10,2) DEFAULT 10.00;
  END IF;
END $$;

-- Add check constraint to ensure balance values are non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_api_keys_starting_balance_check'
  ) THEN
    ALTER TABLE user_api_keys 
    ADD CONSTRAINT user_api_keys_starting_balance_check 
    CHECK (starting_balance_usd IS NULL OR starting_balance_usd >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_api_keys_threshold_check'
  ) THEN
    ALTER TABLE user_api_keys 
    ADD CONSTRAINT user_api_keys_threshold_check 
    CHECK (low_balance_threshold_usd >= 0);
  END IF;
END $$;

-- Add index for efficient balance queries
CREATE INDEX IF NOT EXISTS idx_user_api_keys_balance_synced_at 
ON user_api_keys(balance_synced_at) 
WHERE balance_synced_at IS NOT NULL;