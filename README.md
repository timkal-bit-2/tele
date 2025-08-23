# Live Teleprompter

Ein webbasierter Live-Teleprompter für synchrone Text-Ausgabe zwischen Laptop (Input) und iPad (Output).

## 🚀 Features

### ✅ Grundfunktionen
- **Startbildschirm**: Auswahl zwischen Input (Laptop) oder Output (iPad)
- **Input-Seite (Laptop)**:
  - Rich-Text-Editor mit Formatierungsoptionen (Fett, Kursiv, Unterstrichen)
  - Einstellbare Schriftgröße, Scrollgeschwindigkeit, Margin, Zeilenhöhe
  - Upload mehrerer .txt-Dateien mit Encoding-Support (UTF-8/Windows-1252)
  - Live-Vorschau des Outputs
  - WebSocket-basierte Live-Synchronisation
  - Verbindungsstatus und Latenz-Anzeige
- **Output-Seite (iPad)**:
  - Live-Anzeige des gespiegelten Texts
  - CSS-Spiegelung (horizontal/vertikal)
  - Fullscreen-Optimierung für iOS Safari
  - Touch-aktivierte Scroll-Steuerung
  - Ruckelfreies Scrollen mit requestAnimationFrame

### 🔄 Kommunikation
- WebSocket-basierte bidirektionale Synchronisation
- Heartbeat/Ping alle 5 Sekunden
- Automatische Reconnect-Logik
- localStorage-Caching für Offline-Wiederherstellung

## 🛠 Technisches Setup

- **Frontend**: React + Tailwind CSS
- **Backend**: Node.js mit WebSocket (ws)
- **Build Tool**: Vite
- **Entwicklung**: Hot Reload für Frontend und Backend

## 📦 Installation & Start

1. **Dependencies installieren**:
   ```bash
   npm install
   ```

2. **Entwicklung starten** (Frontend + Backend):
   ```bash
   npm run dev:all
   ```

3. **Einzeln starten**:
   ```bash
   # Nur Backend (WebSocket Server)
   npm run server
   
   # Nur Frontend
   npm run dev
   ```

4. **Production Build**:
   ```bash
   npm run build
   npm run preview
   ```

## 🌐 URLs

- **Frontend**: http://localhost:3000
- **WebSocket**: ws://localhost:3002/ws
- **Health Check**: http://localhost:3002/health

## 📱 Verwendung

### Setup
1. **Laptop**: Öffne http://localhost:3000 und wähle "Input (Laptop)"
2. **iPad**: Öffne http://localhost:3000 und wähle "Output (iPad)"
3. Beide Geräte müssen im gleichen Netzwerk sein

### Input-Seite (Laptop)
- **Text bearbeiten**: Rich-Text-Editor mit Toolbar
- **Dateien hochladen**: .txt-Dateien via Upload-Button
- **Einstellungen**: Schriftgröße, Scrollgeschwindigkeit, Spiegelung
- **Live-Vorschau**: Echtzeitvorschau des iPad-Outputs
- **Verbindungsstatus**: ✅/❌ Anzeige mit Latenz

### Output-Seite (iPad)
- **Touch aktivieren**: Ersten Touch für iOS Safari Kompatibilität
- **Scroll-Steuerung**: 
  - ▶️ Start/⏸️ Stop Button
  - ⏮️ Reset Button
  - ⛶ Fullscreen Button
- **Keyboard Shortcuts** (im Fullscreen):
  - `SPACE`: Start/Stop Scrolling
  - `ESC`: Reset Scroll Position
  - `F`: Fullscreen Toggle

## 🎨 Konfiguration

### Einstellungen (Input-Seite)
- **Schriftgröße**: 12-72px
- **Scrollgeschwindigkeit**: 10-120 Sekunden
- **Margin**: 0-100px
- **Zeilenhöhe**: 1.0-3.0
- **Spiegelung**: Horizontal/Vertikal

### Dateien
- **Format**: .txt (UTF-8, Windows-1252)
- **Upload**: Mehrere Dateien gleichzeitig
- **Verwaltung**: Auswahl, Löschen, Umbenennen
- **Auto-Save**: Lokale Speicherung in localStorage

## 🚨 Troubleshooting

### iOS Safari Optimierungen
- Touch-Interaktion erforderlich vor Autoplay
- Fullscreen API Unterstützung
- Safe Area Insets berücksichtigt
- Scrollbar ausgeblendet

### Performance
- Optimiert für lange Texte (2000+ Wörter)
- requestAnimationFrame für ruckelfrei Scrolling
- WebSocket Reconnection bei Verbindungsabbruch
- localStorage Caching bei Netzwerkproblemen

### Häufige Probleme
- **WebSocket Verbindung fehlgeschlagen**: Server läuft auf Port 3002?
- **iPad zeigt keinen Text**: Input-Gerät verbunden und Text eingegeben?
- **Scrollen funktioniert nicht**: Touch-Interaktion aktiviert?
- **Formatierung verloren**: Rich-Text-Editor für HTML-Formatierung nutzen

## 🔧 Development

### Projekt-Struktur
```
/
├── src/
│   ├── components/          # React Komponenten
│   │   ├── StartScreen.jsx  # Geräte-Auswahl
│   │   ├── InputPage.jsx    # Laptop Input-Interface
│   │   ├── OutputPage.jsx   # iPad Output-Display
│   │   ├── TextEditor.jsx   # Rich-Text-Editor
│   │   ├── Settings.jsx     # Einstellungen-Panel
│   │   ├── FileManager.jsx  # Datei-Upload & Verwaltung
│   │   └── ConnectionStatus.jsx # WebSocket Status
│   ├── hooks/
│   │   └── useWebSocket.jsx # WebSocket Hook & Context
│   ├── App.jsx              # Haupt-App Komponente
│   └── main.jsx             # React Entry Point
├── server/
│   └── index.js             # WebSocket Server
├── package.json             # Dependencies & Scripts
├── vite.config.js           # Vite Konfiguration
└── tailwind.config.js       # Tailwind CSS Konfiguration
```

### Neue Features hinzufügen
1. Komponente in `src/components/` erstellen
2. WebSocket Nachrichten-Typ in `server/index.js` hinzufügen
3. Frontend-Handler in `useWebSocket.jsx` implementieren
4. Tests und Dokumentation aktualisieren

## 📈 Deployment

### Frontend (Static)
- **Vercel**: `vercel --prod`
- **Cloudflare Pages**: `npm run build` → `dist/` uploaden
- **Netlify**: Repository verknüpfen, Build: `npm run build`

### Backend (WebSocket Server)
- **Vercel Functions**: Edge Functions für WebSocket
- **Railway**: `railway deploy`
- **Heroku**: `git push heroku main`

### Environment Variables
```bash
PORT=3002                    # WebSocket Server Port (Default)
VITE_WS_URL=ws://localhost:3002/ws  # WebSocket URL für Frontend
```

## 📄 Lizenz

MIT License - siehe LICENSE Datei für Details.
