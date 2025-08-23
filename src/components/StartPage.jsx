import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

const StartPage = () => {
  const navigate = useNavigate()
  const [hasContent, setHasContent] = useState(false)
  const [settings, setSettings] = useState({})

  // Check if we have saved content and settings
  useEffect(() => {
    const savedFiles = localStorage.getItem('teleprompter-files')
    const savedSettings = localStorage.getItem('teleprompter-settings')
    
    if (savedFiles) {
      try {
        const files = JSON.parse(savedFiles)
        setHasContent(files.length > 0)
      } catch (error) {
        console.error('Error loading files:', error)
      }
    }

    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        setSettings(parsedSettings)
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
  }, [])

  const openRegie = () => {
    navigate('/regie')
  }

  const openAusspielung = () => {
    // Get current content and settings for direct ausspielung access
    const savedFiles = localStorage.getItem('teleprompter-files')
    const savedSettings = localStorage.getItem('teleprompter-settings')
    
    let rawContent = 'Willkommen beim Teleprompter!\n\nBitte laden Sie zuerst einen Text in der Regie.'
    let currentSettings = {
      fontSize: 48,
      speed: 0.5,
      padding: 100,
      lineHeight: 1.4,
      showReadingLine: true,
      readingLinePosition: 50,
      mirrorHorizontal: false,
      mirrorVertical: false,
      emptyLinesAtStart: 5
    }
    
    // Load saved content
    if (savedFiles) {
      try {
        const files = JSON.parse(savedFiles)
        if (files.length > 0) {
          rawContent = files[0].content
        }
      } catch (error) {
        console.error('Error loading files:', error)
      }
    }
    
    // Load saved settings
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        currentSettings = { ...currentSettings, ...parsedSettings }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    
    console.log('Opening Ausspielung with:', { rawContent: rawContent.length, currentSettings })

    navigate('/ausspielung', {
      state: {
        rawContent,
        settings: currentSettings,
        initialScrollPosition: 0
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-white mb-4">
            📺 <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Teleprompter</span>
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            Tim Kalkkuhl 2025
          </p>
          <div className="text-sm text-gray-500">
            {hasContent ? '✅ Inhalte verfügbar' : '⚪ Noch keine Inhalte geladen'}
          </div>
        </div>

        {/* Main Buttons */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Regie Button */}
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:scale-105">
            <div className="space-y-6">
              <div className="text-4xl">🎛️</div>
              <h2 className="text-2xl font-semibold text-white">Regie</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Vollständige Kontrolle über den Teleprompter. Text bearbeiten, Geschwindigkeit anpassen, Einstellungen konfigurieren.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 text-left">
                <li>• Text-Editor mit Datei-Management</li>
                <li>• Geschwindigkeits- und Formatierungskontrollen</li>
                <li>• Live-Vorschau mit Leselinie</li>
                <li>• Spiegelungseinstellungen</li>
              </ul>
              <button
                onClick={openRegie}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                🎛️ Regie öffnen
              </button>
            </div>
          </div>

          {/* Ausspielung Button */}
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-green-500 transition-all duration-300 hover:scale-105">
            <div className="space-y-6">
              <div className="text-4xl">📺</div>
              <h2 className="text-2xl font-semibold text-white">Ausspielung</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Direkt zur Vollbild-Ausspielung. Perfekt für die finale Präsentation ohne Ablenkungen.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 text-left">
                <li>• Vollbild-Modus für maximale Sichtbarkeit</li>
                <li>• Saubere Darstellung ohne Steuerelemente</li>
                <li>• Touch- und Scroll-Unterstützung</li>
                <li>• Automatische Spiegelung</li>
              </ul>
              <button
                onClick={openAusspielung}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                📺 Ausspielung öffnen
              </button>
              {!hasContent && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 Startet mit Demo-Text, laden Sie Inhalte in der Regie
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="border-t border-gray-700 pt-8 space-y-4">
          <div className="text-sm text-gray-500">
            <strong>Tipp:</strong> Verwenden Sie die Regie zum Einrichten und die Ausspielung für die finale Präsentation.
          </div>
          
          {hasContent && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-2">📊 Aktuelle Einstellungen</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-400">
                <div>
                  <div className="text-gray-500">Schriftgröße</div>
                  <div>{settings.fontSize || 48}px</div>
                </div>
                <div>
                  <div className="text-gray-500">Geschwindigkeit</div>
                  <div>{((settings.speed || 0.5) * 10).toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Horizontal gespiegelt</div>
                  <div>{settings.mirrorHorizontal ? '✅' : '❌'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Vertikal gespiegelt</div>
                  <div>{settings.mirrorVertical ? '✅' : '❌'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StartPage
