# LifeOS PWA Installation Guide

LifeOS is a Progressive Web App (PWA) that can be installed on your device for a native app-like experience.

## Benefits of Installing

- **Offline Access** - View your items without internet
- **Push Notifications** - Get notified when Nova finishes processing
- **Quick Launch** - Open from home screen/dock
- **Full Screen** - No browser UI, feels like a native app
- **Background Sync** - Changes sync when back online

## Installation Instructions

### iOS (iPhone/iPad)

1. Open LifeOS in **Safari** (required - other browsers don't support PWA install on iOS)
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Optionally edit the name, then tap **"Add"**
5. LifeOS icon will appear on your home screen

**Note:** iOS 16.4+ required for push notifications.

### Android

#### Chrome
1. Open LifeOS in Chrome
2. Tap the **three-dot menu** (⋮)
3. Tap **"Install app"** or **"Add to Home Screen"**
4. Confirm by tapping **"Install"**

#### Samsung Internet
1. Open LifeOS in Samsung Internet
2. Tap the **menu** button
3. Tap **"Add page to"** → **"Home screen"**

#### Firefox
1. Open LifeOS in Firefox
2. Tap the **three-dot menu**
3. Tap **"Install"**

### Desktop

#### Chrome / Edge
1. Open LifeOS in your browser
2. Look for the **install icon** in the address bar (⊕)
3. Click it and confirm installation
4. LifeOS will open in its own window

#### Safari (macOS Sonoma+)
1. Open LifeOS in Safari
2. Click **File** → **Add to Dock**
3. LifeOS will be added to your Dock

#### Firefox
1. Firefox doesn't support PWA installation
2. Use Chrome or Edge instead, or create a bookmark

## Enabling Push Notifications

After installing:

1. Open LifeOS from your home screen
2. Go to **Settings** → **Notifications**
3. Toggle **"Push Notifications"** on
4. Allow notifications when prompted by your browser/OS

### Notification Types

- **Processing Complete** - When Nova finishes analyzing your content
- **Daily Digest** - Summary of your items (optional)
- **Insights** - When Nova discovers patterns (optional)

## Offline Usage

LifeOS works offline with some limitations:

### Available Offline
- Viewing cached items
- Reading item details
- Browsing your feed
- Viewing past conversations

### Requires Internet
- Adding new items
- Nova AI responses
- Syncing changes
- Push notifications

### Sync Indicator

Look for the sync indicator in the app:
- **Green dot** - Synced and online
- **Yellow dot** - Syncing in progress
- **Gray dot** - Offline (changes queued)

## Troubleshooting

### App Won't Install

**iOS:**
- Make sure you're using Safari
- Check iOS version is 14+
- Try clearing Safari cache

**Android:**
- Clear Chrome/browser cache
- Make sure you're on HTTPS
- Try incognito mode first

**Desktop:**
- Check browser supports PWAs
- Look for install icon in address bar
- Try clearing browser cache

### Notifications Not Working

1. Check notification permissions in browser/OS settings
2. Verify notifications are enabled in LifeOS settings
3. Make sure you installed from HTTPS
4. On iOS, check iOS version is 16.4+

### Offline Mode Not Working

1. Make sure service worker is registered
2. Visit pages while online first (to cache them)
3. Check browser DevTools → Application → Service Workers

### Updating the App

PWAs update automatically. To force an update:

1. Close all LifeOS windows/tabs
2. Wait 24 hours, or:
3. Open DevTools → Application → Service Workers
4. Click "Update" or "Unregister" then refresh

## Uninstalling

### iOS
Long-press the LifeOS icon → Remove App → Delete App

### Android
Long-press the icon → App info → Uninstall
Or: Settings → Apps → LifeOS → Uninstall

### Desktop (Chrome)
Three-dot menu → More tools → Uninstall LifeOS

### Desktop (Edge)
Settings → Apps → Installed apps → Remove LifeOS

## Technical Details

LifeOS PWA includes:
- **Service Worker** - Caches assets and API responses
- **Web App Manifest** - Defines app metadata and icons
- **Background Sync** - Queues changes when offline
- **Push API** - Enables push notifications

For developers, see `public/manifest.json` and `public/sw.js`.
