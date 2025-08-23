import { useState, useEffect, useRef } from 'react'

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
  className = ""
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
              Speed: {Math.round(settings.speed * 10)}
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
        onWheel={isSmall ? null : handleWheel}
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
              ? `translateY(-${scrollPosition * 0.25}px) 
                 scaleX(${settings.mirrorHorizontal ? -1 : 1}) 
                 scaleY(${settings.mirrorVertical ? -1 : 1})`
              : `translateY(-${scrollPosition}px)`,
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
  
  const [rawContent, setRawContent] = useState('Dies ist ein Test-Text für die Teleprompter-Vorschau. Wenn du das siehst, funktioniert die Anzeige.')
  const [files, setFiles] = useState([])
  const [activeFileId, setActiveFileId] = useState(null)
  const [playbackState, setPlaybackState] = useState({
    isScrolling: false,
    speed: 0.5
  })
  const [settings, setSettings] = useState({
    fontSize: 40,
    speed: 0.5,
    padding: 111,
    lineHeight: 1.7,
    showReadingLine: true,
    readingLinePosition: 25,
    mirrorHorizontal: false,
    mirrorVertical: false,
    emptyLinesAtStart: 2
  })
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isDraggingLine, setIsDraggingLine] = useState(false)
  const [isDraggingText, setIsDraggingText] = useState(false)
  const intervalRef = useRef(null)
  const previewRef = useRef(null)

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

  // Auto-scroll functionality
  useEffect(() => {
    if (playbackState.isScrolling) {
      intervalRef.current = setInterval(() => {
        setScrollPosition(prev => prev + (settings.speed * 50))
      }, 50)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [playbackState.isScrolling, settings.speed])

  const togglePlayback = () => {
    setPlaybackState(prev => ({ ...prev, isScrolling: !prev.isScrolling }))
  }

  const scrollToTop = () => {
    setPlaybackState(prev => ({ ...prev, isScrolling: false }))
    // Force immediate scroll to top
    setTimeout(() => {
      setScrollPosition(0)
    }, 10)
  }

  const scrollToBottom = () => {
    if (previewRef.current) {
      const previewHeight = previewRef.current.clientHeight
      const contentHeight = previewRef.current.scrollHeight
      const maxScrollPosition = Math.max(0, contentHeight - previewHeight + 200) // +200px extra padding
      setScrollPosition(maxScrollPosition)
    }
    setPlaybackState(prev => ({ ...prev, isScrolling: false }))
  }

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    if (key === 'speed') {
      setPlaybackState(prev => ({ ...prev, speed: value }))
    }
  }

  // Mouse wheel scrolling
  const handleWheel = (e) => {
    if (!playbackState.isScrolling) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 50 : -50
      setScrollPosition(prev => Math.max(0, prev + delta))
    }
  }

  // Drag scrolling
  const handleMouseDown = (e) => {
    if (playbackState.isScrolling) return
    
    setIsDraggingText(true)
    const startY = e.clientY
    const startScrollPos = scrollPosition
    
    const handleMouseMove = (e) => {
      const deltaY = e.clientY - startY
      const newScrollPos = startScrollPos - deltaY * 2
      setScrollPosition(Math.max(0, newScrollPos))
    }
    
    const handleMouseUp = () => {
      setIsDraggingText(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Reading line drag
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
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex overflow-hidden">
      <ResizablePanel defaultSize={350} minSize={280} maxSize={500}>
        {/* Left Panel - Settings and Controls */}
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {/* File Management */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-300 mb-3">📁 Dateien</h3>
                <div className="space-y-2 mb-3">
                  <input
                    type="file"
                    multiple
                    accept=".txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="block w-full px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 rounded cursor-pointer text-center transition-colors"
                  >
                    📄 Dateien hochladen
                  </label>
                  {activeFileId && (
                    <button
                      onClick={handleDownloadFile}
                      className="w-full px-3 py-2 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors"
                    >
                      💾 Download
                    </button>
                  )}
                </div>

                {files.length > 0 && (
                  <div className="space-y-1">
                    {files.map(file => (
                      <div key={file.id} className="flex items-center gap-2">
                        <button
                          onClick={() => handleFileSelect(file.id)}
                          className={`flex-1 px-2 py-1 text-xs rounded text-left truncate transition-colors ${
                            activeFileId === file.id 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                          title={file.name}
                        >
                          {file.name}
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
                          title="Löschen"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={scrollToTop}
                      className="px-3 py-2 text-xs bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                    >
                      ⬆️ Anfang
                    </button>
                    <button
                      onClick={scrollToBottom}
                      className="px-3 py-2 text-xs bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                    >
                      ⬇️ Ende
                    </button>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-300 mb-3">⚙️ Einstellungen</h3>
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
                      Geschwindigkeit: {Math.round(settings.speed * 10)}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
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
                    handleWheel={null}
                    handleMouseDown={null}
                    handleLineMouseDown={null}
                    showControls={false}
                    isSmall={true}
                  />
                </div>
                
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
          />
        </div>

        {/* Bottom - Text Editor (Fixed Height) */}
        <div className="h-80 bg-gray-900 border-t border-gray-700 flex-shrink-0">
          <div className="h-full flex flex-col">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
              <h3 className="text-sm font-medium text-gray-300">✏️ Text Editor</h3>
              <div className="text-xs text-gray-500">
                Zeichen: {rawContent.length}
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
  )
}

function App() {
  return <TeleprompterRegie />
}

export default App
