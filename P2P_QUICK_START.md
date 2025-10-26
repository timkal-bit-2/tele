# P2P Quick Start Guide 🚀

## 5-Minute Setup

### What You Need:
- Laptop (for Regie)
- iPad (for Ausspielung)
- **Same WiFi network**

---

## Step-by-Step

### 1️⃣ On Laptop

```bash
# Start the app
npm run dev
```

Open browser: `http://localhost:5173/regie`

Look for this in the left sidebar:

```
┌─────────────────────────┐
│ 🔗 Direct Connection    │
│                         │
│ [📡 Create Room]       │
└─────────────────────────┘
```

Click **"📡 Create Room"**

You'll see:
```
Room Code:
  ABC-123     [📋 Copy]
```

**Keep this tab open!**

---

### 2️⃣ On iPad

**Important:** Connect iPad to **same WiFi** as laptop first!

Open Safari: `http://your-laptop-ip:5173/ausspielung`

*(To find laptop IP: Mac → System Preferences → Network)*

Click button in header: **"🔗 Connect to Laptop"**

Enter room code: **`ABC-123`**

Click: **"🔌 Join Room"**

---

### 3️⃣ Done! 🎉

Both devices show:
```
🟢 Connected
```

Now:
- Edit text on laptop → iPad updates instantly
- Change settings → iPad syncs automatically  
- Can disconnect from internet (works offline!)

---

## Troubleshooting

### ❌ Can't connect?

**Check:**
1. ☐ Same WiFi network? (Most common issue!)
2. ☐ Laptop tab still open?
3. ☐ Room code entered correctly?

**Solution:**
- Verify WiFi network name matches on both devices
- If on corporate/public WiFi, try laptop hotspot instead

### ❌ "Room not found"?

**This means:**
- Laptop hasn't created room yet

**Solution:**
1. On laptop: Click "Create Room" first
2. Wait for room code
3. Then join from iPad

---

## Quick Tips

💡 **Laptop is the server** - Keep that tab open!

💡 **Same WiFi required** - Check network name on both devices

💡 **One-time setup** - Room code changes each session (security!)

💡 **Works offline** - After initial connect, no internet needed

💡 **Auto-fallback** - If P2P fails, uses Render.com automatically

---

## Connection Status

### On Laptop (Regie):
```
⭕ Not Connected → Create room
⏳ Waiting → iPad needs to join
🟢 Connected → All good!
```

### On iPad (Ausspielung):
```
[🔗 Connect to Laptop] → Grey = disconnected
[🔗 P2P Connected]     → Green = connected
```

---

## What Syncs?

When connected via P2P:

- ✅ Text content (edits in real-time)
- ✅ Font size
- ✅ Scroll speed
- ✅ Mirroring settings
- ✅ Reading line position
- ✅ All other settings

---

## Advanced: Manual Connection

If automatic doesn't work:

**On Laptop:**
1. Click "▶ Advanced / Manual Setup"
2. Copy the long text that appears
3. Send to iPad (email, AirDrop, message)

**On iPad:**
1. Click "▶ Advanced / Manual Setup"
2. Paste the text
3. Click "Connect"
4. Copy the answer
5. Send back to laptop

**On Laptop:**
6. Paste answer
7. Click "Accept Answer"
8. ✅ Connected!

---

## Connection Priority

The app tries connections in this order:

```
1. P2P (laptop browser)      ← Fastest! ⚡
   ↓
2. Render.com (cloud)         ← Backup
   ↓
3. localStorage (same device) ← Fallback
```

You'll always be connected to something!

---

## Example Workflow

### Before Broadcast:
1. Power on laptop and iPad
2. Connect both to studio WiFi
3. Open Regie on laptop
4. Create P2P room
5. Open Ausspielung on iPad
6. Join with room code
7. ✅ Ready!

### During Broadcast:
- Edit script in real-time
- Adjust speed/size as needed
- iPad responds instantly
- Works even if internet drops!

### After Broadcast:
- Click "Disconnect" or just close tabs
- That's it!

---

## Need More Help?

📖 Read full guide: `P2P_DIRECT_CONNECTION.md`

🐛 Check console logs (F12) for debugging

💬 Look for P2P messages in console

---

## FAQ

**Q: Same WiFi = same network name?**
A: Yes! Both devices should show same WiFi name in settings.

**Q: Can I use hotspot?**
A: Yes! Create hotspot on laptop, connect iPad to it.

**Q: Works with cellular?**
A: No, needs WiFi. But once connected, can work offline!

**Q: Multiple iPads?**
A: Not yet - coming in future update!

**That's it! Enjoy your P2P connection! 🎉**


