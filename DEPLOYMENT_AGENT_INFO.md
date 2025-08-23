# 🤖 Deployment Agent - Wichtige Update-Informationen

## 📝 **System-Architektur (WICHTIG!):**

Das System besteht aus **2 separaten Teilen**:

1. **Frontend (React SPA)** → Cloudflare Pages/Vercel
2. **WebSocket Server (Node.js)** → Railway/Heroku

**⚠️ KRITISCH:** Beide müssen separat deployed werden!

## 🔧 **Deployment-Reihenfolge:**

### 1. **ZUERST: WebSocket Server**
```bash
# Railway (empfohlen)
railway login
railway init
railway up
# → Notiere die URL: https://your-app.railway.app
```

### 2. **DANN: Frontend mit WebSocket-URL**
```bash
# Cloudflare Pages Umgebungsvariable setzen:
VITE_WS_URL=wss://your-app.railway.app/ws
```

## 🔑 **Kritische Konfigurationsdateien:**

### `package.json` - Build Scripts:
```json
{
  "scripts": {
    "build": "vite build",        // ← Frontend Build
    "start": "node server/index.js" // ← Server Start
  }
}
```

### `railway.json` - Server Config:
```json
{
  "deploy": {
    "startCommand": "node server/index.js",
    "healthcheckPath": "/health"
  }
}
```

### `vercel.json` - Frontend Config:
```json
{
  "env": {
    "VITE_WS_URL": "wss://your-websocket-server.railway.app/ws"
  },
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

## ⚠️ **HÄUFIGE DEPLOYMENT-FEHLER:**

### 1. **Falsche WebSocket-URL:**
```bash
# FALSCH:
VITE_WS_URL=ws://localhost:3002/ws  # ← Nur lokal!

# RICHTIG:
VITE_WS_URL=wss://your-app.railway.app/ws  # ← Cloud URL!
```

### 2. **HTTP vs HTTPS Mismatch:**
```bash
# Frontend HTTPS → WebSocket muss WSS sein!
https://teleprompter.pages.dev → wss://server.railway.app/ws ✅
https://teleprompter.pages.dev → ws://server.railway.app/ws  ❌
```

### 3. **Fehlende Environment Variables:**
- Frontend braucht: `VITE_WS_URL`
- Server braucht: `PORT` (automatisch von Railway gesetzt)

## 🎯 **Deployment-Checklist:**

- [ ] **Server deployed** auf Railway/Heroku
- [ ] **Server Health Check** funktioniert: `/health`
- [ ] **WebSocket-URL** notiert (mit `wss://`)
- [ ] **Frontend Environment Variable** gesetzt: `VITE_WS_URL`
- [ ] **Frontend Build** erfolgreich: `npm run build`
- [ ] **Frontend deployed** auf Cloudflare Pages/Vercel
- [ ] **Browser Test:** Beide URLs erreichbar
- [ ] **WebSocket Test:** Verbindung zwischen Geräten

## 🔍 **Testing Commands:**

```bash
# 1. Server Health Check
curl https://your-app.railway.app/health

# 2. WebSocket Test
wscat -c wss://your-app.railway.app/ws

# 3. Frontend Build Test
npm run build

# 4. Local Test mit Cloud-WebSocket
VITE_WS_URL=wss://your-app.railway.app/ws npm run dev
```

## 📊 **Erwartete URLs nach Deployment:**

```
Frontend:  https://live-teleprompter.pages.dev
WebSocket: wss://your-app-name.railway.app/ws
Health:    https://your-app-name.railway.app/health
```

## 🚨 **Notfall-Debugging:**

### WebSocket Verbindung prüfen:
```javascript
// Browser Console:
const ws = new WebSocket('wss://your-app.railway.app/ws')
ws.onopen = () => console.log('✅ Connected')
ws.onerror = (e) => console.log('❌ Error:', e)
```

### Environment Variables prüfen:
```javascript
// Browser Console:
console.log('WebSocket URL:', import.meta.env.VITE_WS_URL)
```

## 🔄 **Update-Prozess:**

1. **Code ändern** 
2. **Testen lokal:** `npm run dev:all`
3. **Build testen:** `npm run build`
4. **Server deployen:** `git push` (wenn Auto-Deploy aktiviert)
5. **Frontend deployen:** Automatisch bei Git Push (Cloudflare Pages)

## ⚡ **Performance-Hinweise:**

- Railway EU-Region wählen für niedrige Latenz
- Cloudflare Edge-Caching ist automatisch aktiv
- WebSocket Heartbeat: 10 Sekunden
- Auto-Reconnect: 1 Sekunde
