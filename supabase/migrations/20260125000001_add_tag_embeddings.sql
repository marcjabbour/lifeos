-- Migration: Add tag embeddings table for semantic tag search
-- This enables cosine similarity search across item tags

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tag_embeddings table
CREATE TABLE IF NOT EXISTS tag_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tag information
  tag_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,  -- lowercase, trimmed for deduplication

  -- Category mapping (inferred by Nova or user-assigned)
  -- Categories: food, tech, music, entertainment, fitness, travel, work, learning, finance, social, uncategorized
  category TEXT NOT NULL DEFAULT 'uncategorized',

  -- Vector embedding (1536 dimensions for text-embedding-3-small)
  embedding vector(1536) NOT NULL,

  -- Usage tracking
  usage_count INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast similarity search (optimized for cosine distance)
CREATE INDEX IF NOT EXISTS idx_tag_embeddings_vector ON tag_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Unique constraint: one embedding per tag per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_tag_embeddings_user_tag
  ON tag_embeddings(user_id, normalized_name);

-- Index for category-based lookups
CREATE INDEX IF NOT EXISTS idx_tag_embeddings_category
  ON tag_embeddings(user_id, category);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_tag_embeddings_user_id
  ON tag_embeddings(user_id);

-- Enable Row Level Security
ALTER TABLE tag_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tag embeddings"
  ON tag_embeddings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tag embeddings"
  ON tag_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tag embeddings"
  ON tag_embeddings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tag embeddings"
  ON tag_embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tag_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_tag_embeddings_updated_at
  BEFORE UPDATE ON tag_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_embeddings_updated_at();

-- Function to find items by tag similarity
CREATE OR REPLACE FUNCTION match_items_by_tag_similarity(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20,
  filter_user_id uuid DEFAULT NULL,
  filter_categories text[] DEFAULT NULL
)
RETURNS TABLE (
  item_id uuid,
  tag_name text,
  category text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (i.id)
    i.id as item_id,
    te.tag_name,
    te.category,
    (1 - (te.embedding <=> query_embedding))::float as similarity
  FROM items i
  CROSS JOIN LATERAL unnest(i.tags) as item_tag
  INNER JOIN tag_embeddings te
    ON te.normalized_name = lower(trim(item_tag))
    AND te.user_id = i.user_id
  WHERE
    (filter_user_id IS NULL OR i.user_id = filter_user_id)
    AND (filter_categories IS NULL OR te.category = ANY(filter_categories))
    AND (1 - (te.embedding <=> query_embedding)) > match_threshold
    AND i.is_archived = false
  ORDER BY i.id, similarity DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION match_items_by_tag_similarity TO authenticated;
