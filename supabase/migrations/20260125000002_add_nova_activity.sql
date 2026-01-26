-- Migration: Add nova_activity table for tracking Nova's actions with rationale
-- This enables tooltips showing why Nova took each action

-- Create nova_activity table
CREATE TABLE IF NOT EXISTS nova_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Activity details
  action_type TEXT NOT NULL,  -- 'enriched', 'categorized', 'connected', 'organized', 'reminded', 'processed'
  action_summary TEXT NOT NULL,  -- "Enriched video transcript with key insights"

  -- Rationale for the action (shown in tooltip on hover)
  rationale TEXT,  -- "You sent me a screenshot of Entrecote so I figured you wanted me to remind you..."

  -- Related item (optional, for linking back to the item)
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,

  -- Visual indicator color
  -- Values: 'purple', 'amber', 'green', 'blue', 'pink', 'cyan', 'coral', 'indigo'
  dot_color TEXT NOT NULL DEFAULT 'purple',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user activity feed (newest first)
CREATE INDEX IF NOT EXISTS idx_nova_activity_user_time
  ON nova_activity(user_id, created_at DESC);

-- Index for item-related activity
CREATE INDEX IF NOT EXISTS idx_nova_activity_item
  ON nova_activity(item_id)
  WHERE item_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE nova_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Nova activity"
  ON nova_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert Nova activity"
  ON nova_activity FOR INSERT
  WITH CHECK (true);  -- Insert restricted to service role via API

-- Function to get recent Nova activity with rationale
CREATE OR REPLACE FUNCTION get_nova_activity(
  filter_user_id uuid,
  activity_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  action_type text,
  action_summary text,
  rationale text,
  item_id uuid,
  dot_color text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    na.id,
    na.action_type,
    na.action_summary,
    na.rationale,
    na.item_id,
    na.dot_color,
    na.created_at
  FROM nova_activity na
  WHERE na.user_id = filter_user_id
  ORDER BY na.created_at DESC
  LIMIT activity_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_nova_activity TO authenticated;
