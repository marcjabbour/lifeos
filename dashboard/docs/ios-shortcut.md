# iOS Shortcuts Integration

LifeOS integrates with iOS Shortcuts to enable quick capture from anywhere on your device.

## Prerequisites

- iOS 15 or later
- LifeOS account with API access
- Your LifeOS API endpoint: `https://your-domain.vercel.app`

---

## Shortcut 1: Share to LifeOS

Capture content from the iOS Share Sheet directly into LifeOS.

### Setup Instructions

1. Open the **Shortcuts** app on your iPhone/iPad
2. Tap **+** to create a new shortcut
3. Tap the shortcut name at the top and rename it to **"Share to LifeOS"**
4. Tap the **i** icon and enable **"Show in Share Sheet"**
5. Under "Receive", select the content types:
   - Text
   - URLs
   - Images
   - Files

### Add Actions

Add these actions in order:

#### Action 1: Get Shortcut Input
- Search for "Shortcut Input" and add it

#### Action 2: Get Contents of URL (API Call)
- Search for "Get Contents of URL" and add it
- Configure:
  ```
  URL: https://your-domain.vercel.app/api/capture
  Method: POST
  Headers:
    Content-Type: application/json
    Authorization: Bearer YOUR_API_KEY
  Request Body: JSON
    {
      "content": [Shortcut Input],
      "type": "share",
      "source": "ios-share-sheet",
      "timestamp": [Current Date - ISO 8601]
    }
  ```

#### Action 3: Show Notification
- Search for "Show Notification" and add it
- Title: "Saved to LifeOS"
- Body: "Your item has been captured"

### API Endpoint Format

```
POST /api/capture

Headers:
  Content-Type: application/json
  Authorization: Bearer <api_key>

Body:
{
  "content": string | object,
  "type": "share" | "voice" | "note" | "url" | "image",
  "source": "ios-share-sheet" | "siri" | "widget",
  "timestamp": "ISO 8601 date string",
  "metadata": {
    "title": "optional title",
    "url": "optional source URL",
    "app": "source app name"
  }
}

Response:
{
  "success": true,
  "id": "captured_item_id",
  "message": "Item captured successfully"
}
```

---

## Shortcut 2: Hey Siri, LifeOS

Voice-activated capture using Siri.

### Setup Instructions

1. Open the **Shortcuts** app
2. Tap **+** to create a new shortcut
3. Rename it to **"LifeOS"** (this becomes your Siri phrase)

### Add Actions

#### Action 1: Dictate Text
- Search for "Dictate Text" and add it
- This captures your voice input

#### Action 2: Get Contents of URL (API Call)
- Search for "Get Contents of URL" and add it
- Configure:
  ```
  URL: https://your-domain.vercel.app/api/capture
  Method: POST
  Headers:
    Content-Type: application/json
    Authorization: Bearer YOUR_API_KEY
  Request Body: JSON
    {
      "content": [Dictated Text],
      "type": "voice",
      "source": "siri",
      "timestamp": [Current Date - ISO 8601]
    }
  ```

#### Action 3: Speak Text (Confirmation)
- Search for "Speak Text" and add it
- Text: "Got it. Saved to LifeOS."

### Usage

Say: **"Hey Siri, LifeOS"**

Siri will:
1. Ask "What would you like to capture?"
2. Listen to your response
3. Send it to LifeOS
4. Confirm with "Got it. Saved to LifeOS."

---

## Shortcut 3: Quick Add Task (Optional)

Dedicated shortcut for adding tasks with natural language.

### Setup Instructions

1. Create new shortcut named **"Add Task"**
2. Add Siri phrase: "Add task to LifeOS"

### Add Actions

#### Action 1: Ask for Input
- Type: Text
- Prompt: "What's the task?"

#### Action 2: Get Contents of URL
```
URL: https://your-domain.vercel.app/api/capture
Method: POST
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_API_KEY
Body:
{
  "content": [Provided Input],
  "type": "task",
  "source": "siri",
  "timestamp": [Current Date - ISO 8601],
  "metadata": {
    "parse_natural_language": true
  }
}
```

#### Action 3: Show Notification
- Title: "Task Added"
- Body: [Provided Input]

---

## Getting Your API Key

1. Open LifeOS in your browser
2. Go to Settings > API Access
3. Generate a new API key
4. Copy the key and use it in your shortcuts

**Security Note:** Your API key is like a password. Keep it secret and don't share your shortcuts with the key embedded.

---

## Troubleshooting

### "Couldn't connect to server"
- Check your internet connection
- Verify the API URL is correct
- Ensure LifeOS is deployed and running

### "Unauthorized" error
- Check your API key is correct
- Ensure the Authorization header format is `Bearer YOUR_KEY`

### Shortcut not appearing in Share Sheet
- Open shortcut settings (tap **i** icon)
- Ensure "Show in Share Sheet" is enabled
- Restart the Shortcuts app

### Siri not recognizing the shortcut
- The shortcut name becomes the Siri phrase
- Try renaming to something simpler
- Re-record the Siri phrase in shortcut settings

---

## Advanced: Automation Ideas

### Auto-capture Safari Reading List
Create an automation that runs when you add to Reading List:
1. Shortcuts > Automation > Create Personal Automation
2. Trigger: "When [Safari Reading List] changes"
3. Action: Send URL to LifeOS /api/capture

### Location-based Reminders
Capture location when arriving/leaving places:
1. Trigger: "When I arrive at [Location]"
2. Action: Log to LifeOS with location metadata

### Screenshot Capture
Auto-send screenshots to LifeOS:
1. Trigger: "When screenshot is taken"
2. Action: Upload image to LifeOS /api/capture with type "image"
