/*
  # Add URL Source Tracking Fields

  1. Changes
    - Add `content_source` field to track whether idea was extracted from URL or email preview
      - Values: 'url', 'email_preview', or 'both'
    - Add `url_fetched_at` field to timestamp when URL content was successfully fetched
    - Add `url_fetch_failed` boolean to track if URL fetch failed (used for fallback scenarios)

  2. Notes
    - The existing `original_link` field stores the URL itself
    - These new fields help track the extraction source and success/failure of URL fetching
    - This enables better analytics and understanding of the 24-hour URL expiration pattern
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'content_source'
  ) THEN
    ALTER TABLE ideas ADD COLUMN content_source text DEFAULT 'email_preview';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'url_fetched_at'
  ) THEN
    ALTER TABLE ideas ADD COLUMN url_fetched_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'url_fetch_failed'
  ) THEN
    ALTER TABLE ideas ADD COLUMN url_fetch_failed boolean DEFAULT false;
  END IF;
END $$;