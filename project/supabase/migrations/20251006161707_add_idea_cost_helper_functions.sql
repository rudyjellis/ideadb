/*
  # Helper Functions for Idea Cost Calculations

  ## Overview
  This migration adds database functions to automatically calculate and update total costs for ideas.

  ## New Functions

  ### `update_idea_total_cost`
  Calculates the total cost for an idea by summing extraction_cost, prd_cost, gtm_cost, and marketing_cost.
  Updates the total_cost column automatically.

  ### `calculate_idea_total_cost_trigger`
  Trigger function that automatically updates total_cost whenever any of the individual cost columns change.

  ## Usage
  - The trigger runs automatically on INSERT or UPDATE of ideas table
  - Can also be called manually via RPC: `supabase.rpc('update_idea_total_cost', { idea_id: 'uuid' })`
  
  ## Notes
  - Uses COALESCE to treat NULL values as 0
  - Ensures total_cost is always accurate and up-to-date
*/

-- Function to manually update idea total cost
CREATE OR REPLACE FUNCTION update_idea_total_cost(idea_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE ideas
  SET total_cost = COALESCE(extraction_cost, 0) + COALESCE(prd_cost, 0) + COALESCE(gtm_cost, 0) + COALESCE(marketing_cost, 0)
  WHERE id = idea_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically update total_cost when individual costs change
CREATE OR REPLACE FUNCTION calculate_idea_total_cost_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.total_cost := COALESCE(NEW.extraction_cost, 0) + COALESCE(NEW.prd_cost, 0) + COALESCE(NEW.gtm_cost, 0) + COALESCE(NEW.marketing_cost, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_calculate_idea_total_cost ON ideas;

-- Create trigger to automatically update total_cost
CREATE TRIGGER trigger_calculate_idea_total_cost
  BEFORE INSERT OR UPDATE OF extraction_cost, prd_cost, gtm_cost, marketing_cost ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION calculate_idea_total_cost_trigger();
