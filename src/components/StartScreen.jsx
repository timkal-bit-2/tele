import { useState } from 'react'

const StartScreen = ({ onModeSelect }) => {
  const [selectedMode, setSelectedMode] = useState(null)

  const handleSelect = () => {
    setSelectedMode('input')
    // Add a small delay for visual feedback
    setTimeout(() => onModeSelect('input'), 150)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white">
            Live Teleprompter
          </h1>
          <p className="text-gray-300 text-lg">
            Professioneller Teleprompter für perfekte Präsentationen
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSelect}
            className={`w-full p-6 rounded-xl border-2 transition-all duration-200 ${
              selectedMode === 'input'
                ? 'bg-blue-600 border-blue-500 scale-95'
                : 'bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="space-y-2">
              <div className="text-3xl">🎬</div>
              <h3 className="text-xl font-semibold text-white">Teleprompter starten</h3>
              <p className="text-gray-300 text-sm">
                Text editieren, Geschwindigkeit anpassen und professionell präsentieren
              </p>
            </div>
          </button>
        </div>

        <div className="pt-8 text-gray-500 text-xs space-y-2">
          <p>✓ Einstellbare Geschwindigkeit und Schriftgröße</p>
          <p>✓ Spiegelung für Kamera-Setup</p>
          <p>✓ Datei-Import und Export</p>
        </div>
      </div>
    </div>
  )
}

export default StartScreen
