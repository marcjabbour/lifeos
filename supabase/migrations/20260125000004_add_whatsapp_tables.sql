-- Migration: Add WhatsApp integration tables
-- Enables phone number linking and message logging for WhatsApp bot integration

-- WhatsApp users table - links phone numbers to LifeOS accounts
CREATE TABLE whatsapp_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    verified_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp messages table - logs all message interactions
CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
    message_sid VARCHAR(50) NOT NULL UNIQUE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'link')),
    content TEXT,
    media_url TEXT,
    media_content_type VARCHAR(100),
    -- Reference to created item if message resulted in content being saved
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp linking codes table - for phone verification flow
CREATE TABLE whatsapp_link_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX idx_whatsapp_users_user_id ON whatsapp_users(user_id);
CREATE INDEX idx_whatsapp_users_phone ON whatsapp_users(phone_number);
CREATE INDEX idx_whatsapp_messages_user_id ON whatsapp_messages(whatsapp_user_id);
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_link_codes_user_id ON whatsapp_link_codes(user_id);
CREATE INDEX idx_whatsapp_link_codes_code ON whatsapp_link_codes(code) WHERE used_at IS NULL;

-- Enable Row Level Security
ALTER TABLE whatsapp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_link_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_users
CREATE POLICY "Users can view their own WhatsApp links"
    ON whatsapp_users FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp links"
    ON whatsapp_users FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp links"
    ON whatsapp_users FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp links"
    ON whatsapp_users FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for whatsapp_messages
CREATE POLICY "Users can view their own WhatsApp messages"
    ON whatsapp_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM whatsapp_users wu
            WHERE wu.id = whatsapp_messages.whatsapp_user_id
            AND wu.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own WhatsApp messages"
    ON whatsapp_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM whatsapp_users wu
            WHERE wu.id = whatsapp_messages.whatsapp_user_id
            AND wu.user_id = auth.uid()
        )
    );

-- RLS Policies for whatsapp_link_codes
CREATE POLICY "Users can view their own link codes"
    ON whatsapp_link_codes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own link codes"
    ON whatsapp_link_codes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own link codes"
    ON whatsapp_link_codes FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_whatsapp_users_updated_at
    BEFORE UPDATE ON whatsapp_users
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_users_updated_at();

-- Function to look up user by phone number (used by webhook)
CREATE OR REPLACE FUNCTION get_user_by_phone(phone TEXT)
RETURNS TABLE (
    user_id UUID,
    whatsapp_user_id UUID,
    display_name VARCHAR(100),
    verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        wu.user_id,
        wu.id as whatsapp_user_id,
        wu.display_name,
        wu.verified_at IS NOT NULL as verified
    FROM whatsapp_users wu
    WHERE wu.phone_number = phone;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_by_phone TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_phone TO service_role;

-- Function to verify a link code and create the WhatsApp user link
CREATE OR REPLACE FUNCTION verify_whatsapp_link_code(
    link_code TEXT,
    phone TEXT,
    name TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    user_id UUID,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_code_id UUID;
BEGIN
    -- Find valid (unused, unexpired) code
    SELECT wlc.user_id, wlc.id INTO v_user_id, v_code_id
    FROM whatsapp_link_codes wlc
    WHERE wlc.code = link_code
    AND wlc.used_at IS NULL
    AND wlc.expires_at > NOW();

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid or expired code'::TEXT;
        RETURN;
    END IF;

    -- Check if phone is already linked to another account
    IF EXISTS (SELECT 1 FROM whatsapp_users wu WHERE wu.phone_number = phone AND wu.user_id != v_user_id) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Phone number already linked to another account'::TEXT;
        RETURN;
    END IF;

    -- Mark code as used
    UPDATE whatsapp_link_codes
    SET used_at = NOW()
    WHERE id = v_code_id;

    -- Create or update WhatsApp user link
    INSERT INTO whatsapp_users (user_id, phone_number, display_name, verified_at)
    VALUES (v_user_id, phone, name, NOW())
    ON CONFLICT (phone_number) DO UPDATE
    SET user_id = v_user_id,
        display_name = COALESCE(name, whatsapp_users.display_name),
        verified_at = NOW(),
        updated_at = NOW();

    RETURN QUERY SELECT true, v_user_id, NULL::TEXT;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION verify_whatsapp_link_code TO authenticated;
GRANT EXECUTE ON FUNCTION verify_whatsapp_link_code TO service_role;
