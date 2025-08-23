const Settings = ({ settings, onSettingsChange }) => {
  const updateSetting = (key, value) => {
    onSettingsChange(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="p-4 bg-gray-800 border-t border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-white">Einstellungen</h3>
      
      <div className="space-y-4">
        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Schriftgröße: {settings.fontSize}px
          </label>
          <input
            type="range"
            min="12"
            max="72"
            value={settings.fontSize}
            onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

    {/* Scroll Speed 0-50 (intern /10 = 0.0-5.0 Linien/s) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
  Geschwindigkeit: {Math.round((settings.scrollSpeed || 0) * 10)} {settings.scrollSpeed === 0 ? 'Stop' : ''}
          </label>
          <input
            type="range"
      min="0"
      max="50"
      step="1"
      value={Math.round((settings.scrollSpeed || 0) * 10)}
      onChange={(e) => updateSetting('scrollSpeed', parseInt(e.target.value) / 10)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
      <span>0</span>
      <span>25</span>
      <span>50</span>
          </div>
        </div>

        {/* Left Margin */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Margin Links: {settings.marginLeft || settings.margin || 20}px
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={settings.marginLeft || settings.margin || 20}
            onChange={(e) => updateSetting('marginLeft', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Right Margin */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Margin Rechts: {settings.marginRight || settings.margin || 20}px
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={settings.marginRight || settings.margin || 20}
            onChange={(e) => updateSetting('marginRight', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Line Height */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Zeilenhöhe: {settings.lineHeight}
          </label>
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={settings.lineHeight}
            onChange={(e) => updateSetting('lineHeight', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Mirror Options */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Spiegelung</h4>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.mirrorHorizontal}
              onChange={(e) => updateSetting('mirrorHorizontal', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Horizontal spiegeln</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.mirrorVertical}
              onChange={(e) => updateSetting('mirrorVertical', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Vertikal spiegeln</span>
          </label>
        </div>

        {/* Reading Line Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300">Reading Line</h4>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.showReadingLine !== false} // Default true
              onChange={(e) => updateSetting('showReadingLine', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Reading Line anzeigen</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reading Line Position: {Math.round((settings.readingLinePosition || 40))}%
            </label>
            <input
              type="range"
              min="10"
              max="90"
              value={settings.readingLinePosition || 40}
              onChange={(e) => updateSetting('readingLinePosition', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
