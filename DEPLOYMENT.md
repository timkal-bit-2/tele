# 🚀 Live Teleprompter - Cloud Deployment Guide

Diese Anleitung zeigt, wie Sie den Live Teleprompter für die Verwendung über verschiedene Netzwerke hinweg bereitstellen.

## 📋 Überblick

Das System besteht aus zwei Teilen:
1. **Frontend (React App)** → Cloudflare Pages oder Vercel
2. **WebSocket Server (Node.js)** → Railway, Heroku oder Vercel Functions

## 🔧 1. WebSocket Server Deployment

### Option A: Railway (Empfohlen)

```bash
# 1. Railway CLI installieren
npm install -g @railway/cli

# 2. Einloggen
railway login

# 3. Projekt erstellen
railway init

# 4. Umgebungsvariablen setzen
railway variables set PORT=3002
railway variables set NODE_ENV=production

# 5. Deployen
railway up

# 6. Domain notieren (z.B. your-app-name.railway.app)
```

### Option B: Heroku

```bash
# 1. Heroku CLI installieren und einloggen
heroku login

# 2. App erstellen
heroku create your-teleprompter-ws

# 3. Umgebungsvariablen setzen
heroku config:set NODE_ENV=production

# 4. Deployen
git push heroku main

# 5. Domain notieren (z.B. your-teleprompter-ws.herokuapp.com)
```

### Option C: Vercel (Edge Functions)

```bash
# 1. Vercel CLI installieren
npm install -g vercel

# 2. Einloggen
vercel login

# 3. Deployen
vercel --prod

# 4. Domain notieren (z.B. your-project.vercel.app)
```

## 🌐 2. Frontend Deployment

### Option A: Cloudflare Pages (Empfohlen)

#### Über GitHub:

1. **Repository auf GitHub pushen:**
   ```bash
   git add .
   git commit -m "Add WebSocket sync for multi-network support"
   git push origin main
   ```

2. **Cloudflare Pages Setup:**
   - Gehen Sie zu [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Pages → "Create a project" → GitHub Repository auswählen
   - Build-Einstellungen:
     ```
     Framework: Vite
     Build command: npm run build
     Build output directory: dist
     Root directory: (leer lassen)
     ```

3. **Umgebungsvariablen setzen:**
   ```
   VITE_WS_URL = wss://your-app-name.railway.app/ws
   ```
   (Ersetzen Sie mit Ihrer tatsächlichen WebSocket-Server-URL)

#### Über Wrangler CLI:

```bash
# 1. Wrangler installieren
npm install -g wrangler

# 2. Einloggen
wrangler login

# 3. Build erstellen
npm run build

# 4. Projekt erstellen und deployen
wrangler pages project create live-teleprompter
wrangler pages deployment create dist --project-name live-teleprompter

# 5. Umgebungsvariablen setzen
wrangler pages secret put VITE_WS_URL
# Eingabe: wss://your-app-name.railway.app/ws
```

### Option B: Vercel

```bash
# 1. Umgebungsvariable setzen
echo "VITE_WS_URL=wss://your-websocket-server.railway.app/ws" > .env.production

# 2. Deployen
vercel --prod
```

## ⚙️ 3. Konfiguration für verschiedene Netzwerke

### WebSocket-URL Konfiguration:

**Lokale Entwicklung:**
```bash
VITE_WS_URL=ws://localhost:3002/ws
```

**Produktion:**
```bash
# Railway
VITE_WS_URL=wss://your-app-name.railway.app/ws

# Heroku
VITE_WS_URL=wss://your-teleprompter-ws.herokuapp.com/ws

# Vercel
VITE_WS_URL=wss://your-project.vercel.app/ws
```

## 🔗 4. URLs für Ihre Geräte

Nach dem Deployment haben Sie:

**Frontend (Cloudflare Pages):**
- `https://live-teleprompter.pages.dev`
- Oder Ihre custom Domain

**WebSocket Server:**
- `wss://your-app-name.railway.app/ws`

### Nutzung:

1. **Laptop (Regie):** Öffnen Sie `https://live-teleprompter.pages.dev` → "Regie"
2. **iPad (Ausspielung):** Öffnen Sie `https://live-teleprompter.pages.dev` → "Ausspielung"

Die Geräte können jetzt in **komplett unterschiedlichen Netzwerken** sein!

## 🛠️ 5. Lokales Testen mit Cloud-WebSocket

Für Tests können Sie das Frontend lokal laufen lassen, aber den Cloud-WebSocket nutzen:

```bash
# 1. Umgebungsvariable setzen
export VITE_WS_URL=wss://your-app-name.railway.app/ws

# 2. Lokal starten
npm run dev

# 3. Öffnen Sie http://localhost:3000
```

## 🔍 6. Troubleshooting

### WebSocket-Verbindung testen:

```bash
# Health Check
curl https://your-app-name.railway.app/health

# WebSocket Test (mit wscat)
npm install -g wscat
wscat -c wss://your-app-name.railway.app/ws
```

### Häufige Probleme:

1. **"WebSocket connection failed"**
   - Prüfen Sie die `VITE_WS_URL` Umgebungsvariable
   - Testen Sie den Health-Check-Endpoint
   - Stellen Sie sicher, dass `wss://` (nicht `ws://`) für HTTPS-Seiten verwendet wird

2. **"Sync funktioniert nicht"**
   - Beide Geräte müssen die gleiche Frontend-URL verwenden
   - Prüfen Sie die Browser-Konsole auf WebSocket-Nachrichten
   - Verbindungsstatus wird in der UI angezeigt (🟢 Verbunden / 🔴 Getrennt)

3. **"Nur localhost funktioniert"**
   - Stellen Sie sicher, dass Sie die Cloud-URLs verwenden
   - Cloudflare Pages und Railway URLs sind automatisch HTTPS/WSS

## 📊 7. Monitoring

### WebSocket Server Logs:

**Railway:**
```bash
railway logs
```

**Heroku:**
```bash
heroku logs --tail -a your-teleprompter-ws
```

### Health Check Monitoring:

Der WebSocket-Server bietet einen Health-Check-Endpoint:
```
GET https://your-app-name.railway.app/health
```

Response:
```json
{
  "status": "healthy",
  "clients": 2,
  "uptime": 3600,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🎯 8. Verwendung

Nach erfolgreichem Deployment:

1. **Laptop** → Öffnen Sie die Frontend-URL → "Regie" wählen
2. **iPad** → Öffnen Sie die Frontend-URL → "Ausspielung" wählen
3. **Text eingeben** im Laptop → Wird sofort auf iPad angezeigt
4. **Scrollen im Laptop** → iPad scrollt synchron mit

Die Synchronisation funktioniert jetzt über das Internet, unabhängig von lokalen Netzwerken!

## 💡 Tipps

- Verwenden Sie HTTPS/WSS URLs für beste Kompatibilität
- Railway bietet kostenloses Hosting mit guter WebSocket-Unterstützung
- Cloudflare Pages ist kostenlos und sehr schnell
- Testen Sie die Verbindung mit verschiedenen Netzwerken
- Der Health-Check-Endpoint hilft bei der Überwachung
