# iOS Shortcut Setup Guide

This guide explains how to set up an iOS Shortcut to share content to LifeOS from any app on your iPhone or iPad.

## Prerequisites

1. LifeOS account with an API key
2. iOS 15 or later
3. Shortcuts app installed (comes pre-installed)

## Getting Your API Key

1. Log in to LifeOS web dashboard
2. Go to Settings > API Keys
3. Click "Create New API Key"
4. Give it a name like "iOS Shortcut"
5. Copy the API key (you'll need it for the shortcut)

**Important:** Keep your API key secret. Anyone with this key can access your LifeOS account.

## Creating the Shortcut

### Step 1: Open Shortcuts App

1. Open the **Shortcuts** app on your iPhone/iPad
2. Tap the **+** button to create a new shortcut
3. Name it "Share to LifeOS"

### Step 2: Add Share Sheet Input

1. Tap **Add Action**
2. Search for "Receive"
3. Select **Receive [Input] from Share Sheet**
4. Tap "Any" and select the content types you want to share:
   - URLs
   - Text
   - Images (if supported)

### Step 3: Set Up the API Request

1. Tap **Add Action**
2. Search for "Get Contents of URL"
3. Configure as follows:

**URL:**
```
https://your-lifeos-domain.com/api/share
```

**Method:** POST

**Headers:**
- `Authorization`: `Bearer YOUR_API_KEY`
- `Content-Type`: `application/json`

**Request Body:** (JSON)
```json
{
  "content": "[Shortcut Input]",
  "content_type": "url",
  "source": "ios_shortcut"
}
```

### Step 4: Handle the Response

1. Add action: **Get Dictionary Value**
2. Key: `success`
3. Add action: **If**
4. Condition: `equals true`
5. Inside If: Add **Show Notification**
   - Title: "Shared to LifeOS"
   - Body: "Nova is processing your content"
6. Otherwise: Add **Show Alert**
   - Title: "Error"
   - Message: "Failed to share to LifeOS"

### Step 5: Enable Share Sheet

1. Tap the **ℹ️** icon (info) at the top
2. Enable **Show in Share Sheet**
3. Select the content types to show for

## Complete Shortcut Example

Here's the full shortcut flow:

```
1. Receive [URLs, Text] from Share Sheet
2. Set variable "SharedContent" to Shortcut Input
3. Get contents of URL:
   URL: https://your-domain.com/api/share
   Method: POST
   Headers:
     Authorization: Bearer [YOUR_API_KEY]
     Content-Type: application/json
   Body: {
     "content": [SharedContent],
     "content_type": "url",
     "source": "ios_shortcut"
   }
4. Get dictionary value for "success"
5. If [Result] equals true:
   - Show Notification "Shared to LifeOS" / "Nova is processing"
   Otherwise:
   - Show Alert "Error sharing to LifeOS"
```

## Using the Shortcut

1. Open any app with shareable content (Safari, Twitter, etc.)
2. Tap the **Share** button
3. Scroll down and tap **Share to LifeOS**
4. Wait for the notification confirming the share

## Troubleshooting

### "Network Error" or "Could not connect"
- Check your internet connection
- Verify the LifeOS URL is correct
- Make sure the API key is valid

### "Unauthorized" Error
- Your API key may be expired or invalid
- Generate a new API key in Settings

### Shortcut doesn't appear in Share Sheet
- Go to Shortcuts > Your Shortcut > Info
- Enable "Show in Share Sheet"
- Select appropriate content types

### Content not appearing in LifeOS
- Check the LifeOS dashboard for processing status
- Content may still be in Nova's queue

## Advanced: Siri Integration

You can also trigger this shortcut with Siri:

1. Open the shortcut
2. Tap the **ℹ️** icon
3. Add a Siri phrase like "Share to LifeOS"
4. Now say "Hey Siri, Share to LifeOS" while viewing content

## Security Notes

- Your API key is stored locally in the Shortcuts app
- Never share your API key with others
- You can revoke API keys anytime from Settings
- Each API key can have specific scopes (read/write)
