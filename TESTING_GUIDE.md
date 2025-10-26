# Quick Testing Guide

## How to Test the New Features

### Prerequisites
1. Start the development server: `npm run dev`
2. Open the app in your browser
3. Open browser DevTools (F12) to see console logs

---

## Test 1: Profile Management ✨

### Create and Use Profiles
1. Go to Regie page (`http://localhost:5173/regie`)
2. Scroll down to "📋 Profiles" section in left sidebar
3. Click "➕ New" button
4. Enter name: "Test Profile 1"
5. Click "Create"
6. ✅ **Expected:** Profile appears in the list

### Modify Settings and Load Profile
1. Change font size to 60px
2. Change speed to 3.0
3. Enable horizontal mirroring
4. Create another profile: "Test Profile 2"
5. Now click "Test Profile 1" to load it
6. ✅ **Expected:** Settings revert to Profile 1's values

### Edit Profile Name
1. Click ✏️ next to "Test Profile 1"
2. Change name to "My Favorite Settings"
3. Click "Save"
4. ✅ **Expected:** Name updates in the list

### Delete Profile
1. Click 🗑️ next to a profile
2. Confirm deletion
3. ✅ **Expected:** Profile is removed from list

### Test Maximum Limit
1. Create profiles until you reach 10
2. Try to create an 11th profile
3. ✅ **Expected:** See error message about maximum profiles

---

## Test 2: Auto-Save Text Persistence 💾

### Basic Auto-Save
1. Go to text editor (bottom section)
2. Type: "This is my test teleprompter script"
3. Watch top-left of editor for "💾 Saving..." indicator
4. Wait for "✓ Saved" indicator
5. ✅ **Expected:** Save indicator appears and changes to saved

### Test Reload Persistence
1. With text in editor, note what you typed
2. Refresh the page (F5 or Ctrl+R)
3. ✅ **Expected:** Your text is still there! No lorem ipsum!

### Test Continuous Saving
1. Type slowly in the editor
2. Watch the save indicator
3. Every second or so after you stop typing, it should save
4. ✅ **Expected:** Indicator shows "Saving..." then "Saved" repeatedly

### Verify localStorage
1. Open browser DevTools → Application tab → Local Storage
2. Find key: `teleprompter-current-text`
3. ✅ **Expected:** Your text is stored there

---

## Test 3: WebSocket Fallback System 🔄

### Normal Operation (Connected)
1. Make sure WebSocket server is running
2. Check header for connection status
3. ✅ **Expected:** "🟢 Verbunden" (green, connected)
4. Should NOT see "📱 Fallback Mode"

### Test Auto-Reconnect
1. Stop the WebSocket server (if running locally: stop `node server/index.js`)
2. Wait a few seconds
3. ✅ **Expected:** 
   - Status changes to "🔴 Getrennt" (red, disconnected)
   - "📱 Fallback Mode" appears
   - Console shows reconnection attempts

### Test Fallback Sync
1. With WebSocket disconnected, open two browser tabs
2. Tab 1: Regie page
3. Tab 2: Ausspielung page
4. In Regie, change font size
5. ✅ **Expected:** Ausspielung updates via localStorage fallback
6. Console should show: "📤 Sent via localStorage fallback"

### Test Reconnection
1. Restart WebSocket server
2. Wait up to 30 seconds
3. ✅ **Expected:**
   - Status changes back to "🟢 Verbunden"
   - "📱 Fallback Mode" disappears
   - Console shows: "✅ WebSocket connected successfully!"

### Test Connection Quality Indicator
1. After several connects/disconnects
2. Look for connection quality icon next to status
3. Hover over it to see tooltip
4. ✅ **Expected:** Shows quality rating (⚡✓~!)

---

## Test 4: Integration Test 🧪

### Full Workflow Test
1. **Start fresh:**
   - Clear browser localStorage (DevTools → Application → Clear storage)
   - Refresh page

2. **Create a profile:**
   - Set font size: 50px
   - Set speed: 2.5
   - Enable vertical mirroring
   - Create profile: "Production Settings"

3. **Add text:**
   - Type: "Welcome to our show. This is a test of the teleprompter system."
   - Wait for auto-save

4. **Test persistence:**
   - Reload page
   - ✅ Text should be there
   - ✅ Last used profile should be loaded

5. **Test WebSocket:**
   - Open Ausspielung in new tab
   - Change speed in Regie
   - ✅ Ausspielung should update
   - Check if using WebSocket or fallback mode

6. **Test profile switching:**
   - Create another profile with different settings
   - Switch between profiles
   - ✅ Settings should change instantly

---

## Common Issues & Solutions

### Issue: Profiles not showing
**Solution:** Check browser localStorage quota. Try clearing old data.

### Issue: Text not saving
**Solution:** 
- Check browser console for errors
- Verify localStorage is enabled
- Try incognito/private mode

### Issue: Always in Fallback Mode
**Solution:**
- Check if WebSocket server is running
- Verify `VITE_WS_URL` in `.env` file
- Check browser console for connection errors

### Issue: Connection keeps dropping
**Solution:**
- This is normal for Render.com free tier
- Fallback mode will keep app working
- Consider upgrading Render.com plan

---

## Success Criteria ✅

All features working if you can:
- ✅ Create, load, edit, and delete profiles
- ✅ Text persists after page reload
- ✅ App works even when WebSocket is disconnected
- ✅ Connection status indicators show correctly
- ✅ No console errors during normal operation

---

## Performance Checklist

Monitor for:
- [ ] No memory leaks (check DevTools → Memory)
- [ ] Smooth scrolling in teleprompter
- [ ] Fast profile switching (<100ms)
- [ ] Text saves within 1-2 seconds
- [ ] WebSocket reconnects within 30 seconds

---

## Browser Compatibility

Test in:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

All features should work in modern browsers (2020+).

---

## Notes

- Console logs are helpful for debugging
- All features work offline (except cross-device sync)
- localStorage has ~5-10MB limit
- WebSocket heartbeat prevents server sleep

---

## Report Issues

If you find bugs:
1. Note steps to reproduce
2. Copy browser console logs
3. Check browser and OS version
4. Report with all details

Happy testing! 🎉


