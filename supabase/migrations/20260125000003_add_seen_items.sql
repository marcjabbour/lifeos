-- Migration: Add seen_items table for tracking user-viewed items
-- Items marked as seen are hidden from main feed but show green checkmark elsewhere

-- Create seen_items table
CREATE TABLE IF NOT EXISTS seen_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,  -- TEXT since mock items have string IDs
  seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one record per user-item pair
  CONSTRAINT unique_user_item_seen UNIQUE (user_id, item_id)
);

-- Index for efficient lookup of user's seen items
CREATE INDEX IF NOT EXISTS idx_seen_items_user_id ON seen_items(user_id);

-- Index for checking if specific item is seen
CREATE INDEX IF NOT EXISTS idx_seen_items_user_item ON seen_items(user_id, item_id);

-- Enable Row Level Security
ALTER TABLE seen_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own seen items"
  ON seen_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark items as seen"
  ON seen_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unmark items as seen"
  ON seen_items FOR DELETE
  USING (auth.uid() = user_id);

-- Function to check if items are seen (batch)
CREATE OR REPLACE FUNCTION get_seen_item_ids(
  filter_user_id uuid,
  check_item_ids text[]
)
RETURNS TABLE (item_id text, seen_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT si.item_id, si.seen_at
  FROM seen_items si
  WHERE si.user_id = filter_user_id
    AND si.item_id = ANY(check_item_ids);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_seen_item_ids TO authenticated;
