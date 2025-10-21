/*
  # Create ideas table for startup idea extraction tool

  1. New Tables
    - `ideas`
      - `id` (uuid, primary key) - Unique identifier for each idea
      - `title` (text, required) - Title of the startup idea
      - `summary` (text) - 2-3 sentence summary of the idea
      - `arr_potential` (text) - Annual recurring revenue potential
      - `pricing` (text) - Pricing model information
      - `target_market` (text) - Target customer segment
      - `market_size` (text) - Market size data
      - `time_to_mvp` (text) - Estimated time to build MVP
      - `capital_needed` (text) - Capital requirements
      - `competition_level` (text) - Low/Medium/High competition assessment
      - `required_skills` (jsonb) - Array of required skills
      - `market_type` (text) - B2B or B2C classification
      - `founder_fit_tags` (jsonb) - Array of founder fit tags
      - `growth_channels` (text) - Distribution and growth channels
      - `key_risks` (text) - Main risks identified
      - `key_opportunities` (text) - Key opportunities
      - `competitors_mentioned` (text) - Competitors if any
      - `source` (text, default: 'IdeaBrowser') - Source of the idea
      - `date_added` (date, default: today) - Date when idea was added
      - `original_link` (text) - Original URL if present
      - `status` (text, default: 'raw') - Processing status
      - `quality_score` (integer) - Auto-calculated quality score 0-100
      - `personal_notes` (text) - User's personal notes
      - `prd_content` (text) - Generated Product Requirements Document
      - `gtm_content` (text) - Generated Go-to-Market Strategy
      - `marketing_content` (text) - Generated Marketing Plan
      - `documents_generated` (boolean, default: false) - Document generation status
      - `created_at` (timestamptz, default: now()) - Timestamp of creation

  2. Security
    - Enable RLS on `ideas` table
    - Add policy for public access (single-user tool, no auth)
*/

CREATE TABLE IF NOT EXISTS ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  arr_potential text,
  pricing text,
  target_market text,
  market_size text,
  time_to_mvp text,
  capital_needed text,
  competition_level text,
  required_skills jsonb DEFAULT '[]'::jsonb,
  market_type text,
  founder_fit_tags jsonb DEFAULT '[]'::jsonb,
  growth_channels text,
  key_risks text,
  key_opportunities text,
  competitors_mentioned text,
  source text DEFAULT 'IdeaBrowser',
  date_added date DEFAULT CURRENT_DATE,
  original_link text,
  status text DEFAULT 'raw',
  quality_score integer,
  personal_notes text,
  prd_content text,
  gtm_content text,
  marketing_content text,
  documents_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to ideas"
  ON ideas
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);