# New Features Documentation

## Overview
Three major features have been added to improve the teleprompter system:

1. **Profile Management System** (10 profiles with settings)
2. **Auto-Save Text Persistence** (never lose your text again)
3. **WebSocket Fallback System** (improved reliability)

---

## 1. Profile Management System

### What it does
- Save up to **10 named profiles** with all your settings
- Each profile remembers: fontSize, speed, padding, lineHeight, mirroring, reading line position, etc.
- Quick load/save with one click
- Edit profile names easily
- Auto-loads last used profile on startup

### How to use
1. **Create a profile:**
   - Adjust your settings (font size, speed, etc.)
   - Click the "➕ New" button in the Profiles section
   - Enter a name for your profile
   - Click "Create"

2. **Load a profile:**
   - Click the profile name button (blue)
   - All settings will be instantly applied

3. **Edit a profile name:**
   - Click the "✏️" button next to the profile
   - Type the new name
   - Press Enter or click "Save"

4. **Delete a profile:**
   - Click the "🗑️" button next to the profile
   - Confirm deletion

5. **Update a profile:**
   - Load the profile you want to update
   - Adjust your settings
   - Click "✏️" and then "Save" to update

### Profile Information
- Location: Left sidebar under "📋 Profiles"
- Maximum profiles: 10
- Storage: Browser localStorage (persists between sessions)
- Each profile shows: font size, speed, and last update date

---

## 2. Auto-Save Text Persistence

### What it does
- **Automatically saves** your text content as you type
- Text is saved to localStorage every 1 second (debounced)
- Automatically **loads your last text** when you reload the page
- **No more Lorem Ipsum** on reload - your work is always preserved!
- Visual indicator shows when text is being saved

### Features
- 💾 **Auto-save indicator** shows "Saving..." then "✓ Saved"
- **Survives page reloads** - your text is always there
- **Text history** - saves last 5 versions (for future undo feature)
- **Instant restore** on page load

### How it works
1. Type or edit your text in the editor
2. Watch for the "💾 Saving..." indicator
3. When it shows "✓ Saved", your text is securely saved
4. Reload the page - your text is automatically restored!

### Storage Location
- Primary storage: `localStorage['teleprompter-current-text']`
- History: `localStorage['teleprompter-text-history']`
- Last save time: `localStorage['teleprompter-last-save']`

---

## 3. WebSocket Fallback System

### What it does
Provides **multiple layers of reliability** to keep your Regie ↔ Ausspielung connection working:

1. **Multiple Server URLs** - tries different WebSocket servers if one fails
2. **Exponential Backoff** - smart retry strategy that doesn't overload servers
3. **localStorage Fallback** - when all WebSocket servers are down, uses browser storage to sync
4. **Connection Quality Monitoring** - tracks and displays connection health
5. **Auto-reconnect** - automatically tries to reconnect when disconnected

### Features

#### Multiple Server Fallback
- Primary server: Your Render.com WebSocket (from VITE_WS_URL)
- Backup server: Secondary Render.com instance
- Local fallback: localhost for development
- Automatically rotates through servers if one fails

#### Smart Reconnection
- **1st attempt:** 1 second delay
- **2nd attempt:** 2 seconds delay
- **3rd attempt:** 4 seconds delay
- **4th attempt:** 8 seconds delay
- **Max delay:** 30 seconds (with random jitter to prevent all clients reconnecting at once)

#### localStorage Sync Mode
When all WebSocket servers are unavailable:
- Automatically enables "📱 Fallback Mode"
- Uses browser localStorage to sync between Regie and Ausspielung tabs
- **Important:** Only works for tabs/windows in the SAME BROWSER on the SAME DEVICE
- **Does NOT sync between separate devices** (laptop ↔ iPad requires WebSocket server)
- Perfect for development or same-device testing
- For production: Use multiple Render instances or local server as backup

#### Connection Quality Indicator
Visual indicator shows connection health:
- **⚡ (Green)** - Excellent (90%+ success rate)
- **✓ (Blue)** - Good (70-90% success rate)
- **~ (Yellow)** - Fair (50-70% success rate)
- **! (Red)** - Poor (<50% success rate)

### How to use

#### Normal Operation
Just use the app normally! The fallback system works automatically in the background.

#### When Render.com is Down

**For Same-Device Operation:**
1. You'll see "🔴 Getrennt" (Disconnected)
2. Then "📱 Fallback Mode" will appear
3. Your app continues working using localStorage sync
4. Open Regie and Ausspielung in **same browser** for localStorage sync to work
5. System will automatically try to reconnect to WebSocket servers

**For Cross-Device Operation (Laptop ↔ iPad):**
1. localStorage fallback **does NOT sync between devices**
2. **Best Solution:** Run local WebSocket server on laptop
   ```bash
   cd server
   node index.js
   ```
3. Connect iPad to laptop's local IP: `http://192.168.1.x:5173`
4. Or deploy multiple Render.com instances for redundancy
5. Or use iPad standalone mode (pre-load content, use touch controls)

#### Monitoring Connection
Watch the header for connection status:
- **🟢 Verbunden** - Connected via WebSocket (best)
- **🟡 Verbinde...** - Attempting connection
- **🔴 Getrennt** - Disconnected
- **📱 Fallback Mode** - Using localStorage sync (working but degraded)
- **Connection Quality icon** - Shows historical reliability

### Technical Details

#### Fallback Strategy
```
1. Try primary WebSocket server
   ↓ (fails)
2. Try backup WebSocket server
   ↓ (fails)
3. Try localhost (if in development)
   ↓ (fails)
4. Enable localStorage sync fallback
   ↓ (keep retrying with exponential backoff)
5. Continue attempting reconnection indefinitely
```

#### localStorage Sync
- Polls every 500ms for changes
- Works between tabs in the same browser
- Limited to same device only (not cross-device)
- Automatically disabled when WebSocket reconnects

#### Connection History
- Tracks last 20 connection attempts
- Records success/failure for each server
- Sorts servers by reliability
- Helps optimize which server to try first

---

## Testing Checklist

### Profile Management
- [ ] Create a new profile with custom settings
- [ ] Load the profile - settings should apply
- [ ] Edit profile name
- [ ] Create 10 profiles (should hit maximum limit)
- [ ] Try to create 11th profile (should show error)
- [ ] Delete a profile
- [ ] Reload page - last used profile should load

### Text Persistence
- [ ] Type some text in editor
- [ ] Watch for "💾 Saving..." indicator
- [ ] Wait for "✓ Saved" indicator
- [ ] Reload page - text should be restored
- [ ] Edit text and reload again - latest changes should be preserved
- [ ] Clear browser cache - text history is lost (expected behavior)

### WebSocket Fallback
- [ ] Normal operation - should show "🟢 Verbunden"
- [ ] Open browser console, see WebSocket messages
- [ ] Disconnect internet briefly - should auto-reconnect
- [ ] Force disconnect (close WebSocket server if running locally)
- [ ] Should show "📱 Fallback Mode"
- [ ] Open Regie and Ausspielung in same browser
- [ ] Changes should sync via localStorage
- [ ] Restore internet - should reconnect to WebSocket
- [ ] Check connection quality indicator after several uses

---

## Configuration

### Environment Variables

You can add multiple backup WebSocket servers by editing `src/utils/websocketFallback.js`:

```javascript
const FALLBACK_SERVERS = [
  import.meta.env.VITE_WS_URL,           // Primary (from .env)
  'wss://backup-server.onrender.com/ws', // Add your backup server
  'ws://localhost:3002/ws'               // Local development
].filter(Boolean)
```

### Customization

#### Profile Settings (profileManager.js)
- Change `MAX_PROFILES` to allow more/fewer profiles
- Modify `DEFAULT_SETTINGS` to change default values

#### Text Auto-Save (textPersistence.js)
- Change `delay` parameter in `createDebouncedSave(1000)` for faster/slower saves
- Modify `MAX_HISTORY` for more/fewer history versions

#### WebSocket Retry (websocketFallback.js)
- Adjust `MAX_RECONNECT_ATTEMPTS` (currently unlimited)
- Change `BASE_RECONNECT_DELAY` (currently 1 second)
- Modify `MAX_RECONNECT_DELAY` (currently 30 seconds)

---

## Troubleshooting

### Profiles not saving
- Check browser localStorage quota (usually 5-10MB)
- Try deleting old profiles
- Clear browser cache and try again

### Text not persisting
- Check browser console for errors
- Verify localStorage is enabled in browser settings
- Try different browser if issue persists

### Fallback mode always active
- Check if `VITE_WS_URL` is set correctly in `.env`
- Verify WebSocket server is running
- Check browser console for connection errors
- Try manually visiting WebSocket URL to test connectivity

### Connection quality always poor
- This is expected for Render.com free tier (sleeps after inactivity)
- Consider upgrading to paid Render.com plan for better uptime
- localStorage fallback ensures app works even with poor connection

---

## Performance Notes

### localStorage Limits
- Maximum storage: ~5-10MB per domain (browser dependent)
- Each profile: ~500 bytes
- Text content: Size of your text (can be several KB)
- Consider exporting large texts to files

### WebSocket Performance
- Render.com free tier: may sleep after 15 minutes of inactivity
- Heartbeat pings every 5 seconds keep server awake
- Exponential backoff prevents server overload during reconnection

### Browser Compatibility
- All modern browsers supported (Chrome, Firefox, Safari, Edge)
- localStorage: IE8+
- WebSocket: All modern browsers
- Tested on latest Chrome and Safari

---

## Future Enhancements

Potential improvements for future versions:
- [ ] Profile import/export (share profiles between devices)
- [ ] Text undo/redo using saved history
- [ ] Cloud backup for profiles and text
- [ ] WebRTC peer-to-peer connection as additional fallback
- [ ] Profile categories/folders
- [ ] Profile preview before loading
- [ ] Automatic profile switching based on content type

---

## Support

If you encounter any issues:
1. Check browser console for errors (F12 → Console)
2. Verify localStorage is enabled
3. Check network connectivity
4. Review this documentation
5. Contact developer with console logs if issue persists

