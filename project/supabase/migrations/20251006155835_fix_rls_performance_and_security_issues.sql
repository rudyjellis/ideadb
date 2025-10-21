/*
  # Fix RLS Performance and Security Issues

  ## Overview
  This migration addresses security and performance issues identified by Supabase:
  1. Optimizes RLS policies by wrapping auth functions in SELECT
  2. Removes conflicting permissive policies on ideas table
  3. Fixes function search_path security issue
  
  ## Changes
  
  ### RLS Policy Optimization
  All policies now use `(select auth.uid())` instead of `auth.uid()` to prevent
  re-evaluation for each row, significantly improving query performance at scale.
  
  ### Tables Updated
  - `users` - 3 policies optimized
  - `user_api_keys` - 4 policies optimized  
  - `ideas` - 4 policies optimized + removed conflicting old policies
  
  ### Function Security
  - Fixed `handle_new_user` function to use immutable search_path
  
  ## Note on Unused Indexes
  Indexes `idx_user_api_keys_user_id` and `idx_ideas_user_id` are kept as they
  will be used once the application has data and queries scale.
*/

-- Drop all existing RLS policies to rebuild them optimally
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

DROP POLICY IF EXISTS "Users can view own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can insert own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON user_api_keys;

DROP POLICY IF EXISTS "Allow public access to ideas" ON ideas;
DROP POLICY IF EXISTS "Users can view own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can insert own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can update own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can delete own ideas" ON ideas;

-- Optimized RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Optimized RLS Policies for user_api_keys table
CREATE POLICY "Users can view own API keys"
  ON user_api_keys FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own API keys"
  ON user_api_keys FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own API keys"
  ON user_api_keys FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own API keys"
  ON user_api_keys FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Optimized RLS Policies for ideas table (single set, no conflicts)
CREATE POLICY "Users can view own ideas"
  ON ideas FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own ideas"
  ON ideas FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own ideas"
  ON ideas FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own ideas"
  ON ideas FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Fix function security by setting immutable search_path
-- Drop trigger first, then function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, last_login_at)
  VALUES (new.id, new.email, now(), now());
  RETURN new;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
