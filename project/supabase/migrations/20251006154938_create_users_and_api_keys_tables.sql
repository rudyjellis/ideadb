/*
  # User Authentication and API Key Management Schema

  ## Overview
  This migration sets up secure user authentication and encrypted API key storage for multi-user support.
  
  ## New Tables
  
  ### `users`
  Stores basic user profile information linked to Supabase Auth.
  - `id` (uuid, primary key) - References auth.users(id)
  - `email` (text, unique) - User's email address
  - `created_at` (timestamptz) - Account creation timestamp
  - `last_login_at` (timestamptz) - Last login timestamp
  
  ### `user_api_keys`
  Stores encrypted Claude API keys for each user.
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References users(id)
  - `encrypted_api_key` (text) - Encrypted Claude API key
  - `key_last_four` (text) - Last 4 characters for display (unencrypted)
  - `created_at` (timestamptz) - Key creation timestamp
  - `last_used_at` (timestamptz) - Last time key was used
  - `is_valid` (boolean) - Whether the key is currently valid
  
  ## Security
  
  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Users can only access their own data
  - Authenticated users required for all operations
  
  ### Policies
  
  #### users table:
  1. Users can view their own profile
  2. Users can update their own profile
  3. New users can insert their own profile (on signup)
  
  #### user_api_keys table:
  1. Users can view only their own API keys
  2. Users can insert their own API keys
  3. Users can update only their own API keys
  4. Users can delete only their own API keys
  
  ## Modifications to Existing Tables
  
  ### `ideas` table
  - Add `user_id` column to link ideas to users
  - Update RLS policies to ensure users only see their own ideas
  
  ## Notes
  - API keys are stored encrypted for security
  - Only the last 4 characters are stored unencrypted for UI display
  - The encryption/decryption happens in Edge Functions, never in the browser
  - Users table is automatically populated via trigger when auth.users record is created
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login_at timestamptz DEFAULT now()
);

-- Create user_api_keys table
CREATE TABLE IF NOT EXISTS user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_api_key text NOT NULL,
  key_last_four text,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  is_valid boolean DEFAULT true,
  UNIQUE(user_id)
);

-- Add user_id to ideas table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE ideas ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_api_keys table
CREATE POLICY "Users can view own API keys"
  ON user_api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys"
  ON user_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON user_api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON user_api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update RLS policies for ideas table to include user_id
DROP POLICY IF EXISTS "Anyone can view ideas" ON ideas;
DROP POLICY IF EXISTS "Anyone can insert ideas" ON ideas;
DROP POLICY IF EXISTS "Anyone can update ideas" ON ideas;
DROP POLICY IF EXISTS "Anyone can delete ideas" ON ideas;

CREATE POLICY "Users can view own ideas"
  ON ideas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ideas"
  ON ideas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ideas"
  ON ideas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ideas"
  ON ideas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, last_login_at)
  VALUES (new.id, new.email, now(), now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
