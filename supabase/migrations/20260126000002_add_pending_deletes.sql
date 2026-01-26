-- Migration: Add pending_deletes table for WhatsApp delete confirmation flow
-- This table tracks pending delete operations that require user confirmation

CREATE TABLE pending_deletes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_user_id UUID NOT NULL UNIQUE REFERENCES whatsapp_users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Cached recent items for /delete [number] selection
    recent_items JSONB DEFAULT '[]',
    -- The item currently awaiting delete confirmation
    item_to_delete JSONB,
    awaiting_confirmation BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pending_deletes_user_id ON pending_deletes(user_id);
CREATE INDEX idx_pending_deletes_awaiting ON pending_deletes(awaiting_confirmation) WHERE awaiting_confirmation = true;

-- Enable Row Level Security
ALTER TABLE pending_deletes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own pending deletes"
    ON pending_deletes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pending deletes"
    ON pending_deletes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending deletes"
    ON pending_deletes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending deletes"
    ON pending_deletes FOR DELETE
    USING (auth.uid() = user_id);

-- Service role bypass for webhook handler
CREATE POLICY "Service role can manage all pending deletes"
    ON pending_deletes FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER trigger_pending_deletes_updated_at
    BEFORE UPDATE ON pending_deletes
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_users_updated_at();

COMMENT ON TABLE pending_deletes IS 'Tracks pending delete operations requiring user confirmation via WhatsApp';
