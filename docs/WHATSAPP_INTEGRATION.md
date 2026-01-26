# WhatsApp Integration

LifeOS supports saving content and querying your saved items via WhatsApp using Twilio's WhatsApp API.

## Overview

The WhatsApp integration allows you to:
- **Save links** - Forward URLs to LifeOS for later
- **Save images/screenshots** - Send photos to be saved and categorized
- **Save text notes** - Quick capture thoughts and notes
- **Query your items** - Ask questions like "show me my food items" or "what did I save last week?"
- **Use commands** - `/help`, `/recent`, `/search <term>`

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐     ┌──────────┐
│  WhatsApp   │────▶│   Twilio    │────▶│  /api/whatsapp/     │────▶│ Supabase │
│    User     │◀────│   Sandbox   │◀────│     webhook         │◀────│    DB    │
└─────────────┘     └─────────────┘     └─────────────────────┘     └──────────┘
```

### Key Components

| Component | Path | Description |
|-----------|------|-------------|
| Webhook Handler | `src/app/api/whatsapp/webhook/route.ts` | Receives and processes incoming WhatsApp messages |
| Link API | `src/app/api/whatsapp/link/route.ts` | Generates verification codes and manages account linking |
| Twilio Client | `lib/services/whatsapp/twilio-client.ts` | Twilio API wrapper with signature validation |
| Message Parser | `lib/services/whatsapp/message-parser.ts` | Parses incoming messages and detects user intent |
| Response Formatter | `lib/services/whatsapp/response-formatter.ts` | Formats WhatsApp-friendly response messages |

### Database Tables

| Table | Purpose |
|-------|---------|
| `whatsapp_users` | Links WhatsApp phone numbers to LifeOS user accounts |
| `whatsapp_messages` | Logs all inbound/outbound messages for debugging |
| `whatsapp_link_codes` | Stores 6-digit verification codes for account linking |

---

## Development Setup

### Prerequisites

1. A [Twilio account](https://www.twilio.com/try-twilio) (free tier works)
2. [ngrok](https://ngrok.com/) for exposing localhost to the internet
3. LifeOS running locally (`npm run dev`)

### Step 1: Configure Environment Variables

Add to `.env.local`:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Where to find these:**
- **Account SID & Auth Token**: [Twilio Console Dashboard](https://console.twilio.com/)
- **WhatsApp Number**: For sandbox, use `whatsapp:+14155238886` (Twilio's sandbox number)

### Step 2: Start ngrok

```bash
# Start your dev server
npm run dev

# In another terminal, expose port 3000
ngrok http 3000
```

Copy the `https://` forwarding URL (e.g., `https://abc123.ngrok-free.app`)

### Step 3: Configure Twilio Sandbox

1. Go to [Twilio WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox)
2. Join the sandbox by sending the code shown to the WhatsApp number
3. Set **"When a message comes in"** to:
   ```
   https://YOUR-NGROK-URL/api/whatsapp/webhook
   ```
4. Set method to **POST**
5. Click **Save**

### Step 4: Link Your Account

1. Generate a 6-digit verification code:
   - Through the LifeOS UI (if available)
   - Or via API: `POST /api/whatsapp/link` with auth token
   - Or manually in database for testing

2. Send the 6-digit code to the Twilio WhatsApp number

3. You should receive a welcome message confirming the link

### Step 5: Test It Out

Send messages to the WhatsApp number:
- A URL like `https://example.com/article`
- Plain text like "Remember to buy groceries"
- An image/screenshot
- A query like "show me my recent items"

---

## Production Deployment

### Step 1: Get a Twilio WhatsApp Business Number

For production, you need a dedicated WhatsApp Business number:

1. Go to [Twilio Console > Messaging > Senders > WhatsApp Senders](https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders)
2. Click **"New WhatsApp Sender"**
3. Follow the process to:
   - Register a phone number
   - Create a WhatsApp Business Profile
   - Get approved by WhatsApp (can take 1-7 days)

### Step 2: Update Environment Variables

Update your production environment (Vercel, etc.):

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+1YOURNUMBER
```

**Important:** Use your approved WhatsApp Business number, not the sandbox number.

### Step 3: Configure Production Webhook

In Twilio Console, update the webhook URL to your production domain:

```
https://yourdomain.com/api/whatsapp/webhook
```

### Step 4: Enable Signature Validation

The webhook validates Twilio signatures in production. Ensure:
- `NODE_ENV=production` is set
- `TWILIO_AUTH_TOKEN` matches your Twilio account

### Step 5: Message Templates (Optional)

For proactive messaging (sending messages first), you need approved message templates:

1. Go to [Content Template Builder](https://console.twilio.com/us1/develop/sms/content-template-builder)
2. Create templates for notifications, reminders, etc.
3. Submit for WhatsApp approval

---

## API Reference

### POST /api/whatsapp/webhook

Receives incoming WhatsApp messages from Twilio. Not authenticated (uses Twilio signature validation).

**Request:** Twilio webhook payload (form-urlencoded)

**Response:** TwiML XML (empty response, we send replies via API)

### POST /api/whatsapp/link

Generate a verification code to link WhatsApp. Requires authentication.

**Response:**
```json
{
  "success": true,
  "code": "123456",
  "expires_at": "2024-01-26T02:00:00.000Z",
  "instructions": "Send this code to the LifeOS WhatsApp bot to link your account."
}
```

### GET /api/whatsapp/link

Check WhatsApp link status. Requires authentication.

**Response (linked):**
```json
{
  "linked": true,
  "phone_number": "********3776",
  "display_name": "Marc",
  "verified_at": "2024-01-26T01:35:34.857Z",
  "last_message_at": "2024-01-26T02:00:00.000Z"
}
```

**Response (not linked):**
```json
{
  "linked": false,
  "pending_code": {
    "code": "123456",
    "expires_at": "2024-01-26T02:00:00.000Z"
  }
}
```

### DELETE /api/whatsapp/link

Unlink WhatsApp account. Requires authentication.

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp account unlinked successfully"
}
```

---

## Message Types & Intent Detection

The system automatically detects what you're trying to do:

| You Send | Detected Intent | Action |
|----------|-----------------|--------|
| `https://example.com/article` | `save_link` | Saves URL to items |
| `Check out this: https://...` | `save_link` | Extracts and saves URL |
| Image/photo | `save_image` | Saves image reference |
| `Remember to buy milk` | `save_text` | Saves as text note |
| `show me food items` | `query` | Searches and returns results |
| `what's my recent tech stuff?` | `query` | Filters by category |
| `/help` | `command` | Shows help message |
| `/recent` | `command` | Shows recent items |
| `/search pizza` | `command` | Searches for "pizza" |

---

## Troubleshooting

### "Invalid code" when verifying

- Code may have expired (15 minute limit)
- Code may have already been used
- Generate a new code and try again

### Messages not being received

1. Check ngrok is running and URL is correct in Twilio
2. Check Twilio debugger: https://console.twilio.com/us1/monitor/logs/debugger
3. Verify webhook URL ends with `/api/whatsapp/webhook`

### "Twilio could not find a Channel" error (63007)

- Your `TWILIO_WHATSAPP_NUMBER` doesn't match a valid WhatsApp sender
- For sandbox: use `whatsapp:+14155238886`
- For production: use your approved WhatsApp Business number

### Signature validation failing

- Ensure `TWILIO_AUTH_TOKEN` is correct
- Check the webhook URL in Twilio matches exactly what's being called
- In development, signature validation is skipped

---

## Security Considerations

1. **Signature Validation**: All production webhooks validate Twilio signatures
2. **Rate Limiting**: Consider adding rate limits for abuse prevention
3. **Phone Number Privacy**: Phone numbers are masked in API responses
4. **Auth Token**: Never expose `TWILIO_AUTH_TOKEN` in client-side code
5. **Message Logging**: Messages are logged for debugging - ensure compliance with privacy policies

---

## Cost Considerations

### Twilio Pricing (as of 2024)

| Item | Cost |
|------|------|
| WhatsApp conversation (user-initiated) | ~$0.005-0.08 per conversation |
| WhatsApp conversation (business-initiated) | ~$0.01-0.15 per conversation |
| Phone number | ~$1-2/month |

A "conversation" is a 24-hour messaging window. Multiple messages within 24 hours count as one conversation.

### Cost Optimization

- User-initiated conversations (they message first) are cheaper
- Batch notifications into single messages when possible
- Use message templates efficiently
