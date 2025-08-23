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
  
  const openRegieV2 = () => {
    navigate('/regie-v2')
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

        {/* Simple Teleprompter - Prominent */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 border-2 border-blue-400 hover:border-blue-300 transition-all duration-300 hover:scale-105 shadow-2xl">
          <div className="space-y-4">
            <div className="text-4xl">✨</div>
            <h2 className="text-2xl font-bold text-white">Simple Teleprompter</h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              <strong>EINFACH & ZUVERLÄSSIG!</strong> Minimale Lösung mit allen wichtigen Features.
            </p>
            <ul className="text-xs text-blue-200 space-y-1 text-left">
              <li>• Character-based Speed (1-20 = 100-2000 cpm)</li>
              <li>• Live Layout Controls (Font, Margin, Flip)</li>
              <li>• Manual Scroll Sync when Paused</li>
              <li>• Autonomous iPad Scrolling</li>
              <li>• WebSocket via Render.com</li>
            </ul>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => navigate('/simple')}
                className="flex-1 px-4 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors"
              >
                🎛️ Regie
              </button>
              <button
                onClick={() => navigate('/simple-ausspielung')}
                className="flex-1 px-4 py-3 bg-blue-800 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                📺 iPad
              </button>
            </div>
          </div>
        </div>

        {/* Legacy/Advanced Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-400 text-center">Legacy/Advanced Versionen</h3>
          <div className="grid md:grid-cols-3 gap-6">
          {/* Regie v1 Button */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:scale-105">
            <div className="space-y-4">
              <div className="text-3xl">🎛️</div>
              <h2 className="text-lg font-semibold text-white">Regie v1</h2>
              <p className="text-gray-400 text-xs leading-relaxed">
                Klassische Regie mit Live-Vorschau und localStorage-Sync.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 text-left">
                <li>• Live-Vorschau</li>
                <li>• Super Light Modus</li>
                <li>• localStorage Sync</li>
              </ul>
              <button
                onClick={openRegie}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
              >
                🎛️ Regie v1 (Legacy)
              </button>
            </div>
          </div>
          
          {/* Regie v2 Button */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-purple-500 hover:border-purple-400 transition-all duration-300 hover:scale-105 ring-2 ring-purple-500/20">
            <div className="space-y-4">
              <div className="text-3xl">🚀</div>
              <h2 className="text-lg font-semibold text-white">Regie v2.0</h2>
              <p className="text-purple-400 text-xs leading-relaxed">
                <strong>NEW!</strong> iPad-authoritative mit Ghost Simulation. Maximale Performance.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 text-left">
                <li>• Ghost Simulation</li>
                <li>• Line-based Protocol</li>
                <li>• Ultra-Low Latency</li>
                <li>• Super Light Mode</li>
              </ul>
              <button
                onClick={openRegieV2}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                🚀 Regie v2.0 (NEW)
              </button>
            </div>
          </div>

          {/* Ausspielung Button */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-green-500 hover:border-green-400 transition-all duration-300 hover:scale-105">
            <div className="space-y-4">
              <div className="text-3xl">📺</div>
              <h2 className="text-lg font-semibold text-white">iPad Ausspielung</h2>
              <p className="text-green-400 text-xs leading-relaxed">
                <strong>v2.0!</strong> Authoritative iPad mit 60fps rAF-Loop.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 text-left">
                <li>• iPad = Source of Truth</li>
                <li>• 60fps Performance</li>
                <li>• Touch Controls</li>
                <li>• Keyframe Sync</li>
              </ul>
              <button
                onClick={openAusspielung}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
              >
                📺 iPad Ausspielung v2.0
              </button>
              {!hasContent && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 Startet mit Demo-Text
                </p>
              )}
            </div>
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
