/*
  # Create Generation Sessions Table

  1. Purpose
    - Track ongoing document generation processes
    - Allow users to resume interrupted generations
    - Persist generation state across tab switches and sessions
    - Prevent duplicate API calls and reduce costs

  2. New Tables
    - `generation_sessions`
      - `id` (uuid, primary key) - Unique session identifier
      - `user_id` (uuid, foreign key) - References auth.users
      - `email_preview` (text) - Original email preview input
      - `content_url` (text) - Original content URL input
      - `status` (text) - Current status: 'pending', 'fetching_url', 'extracting', 'generating_prd', 'generating_gtm', 'generating_marketing', 'saving', 'completed', 'failed'
      - `current_step` (integer) - Current step number (1-6)
      - `total_steps` (integer) - Total steps (6)
      - `extracted_idea` (jsonb) - Extracted idea data
      - `prd_content` (text) - Generated PRD document
      - `gtm_content` (text) - Generated GTM document
      - `marketing_content` (text) - Generated marketing document
      - `quality_score` (integer) - Calculated quality score
      - `error_message` (text) - Error details if generation failed
      - `content_source` (text) - Source: 'email_preview', 'url', 'both'
      - `url_fetched_at` (timestamptz) - When URL was fetched
      - `url_fetch_failed` (boolean) - Whether URL fetch failed
      - `idea_id` (uuid, foreign key) - References ideas table when saved
      - `started_at` (timestamptz) - When generation started
      - `completed_at` (timestamptz) - When generation completed
      - `last_updated_at` (timestamptz) - Last update timestamp
      - `created_at` (timestamptz) - Record creation timestamp

  3. Security
    - Enable RLS on `generation_sessions` table
    - Add policy for users to read their own sessions
    - Add policy for users to create their own sessions
    - Add policy for users to update their own sessions
    - Add policy for users to delete their own sessions

  4. Indexes
    - Index on user_id for fast lookups
    - Index on status for filtering active sessions
    - Index on created_at for cleanup queries
*/

CREATE TABLE IF NOT EXISTS generation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_preview text DEFAULT '',
  content_url text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  current_step integer DEFAULT 0,
  total_steps integer DEFAULT 6,
  extracted_idea jsonb,
  prd_content text,
  gtm_content text,
  marketing_content text,
  quality_score integer,
  error_message text,
  content_source text,
  url_fetched_at timestamptz,
  url_fetch_failed boolean DEFAULT false,
  idea_id uuid REFERENCES ideas(id) ON DELETE SET NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation sessions"
  ON generation_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own generation sessions"
  ON generation_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generation sessions"
  ON generation_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generation sessions"
  ON generation_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_generation_sessions_user_id ON generation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_sessions_status ON generation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_generation_sessions_created_at ON generation_sessions(created_at);

COMMENT ON TABLE generation_sessions IS 'Tracks document generation sessions to enable state persistence and resumption';
COMMENT ON COLUMN generation_sessions.status IS 'Current status: pending, fetching_url, extracting, generating_prd, generating_gtm, generating_marketing, saving, completed, failed';
COMMENT ON COLUMN generation_sessions.current_step IS 'Current step number (0-6)';
