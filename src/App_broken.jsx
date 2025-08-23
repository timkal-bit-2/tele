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

  // Save files to localStorage
  useEffect(() => {
    localStorage.setItem('teleprompter-files', JSON.stringify(files))
  }, [files])

  // File management functions
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
        const fileObject = {
          id: Date.now() + Math.random(),
          name: file.name,
          content: e.target.result,
          createdAt: new Date().toISOString()
        }
        
        setFiles(prevFiles => [...prevFiles, fileObject])
        
        // Select the new file
        setActiveFileId(fileObject.id)
        setRawContent(fileObject.content)
      }
      reader.readAsText(file)
    })
  }

  const handleFileDelete = (fileId) => {
    setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId))
    
    // Select first remaining file or clear content
    const remainingFiles = files.filter(f => f.id !== fileId)
    if (remainingFiles.length > 0) {
      setActiveFileId(remainingFiles[0].id)
      setRawContent(remainingFiles[0].content)
    } else {
      setActiveFileId(null)
      setRawContent('')
    }
  }

  const handleContentChange = (newContent) => {
    setRawContent(newContent)
    
    // Update file if one is selected
    if (activeFileId) {
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file.id === activeFileId 
            ? { ...file, content: newContent }
            : file
        )
      )
    }
  }

  const downloadFile = (file) => {
    const blob = new Blob([file.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }

  // Auto-scroll effect
  useEffect(() => {
    if (playbackState.isScrolling) {
      intervalRef.current = setInterval(() => {
        setScrollPosition(prev => prev + settings.speed)
      }, 16) // ~60fps
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
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
      const newPos = startScrollPos - deltaY
      setScrollPosition(Math.max(0, newPos))
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
    
    const rect = previewRef.current.getBoundingClientRect()
    
    const handleMouseMove = (e) => {
      const y = e.clientY - rect.top
      const percentage = Math.max(10, Math.min(90, (y / rect.height) * 100))
      updateSetting('readingLinePosition', percentage)
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
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      <div className="h-full flex">
        {/* Left Panel - Settings & Controls */}
        <ResizablePanel defaultSize={320} minSize={280} maxSize={500} side="left">
          <div className="h-full flex flex-col">
            <div className="flex-shrink-0 p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold mb-4 text-blue-400">🎬 Teleprompter Regie</h2>
              
              <button
                onClick={togglePlayback}
                className={`w-full px-4 py-3 rounded text-sm font-medium mb-2 transition-colors ${
                  playbackState.isScrolling
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-green-600 hover:bg-green-500'
                }`}
              >
                {playbackState.isScrolling ? '⏸️ Pause' : '▶️ Start'}
              </button>
              
              {/* Navigation Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={scrollToTop}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium transition-colors"
                  disabled={playbackState.isScrolling}
                >
                  ⬆️ Anfang
                </button>
                <button 
                  onClick={scrollToBottom}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium transition-colors"
                  disabled={playbackState.isScrolling}
                >
                  ⬇️ Ende
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 bg-gray-800 overflow-auto">
              <div className="space-y-4">
                {/* Settings */}
                <div className="bg-gray-700 p-4 rounded">
                  <h4 className="text-sm font-medium mb-3 text-gray-200">📐 Text Einstellungen</h4>
                  
                  {/* Font Size */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">
                      Schriftgröße: {settings.fontSize}px
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="72"
                      value={settings.fontSize}
                      onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Speed */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">
                      Scroll-Geschwindigkeit: {Math.round(settings.speed * 10)}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={Math.round(settings.speed * 10)}
                      onChange={(e) => updateSetting('speed', parseInt(e.target.value) / 10)}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Padding */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">
                      Padding (Links/Rechts): {settings.padding}px
                    </label>
                    <input
                      type="range"
                      min="0"
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
                <h4 className="text-xs text-gray-400 mb-2">� Ausspielung</h4>
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
            <div className="h-full flex flex-col w-full">
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                <h3 className="text-sm font-medium text-gray-300">📝 Text Editor</h3>
                
                {/* File Management Controls */}
                <div className="flex items-center gap-2">
                  {/* File Upload */}
                  <label className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium cursor-pointer transition-colors">
                    📁 Datei laden
                    <input
                      type="file"
                      accept=".txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                      multiple
                    />
                  </label>

                  {/* File Selector */}
                  {files.length > 0 && (
                    <select
                      value={activeFileId || ''}
                      onChange={(e) => handleFileSelect(e.target.value)}
                      className="px-2 py-1 bg-gray-700 text-white rounded text-xs"
                    >
                      <option value="">Neue Datei</option>
                      {files.map(file => (
                        <option key={file.id} value={file.id}>
                          {file.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Download Current File */}
                  {activeFileId && (
                    <button
                      onClick={() => {
                        const currentFile = files.find(f => f.id === activeFileId)
                        if (currentFile) downloadFile(currentFile)
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs font-medium transition-colors"
                    >
                      💾 Download
                    </button>
                  )}

                  {/* Delete Current File */}
                  {activeFileId && (
                    <button
                      onClick={() => handleFileDelete(activeFileId)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs font-medium transition-colors"
                    >
                      🗑️ Löschen
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <textarea
                  value={rawContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full h-full p-4 bg-gray-900 text-white resize-none border-none outline-none"
                  placeholder="Geben Sie hier Ihren Text ein oder laden Sie eine Datei..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  console.log('App rendering...')
  
  const resetMode = () => {
    console.log('Reset clicked')
    window.location.reload()
  }

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      <TeleprompterRegie onReset={resetMode} />
    </div>
  )
}

export default App