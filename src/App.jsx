import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// Teleprompter Preview Component
const TeleprompterPreview = ({ 
  previewRef, 
  rawContent, 
  settings, 
  scrollPosition,
  playbackState, 
  isDraggingText, 
  isDraggingLine,
  handleWheel, 
  handleMouseDown, 
  handleLineMouseDown,
  showControls = true,
  isSmall = false,
  className = "",
  onScrollPositionChange = null, // Callback for scroll position changes
  enableMirroring = false // New parameter to control mirroring
}) => {
  const processedContent = ('\n'.repeat(settings.emptyLinesAtStart) + rawContent)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .split('\n').map((line, index) => (
      <div key={index} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
    ))

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {showControls && (
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-300">📺 Teleprompter Vorschau</h3>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">
              Speed: {(settings.speed * 10).toFixed(1)}
            </div>
            <div className="text-xs px-2 py-1 rounded bg-red-600 text-white">
              {playbackState.isScrolling ? '▶️ Auto' : '⏸️ Manual'} | Pos: {Math.round(scrollPosition)}px | Chars: {rawContent.length}
            </div>
          </div>
        </div>
      )}
      <div 
        ref={isSmall ? null : previewRef}
        className="flex-1 min-h-0 overflow-hidden bg-black relative"
        onWheel={isSmall ? (e) => {
          e.preventDefault()
          const delta = e.deltaY
          const newPosition = Math.max(0, Math.min(scrollPosition + delta, 50000))
          if (onScrollPositionChange) {
            onScrollPositionChange(newPosition)
          }
        } : handleWheel}
        onMouseDown={isSmall ? null : handleMouseDown}
        style={{
          cursor: isSmall ? 'default' : (playbackState.isScrolling ? 'default' : (isDraggingText ? 'grabbing' : 'grab')),
          userSelect: 'none'
        }}
      >
        {/* Reading Line */}
        {settings.showReadingLine && !isSmall && (
          <div style={{
            position: 'absolute',
            top: `${settings.readingLinePosition}%`,
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: 'red',
            zIndex: 10,
            opacity: 0.8
          }}>
            {/* Drag Handle */}
            <div
              onMouseDown={handleLineMouseDown}
              style={{
                position: 'absolute',
                right: '10px',
                top: '-8px',
                width: '16px',
                height: '16px',
                backgroundColor: 'red',
                borderRadius: '50%',
                cursor: 'ns-resize',
                opacity: isDraggingLine ? 1 : 0.7
              }}
            ></div>
          </div>
        )}
        
        {/* Speed Display */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: isSmall ? '10px' : '14px',
          fontWeight: 'bold',
          zIndex: 20,
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          Speed: {(settings.speed * 10).toFixed(1)}
        </div>
        
        <div className="h-full flex items-start justify-center overflow-auto">
          <div style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: isSmall ? `${settings.fontSize * 0.25}px` : `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            color: 'white',
            paddingLeft: isSmall ? `${settings.padding * 0.25}px` : `${settings.padding}px`,
            paddingRight: isSmall ? `${settings.padding * 0.25}px` : `${settings.padding}px`,
            paddingTop: '20px',
            paddingBottom: '20px',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            transform: isSmall 
              ? `translateY(${(-scrollPosition - 180) * 0.25}px)${enableMirroring ? ` scaleX(${settings.mirrorHorizontal ? -1 : 1}) scaleY(${settings.mirrorVertical ? -1 : 1})` : ''}`
              : `translateY(${-scrollPosition - 180}px)${enableMirroring ? ` scaleX(${settings.mirrorHorizontal ? -1 : 1}) scaleY(${settings.mirrorVertical ? -1 : 1})` : ''}`,
            transition: playbackState.isScrolling ? 'none' : 'transform 0.3s ease',
            width: isSmall ? '200px' : '800px',
            minWidth: isSmall ? '200px' : '800px',
            textAlign: 'left'
          }}>
            {processedContent}
          </div>
        </div>
      </div>
    </div>
  )
}

// ResizablePanel Komponente
const ResizablePanel = ({ children, defaultSize = 300, minSize = 200, maxSize = 600, side = 'left' }) => {
  const [size, setSize] = useState(defaultSize)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef(null)

  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      
      const rect = panelRef.current?.parentElement?.getBoundingClientRect()
      if (!rect) return

      let newSize
      if (side === 'left') {
        newSize = e.clientX - rect.left
      } else {
        newSize = rect.right - e.clientX
      }

      newSize = Math.max(minSize, Math.min(maxSize, newSize))
      setSize(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, side, minSize, maxSize])

  return (
    <div 
      ref={panelRef}
      className="relative flex-shrink-0 bg-gray-800"
      style={{ width: side === 'left' ? size : 'auto', minWidth: side === 'left' ? size : 'auto' }}
    >
      {children}
      <div
        className={`absolute top-0 ${side === 'left' ? 'right-0' : 'left-0'} w-1 h-full bg-gray-600 hover:bg-blue-500 cursor-col-resize transition-colors ${isResizing ? 'bg-blue-500' : ''}`}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

// Teleprompter Regie - Hauptkomponente
const TeleprompterRegie = ({ onReset }) => {
  console.log('TeleprompterRegie rendering...')
  
  const navigate = useNavigate()
  const [rawContent, setRawContent] = useState('Dies ist ein Test-Text für die Teleprompter-Vorschau. Wenn du das siehst, funktioniert die Anzeige.')
  const [files, setFiles] = useState([])
  const [activeFileId, setActiveFileId] = useState(null)
  const [playbackState, setPlaybackState] = useState({
    isScrolling: false,
    speed: 0.5
  })
  const [settings, setSettings] = useState({
    fontSize: 40,
    speed: 0.2,
    padding: 111,
    lineHeight: 1.7,
    showReadingLine: true,
    readingLinePosition: 25,
    mirrorHorizontal: false,
    mirrorVertical: false,
    emptyLinesAtStart: 2
  })
  const [scrollPosition, setScrollPosition] = useState(0)  // Always start at 0 for mouse scroll
  const [isDraggingLine, setIsDraggingLine] = useState(false)
  const [isDraggingText, setIsDraggingText] = useState(false)
  const [presets, setPresets] = useState(() => {
    // Lade Presets aus localStorage
    try {
      const saved = localStorage.getItem('teleprompter-presets')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [presetName, setPresetName] = useState('')
  const [editingPresetIndex, setEditingPresetIndex] = useState(null)
  const intervalRef = useRef(null)
  const previewRef = useRef(null)

  // Sync scroll position to localStorage for Ausspielung page
  useEffect(() => {
    localStorage.setItem('mainScrollPosition', scrollPosition.toString())
  }, [scrollPosition])

  // Listen for scroll position updates from Ausspielung page
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const ausspielungPosition = localStorage.getItem('ausspielungScrollPosition')
      if (ausspielungPosition !== null) {
        const position = parseFloat(ausspielungPosition)
        if (Math.abs(position - scrollPosition) > 1) {
          setScrollPosition(position)
        }
      }
    }, 100)

    return () => clearInterval(pollInterval)
  }, [scrollPosition])

  // Load saved files from localStorage
  useEffect(() => {
    const savedFiles = localStorage.getItem('teleprompter-files')
    if (savedFiles) {
      try {
        const parsedFiles = JSON.parse(savedFiles)
        setFiles(parsedFiles)
        if (parsedFiles.length > 0) {
          setActiveFileId(parsedFiles[0].id)
          setRawContent(parsedFiles[0].content)
        }
      } catch (error) {
        console.error('Error loading files:', error)
      }
    }
  }, [])

  // Save files to localStorage when files change
  useEffect(() => {
    localStorage.setItem('teleprompter-files', JSON.stringify(files))
  }, [files])

  const handleFileSelect = (fileId) => {
    const file = files.find(f => f.id === fileId)
    if (file) {
      setActiveFileId(fileId)
      setRawContent(file.content)
    }
  }

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          content: e.target.result,
          uploadedAt: new Date().toISOString()
        }
        setFiles(prev => [...prev, newFile])
        setActiveFileId(newFile.id)
        setRawContent(newFile.content)
      }
      reader.readAsText(file)
    })
    event.target.value = ''
  }

  const handleDeleteFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    if (activeFileId === fileId) {
      const remainingFiles = files.filter(f => f.id !== fileId)
      if (remainingFiles.length > 0) {
        setActiveFileId(remainingFiles[0].id)
        setRawContent(remainingFiles[0].content)
      } else {
        setActiveFileId(null)
        setRawContent('Dies ist ein Test-Text für die Teleprompter-Vorschau. Wenn du das siehst, funktioniert die Anzeige.')
      }
    }
  }

  const handleDownloadFile = () => {
    const activeFile = files.find(f => f.id === activeFileId)
    const filename = activeFile ? activeFile.name : 'teleprompter-text.txt'
    const element = document.createElement('a')
    const file = new Blob([rawContent], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = filename
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Auto-scroll functionality (Memory-optimiert)
  useEffect(() => {
    if (playbackState.isScrolling) {
      intervalRef.current = setInterval(() => {
        setScrollPosition(prev => {
          const newPos = prev + (settings.speed * 10)
          // Verhindere endlose Updates bei sehr hohen Werten
          return Math.min(newPos, 50000) // Max 50k Pixel
        })
      }, 50)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null // Explizit null setzen
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null // Cleanup
      }
    }
  }, [playbackState.isScrolling, settings.speed])

  const togglePlayback = () => {
    setPlaybackState(prev => ({ ...prev, isScrolling: !prev.isScrolling }))
  }

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    
    // Save to localStorage for Ausspielung page sync
    localStorage.setItem('teleprompter-settings', JSON.stringify(newSettings))
    
    if (key === 'speed') {
      setPlaybackState(prev => ({ ...prev, speed: value }))
    }
  }

  // Mouse wheel scrolling
  const handleWheel = (e) => {
    e.preventDefault()
    // Stop auto-scrolling when user scrolls manually
    if (playbackState.isScrolling) {
      setPlaybackState(prev => ({ ...prev, isScrolling: false }))
    }
    const delta = e.deltaY > 0 ? 50 : -50
    setScrollPosition(prev => Math.max(-300, prev + delta))  // Limit upward scroll to -300px
  }

  // Drag scrolling (Memory-optimiert)
  const handleMouseDown = (e) => {
    if (playbackState.isScrolling) return
    
    setIsDraggingText(true)
    const startY = e.clientY
    const startScrollPos = scrollPosition
    
    const handleMouseMove = (e) => {
      const deltaY = e.clientY - startY
      const newScrollPos = startScrollPos - deltaY * 2
      setScrollPosition(Math.max(-300, Math.min(50000, newScrollPos))) // Begrenzt und verhindert Memory-Leaks
    }
    
    const handleMouseUp = () => {
      setIsDraggingText(false)
      document.removeEventListener('mousemove', handleMouseMove, { passive: false })
      document.removeEventListener('mouseup', handleMouseUp, { passive: false })
    }
    
    // Cleanup bestehende Listeners vor dem Hinzufügen neuer
    document.removeEventListener('mousemove', handleMouseMove, { passive: false })
    document.removeEventListener('mouseup', handleMouseUp, { passive: false })
    
    document.addEventListener('mousemove', handleMouseMove, { passive: false })
    document.addEventListener('mouseup', handleMouseUp, { passive: false })
  }

  // Reading line drag (Memory-optimiert)
  const handleLineMouseDown = (e) => {
    e.stopPropagation()
    setIsDraggingLine(true)
    
    const handleMouseMove = (e) => {
      if (previewRef.current) {
        const rect = previewRef.current.getBoundingClientRect()
        const relativeY = e.clientY - rect.top
        const percentage = Math.max(10, Math.min(90, (relativeY / rect.height) * 100))
        updateSetting('readingLinePosition', Math.round(percentage))
      }
    }
    
    const handleMouseUp = () => {
      setIsDraggingLine(false)
      document.removeEventListener('mousemove', handleMouseMove, { passive: false })
      document.removeEventListener('mouseup', handleMouseUp, { passive: false })
    }
    
    // Cleanup bestehende Listeners
    document.removeEventListener('mousemove', handleMouseMove, { passive: false })
    document.removeEventListener('mouseup', handleMouseUp, { passive: false })
    
    document.addEventListener('mousemove', handleMouseMove, { passive: false })
    document.addEventListener('mouseup', handleMouseUp, { passive: false })
  }

  // Speichern eines neuen Presets
  const savePreset = () => {
    if (!presetName.trim()) return
    const newPreset = {
      name: presetName.trim(),
      settings: { ...settings }
    }
    const updated = [...presets.slice(0, 2), newPreset] // max 3 Presets
    setPresets(updated)
    localStorage.setItem('teleprompter-presets', JSON.stringify(updated))
    setPresetName('')
    setEditingPresetIndex(null)
  }

  // Laden eines Presets
  const loadPreset = (idx) => {
    setSettings({ ...presets[idx].settings })
  }

  // Löschen eines Presets
  const deletePreset = (idx) => {
    const updated = presets.filter((_, i) => i !== idx)
    setPresets(updated)
    localStorage.setItem('teleprompter-presets', JSON.stringify(updated))
  }

  // Umbenennen eines Presets
  const renamePreset = (idx, newName) => {
    const updated = presets.map((p, i) => i === idx ? { ...p, name: newName } : p)
    setPresets(updated)
    localStorage.setItem('teleprompter-presets', JSON.stringify(updated))
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Top Header */}
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
          >
            🏠 Startseite
          </button>
          <h1 className="text-lg font-medium text-white">🎛️ Teleprompter Regie</h1>
        </div>
        <div className="text-xs text-gray-500">
          Professionelle Teleprompter-Steuerung
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
      <ResizablePanel defaultSize={350} minSize={280} maxSize={500}>
        {/* Left Panel - Settings and Controls */}
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {/* Controls */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-300 mb-3">🎮 Steuerung</h3>
                <div className="space-y-2">
                  <button
                    onClick={togglePlayback}
                    className={`w-full px-4 py-2 text-sm font-medium rounded transition-colors ${
                      playbackState.isScrolling 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {playbackState.isScrolling ? '⏸️ Stopp' : '▶️ Start'}
                  </button>
                </div>
              </div>

              {/* Settings */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">⚙️ Einstellungen</h3>
                  <button
                    onClick={() => {
                      setSettings({
                        fontSize: 60,
                        lineHeight: 1.2,
                        speed: 2.0,
                        padding: 20,
                        readingLinePosition: 50,
                        showReadingLine: true,
                        mirrorHorizontal: false,
                        mirrorVertical: false,
                        emptyLinesAtStart: 2
                      })
                    }}
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                    title="Standardeinstellungen wiederherstellen"
                  >
                    Reset
                  </button>
                </div>
                <div className="space-y-3">
                  {/* Font Size */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">
                      Schriftgröße: {settings.fontSize}px
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="120"
                      value={settings.fontSize}
                      onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Speed */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">
                      Geschwindigkeit: {(settings.speed * 10).toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="80"
                      step="1"
                      value={Math.round(settings.speed * 10)}
                      onChange={(e) => updateSetting('speed', parseInt(e.target.value) / 10)}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Padding */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">
                      Innenabstand: {settings.padding}px
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      value={settings.padding}
                      onChange={(e) => updateSetting('padding', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Line Height */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">
                      Zeilenhöhe: {settings.lineHeight}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={settings.lineHeight}
                      onChange={(e) => updateSetting('lineHeight', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Empty Lines at Start */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">
                      Leerzeilen am Anfang: {settings.emptyLinesAtStart}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={settings.emptyLinesAtStart}
                      onChange={(e) => updateSetting('emptyLinesAtStart', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Reading Line Toggle */}
                  <div className="mb-3">
                    <label className="flex items-center text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={settings.showReadingLine}
                        onChange={(e) => updateSetting('showReadingLine', e.target.checked)}
                        className="mr-2"
                      />
                      Leselinie anzeigen
                    </label>
                  </div>

                  {/* Reading Line Position */}
                  {settings.showReadingLine && (
                    <div className="mb-3">
                      <label className="block text-xs text-gray-300 mb-1">
                        Position: {Math.round(settings.readingLinePosition)}%
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={settings.readingLinePosition}
                        onChange={(e) => updateSetting('readingLinePosition', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Einstellungen-Presets */}
              <div className="mb-4">
                <h4 className="text-xs text-gray-400 mb-2">Einstellungen-Presets</h4>
                <div className="space-y-2">
                  {presets.map((preset, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded"
                        onClick={() => loadPreset(idx)}
                      >
                        Laden
                      </button>
                      {editingPresetIndex === idx ? (
                        <input
                          className="px-2 py-1 text-xs rounded bg-gray-700 text-white border border-gray-600"
                          value={preset.name}
                          onChange={e => renamePreset(idx, e.target.value)}
                          onBlur={() => setEditingPresetIndex(null)}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="text-xs text-gray-200 cursor-pointer hover:underline"
                          onClick={() => setEditingPresetIndex(idx)}
                        >
                          {preset.name}
                        </span>
                      )}
                      <button
                        className="px-2 py-1 text-xs bg-red-700 hover:bg-red-800 text-white rounded"
                        onClick={() => deletePreset(idx)}
                      >
                        Löschen
                      </button>
                    </div>
                  ))}
                  {presets.length < 3 && (
                    <div className="flex gap-2 mt-2">
                      <input
                        className="px-2 py-1 text-xs rounded bg-gray-700 text-white border border-gray-600"
                        value={presetName}
                        onChange={e => setPresetName(e.target.value)}
                        placeholder="Preset-Name"
                      />
                      <button
                        className="px-2 py-1 text-xs bg-green-700 hover:bg-green-800 text-white rounded"
                        onClick={savePreset}
                      >
                        Speichern
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Small Preview Window */}
              <div className="border-t border-gray-700 p-3">
                <h4 className="text-xs text-gray-400 mb-2">📡 Ausspielung</h4>
                <div className="h-32 border border-gray-600 rounded overflow-hidden mb-3">
                  <TeleprompterPreview
                    previewRef={null}
                    rawContent={rawContent}
                    settings={settings}
                    scrollPosition={scrollPosition}
                    playbackState={playbackState}
                    isDraggingText={isDraggingText}
                    isDraggingLine={isDraggingLine}
                    handleWheel={handleWheel}
                    handleMouseDown={null}
                    handleLineMouseDown={null}
                    showControls={false}
                    isSmall={true}
                    onScrollPositionChange={setScrollPosition}
                    enableMirroring={true}
                  />
                </div>
                
                {/* Ausspielung öffnen Button */}
                <button
                  onClick={() => navigate('/ausspielung', { 
                    state: { 
                      rawContent, 
                      settings, 
                      initialScrollPosition: scrollPosition 
                    } 
                  })}
                  className="w-full px-3 py-2 mb-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  📺 Ausspielung öffnen
                </button>
                
                {/* Mirror Controls */}
                <div className="space-y-2">
                  <label className="flex items-center text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={settings.mirrorHorizontal}
                      onChange={(e) => updateSetting('mirrorHorizontal', e.target.checked)}
                      className="mr-2"
                    />
                    Horizontal spiegeln
                  </label>
                  <label className="flex items-center text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={settings.mirrorVertical}
                      onChange={(e) => updateSetting('mirrorVertical', e.target.checked)}
                      className="mr-2"
                    />
                    Vertikal spiegeln
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ResizablePanel>

      {/* Right Panel - Preview and Editor */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top - Teleprompter Preview */}
        <div className="flex-1 bg-gray-950 min-h-0">
          <TeleprompterPreview
            previewRef={previewRef}
            rawContent={rawContent}
            settings={settings}
            scrollPosition={scrollPosition}
            playbackState={playbackState}
            isDraggingText={isDraggingText}
            isDraggingLine={isDraggingLine}
            handleWheel={handleWheel}
            handleMouseDown={handleMouseDown}
            handleLineMouseDown={handleLineMouseDown}
            showControls={true}
            isSmall={false}
            enableMirroring={false}
          />
        </div>

        {/* Bottom - Text Editor (Fixed Height) */}
        <div className="h-80 bg-gray-900 border-t border-gray-700 flex-shrink-0">
          <div className="h-full flex flex-col">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
              <h3 className="text-sm font-medium text-gray-300">✏️ Text Editor</h3>
              <div className="flex items-center gap-3">
                {/* File Management */}
                <input
                  type="file"
                  multiple
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload-editor"
                />
                <label
                  htmlFor="file-upload-editor"
                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded cursor-pointer transition-colors"
                >
                  📄 Upload
                </label>
                {activeFileId && (
                  <button
                    onClick={handleDownloadFile}
                    className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors"
                  >
                    💾 Download
                  </button>
                )}
                {files.length > 0 && (
                  <select
                    value={activeFileId || ''}
                    onChange={(e) => handleFileSelect(e.target.value)}
                    className="px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600"
                  >
                    <option value="">Datei wählen...</option>
                    {files.map(file => (
                      <option key={file.id} value={file.id}>
                        {file.name}
                      </option>
                    ))}
                  </select>
                )}
                {activeFileId && (
                  <button
                    onClick={() => handleDeleteFile(activeFileId)}
                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
                    title="Aktuelle Datei löschen"
                  >
                    🗑️
                  </button>
                )}
                <div className="text-xs text-gray-500">
                  Zeichen: {rawContent.length}
                </div>
              </div>
            </div>
            <textarea
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              className="flex-1 w-full p-4 bg-gray-900 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Geben Sie hier Ihren Teleprompter-Text ein..."
              spellCheck={false}
            />
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default TeleprompterRegie
