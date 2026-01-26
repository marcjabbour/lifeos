-- Migration: Add pending_clarifications table for WhatsApp clarification flow
-- This table stores pending clarification requests when Nova detects ambiguous content

CREATE TABLE pending_clarifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    whatsapp_user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
    original_content TEXT NOT NULL,
    interpretations JSONB NOT NULL DEFAULT '[]',
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'expired', 'cancelled')),
    resolved_interpretation JSONB,
    resolved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX idx_pending_clarifications_user_id ON pending_clarifications(user_id);
CREATE INDEX idx_pending_clarifications_whatsapp_user_id ON pending_clarifications(whatsapp_user_id);
CREATE INDEX idx_pending_clarifications_item_id ON pending_clarifications(item_id);
CREATE INDEX idx_pending_clarifications_status ON pending_clarifications(status) WHERE status = 'pending';
CREATE INDEX idx_pending_clarifications_created_at ON pending_clarifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE pending_clarifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own pending clarifications"
    ON pending_clarifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pending clarifications"
    ON pending_clarifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending clarifications"
    ON pending_clarifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending clarifications"
    ON pending_clarifications FOR DELETE
    USING (auth.uid() = user_id);

-- Service role bypass for background jobs
CREATE POLICY "Service role can manage all pending clarifications"
    ON pending_clarifications FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pending_clarifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_pending_clarifications_updated_at
    BEFORE UPDATE ON pending_clarifications
    FOR EACH ROW
    EXECUTE FUNCTION update_pending_clarifications_updated_at();

-- Function to expire old pending clarifications (can be called by a cron job)
CREATE OR REPLACE FUNCTION expire_old_clarifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE pending_clarifications
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION expire_old_clarifications TO service_role;

-- Add a helpful comment
COMMENT ON TABLE pending_clarifications IS 'Stores pending clarification requests for ambiguous content detected by Nova AI, primarily used via WhatsApp integration';
