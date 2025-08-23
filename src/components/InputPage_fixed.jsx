import { useState, useEffect, useCallback, useRef } from 'react'
import TeleprompterEditor from './TeleprompterEditor'
import Settings from './Settings'
import FileManager from './FileManager'
import SimpleTeleprompterPreview from './SimpleTeleprompterPreview'
import ResizablePanel from './ResizablePanel'
import { useNewWebSocket } from '../hooks/useNewWebSocket'

const InputPage = ({ onReset }) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [rawContent, setRawContent] = useState('Dies ist ein Test-Text für die Teleprompter-Vorschau. Wenn du das siehst, funktioniert die Anzeige.')
  const [files, setFiles] = useState([])
  const [activeFileId, setActiveFileId] = useState(null)
  const previewRef = useRef(null)
  const [debugInfo, setDebugInfo] = useState(null)
  
  // Layout and playback state
  const [layoutSettings, setLayoutSettings] = useState({
    fontSize: 24,
    lineHeightUnitless: 1.4,
    margins: 20,
    fontFamily: 'system-ui, sans-serif'
  })
  
  const [playbackState, setPlaybackState] = useState({
    isScrolling: false,
    speed: 1.5,
    currentLineIndex: 0
  })

  // WebSocket connection
  const {
    connectionStatus,
    isConnected,
    sendContentUpdate,
    sendPlaybackState,
    sendSeekLine,
    sendLayoutSettings,
    onMessage,
    MESSAGE_TYPES
  } = useNewWebSocket()

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

  const handleFileAdd = (newFiles) => {
    const fileObjects = newFiles.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      content: file.content,
      createdAt: new Date().toISOString()
    }))
    
    setFiles(prevFiles => [...prevFiles, ...fileObjects])
    
    // Select first new file
    if (fileObjects.length > 0) {
      setActiveFileId(fileObjects[0].id)
      setRawContent(fileObjects[0].content)
    }
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

  // Handle content changes
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

    // Send content update via WebSocket
    if (isConnected) {
      sendContentUpdate(newContent, layoutSettings)
    }
  }

  // Handle playback controls
  const togglePlayback = () => {
    const newState = { ...playbackState, isScrolling: !playbackState.isScrolling }
    setPlaybackState(newState)
    
    if (isConnected) {
      sendPlaybackState(newState.isScrolling, newState.speed)
    }
  }

  // Navigation handlers
  const handleScrollToTop = () => {
    // Stop auto-scrolling first
    if (playbackState.isScrolling) {
      setPlaybackState(prev => ({ ...prev, isScrolling: false }))
      if (isConnected) {
        sendPlaybackState(false, playbackState.speed)
      }
    }
    // Trigger scroll to top in preview component
    if (previewRef.current && previewRef.current.scrollToTop) {
      previewRef.current.scrollToTop()
    }
  }

  const handleScrollToBottom = () => {
    // Stop auto-scrolling first
    if (playbackState.isScrolling) {
      setPlaybackState(prev => ({ ...prev, isScrolling: false }))
      if (isConnected) {
        sendPlaybackState(false, playbackState.speed)
      }
    }
    // Trigger scroll to bottom in preview component
    if (previewRef.current && previewRef.current.scrollToBottom) {
      previewRef.current.scrollToBottom()
    }
  }

  const handleSeek = (lineIndex) => {
    const newState = { ...playbackState, currentLineIndex: lineIndex }
    setPlaybackState(newState)
    
    if (isConnected) {
      sendSeekLine(lineIndex)
    }
  }

  const handleLineChange = (lineIndex) => {
    setPlaybackState(prev => ({ ...prev, currentLineIndex: lineIndex }))
  }

  // Handle debug info from preview component
  const handleDebugInfoChange = (info) => {
    setDebugInfo(info)
  }

  // Send initial content when WebSocket connects
  useEffect(() => {
    if (isConnected && rawContent) {
      sendContentUpdate(rawContent, layoutSettings)
      sendPlaybackState(playbackState.isScrolling, playbackState.speed)
    }
  }, [isConnected, rawContent, layoutSettings, playbackState, sendContentUpdate, sendPlaybackState])

  // Listen for Output line updates
  useEffect(() => {
    return onMessage(MESSAGE_TYPES.OUTPUT_LINE_UPDATE, (data) => {
      console.log('Output line update:', data.lineIndex)
      setPlaybackState(prev => ({ ...prev, currentLineIndex: data.lineIndex }))
    })
  }, [onMessage, MESSAGE_TYPES])

  // Legacy settings format conversion for compatibility
  const legacySettings = {
    fontSize: layoutSettings.fontSize,
    scrollSpeed: playbackState.speed, // Direct mapping 1-10
    margin: layoutSettings.margins,
    marginLeft: layoutSettings.marginLeft,
    marginRight: layoutSettings.marginRight,
    lineHeight: layoutSettings.lineHeightUnitless,
    mirrorHorizontal: false,
    mirrorVertical: false,
    showReadingLine: layoutSettings.showReadingLine !== false, // Default true
    readingLinePosition: layoutSettings.readingLinePosition || 40
  }

  const handleLegacySettingsChange = (newSettings) => {
    if (typeof newSettings === 'function') {
      const updated = newSettings(legacySettings)
      handleLegacySettingsChange(updated)
      return
    }

    // Convert legacy settings back to new format
    const newLayoutSettings = {
      fontSize: newSettings.fontSize || layoutSettings.fontSize,
      lineHeightUnitless: newSettings.lineHeight || layoutSettings.lineHeightUnitless,
      margins: newSettings.margin || layoutSettings.margins,
      marginLeft: newSettings.marginLeft || layoutSettings.marginLeft,
      marginRight: newSettings.marginRight || layoutSettings.marginRight,
      fontFamily: layoutSettings.fontFamily,
      showReadingLine: newSettings.showReadingLine,
      readingLinePosition: newSettings.readingLinePosition
    }

    const newPlaybackState = {
      ...playbackState,
      speed: newSettings.scrollSpeed || playbackState.speed
    }

    setLayoutSettings(newLayoutSettings)
    setPlaybackState(newPlaybackState)

    // Send updates via WebSocket
    if (isConnected) {
      sendContentUpdate(rawContent, newLayoutSettings)
      sendPlaybackState(newPlaybackState.isScrolling, newPlaybackState.speed)
      sendLayoutSettings(newLayoutSettings)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Status Bar */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Teleprompter Input</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-400">
              {isConnected ? 'Verbunden' : 'Getrennt'}
            </span>
          </div>
        </div>
        
        <button
          onClick={onReset}
          className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
        >
          Zurücksetzen
        </button>
      </div>

      {/* Main Content - Resizable Layout */}
      <div className="flex-1 flex overflow-hidden resizable-container">
        {/* Left Panel - Settings & File Manager */}
        <ResizablePanel 
          direction="horizontal" 
          initialSize="320px" 
          minSize="280px" 
          maxSize="480px"
          className="bg-gray-900 flex flex-col"
        >
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-300">⚙️ Steuerung</h3>
          </div>
          
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Play/Pause Controls */}
            <div className="flex-shrink-0 p-4 border-b border-gray-700">
              <button
                onClick={togglePlayback}
                className={`w-full px-4 py-3 rounded text-sm font-medium transition-colors mb-2 ${
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
                  onClick={handleScrollToTop}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium transition-colors"
                  disabled={playbackState.isScrolling}
                >
                  ⬆️ Anfang
                </button>
                <button
                  onClick={handleScrollToBottom}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium transition-colors"
                  disabled={playbackState.isScrolling}
                >
                  ⬇️ Ende
                </button>
              </div>
            </div>

            <div className="flex-shrink-0">
              <FileManager
                files={files}
                activeFileId={activeFileId}
                onFileSelect={handleFileSelect}
                onFileAdd={handleFileAdd}
                onFileDelete={handleFileDelete}
              />
            </div>
            
            <div className="flex-1 min-h-0 overflow-auto">
              <Settings 
                settings={legacySettings} 
                onSettingsChange={handleLegacySettingsChange}
              />
            </div>
          </div>
        </ResizablePanel>

        {/* Right Panel - Preview and Editor */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden resizable-container">
          {/* Top - Teleprompter Preview */}
          <ResizablePanel 
            direction="vertical" 
            initialSize="60%" 
            minSize="30%" 
            maxSize="80%"
            className="min-h-0 bg-gray-950"
          >
            <div className="h-full flex flex-col">
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-300">📺 Teleprompter Vorschau</h3>
                {debugInfo && (
                  <div 
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      backgroundColor: debugInfo.isScrolling ? '#059669' : (debugInfo.isDraggingText ? '#f59e0b' : '#dc2626'),
                      color: 'white'
                    }}
                  >
                    {debugInfo.status} | Speed: {debugInfo.speed}x | Pos: {debugInfo.position}px | Chars: {debugInfo.chars}
                  </div>
                )}
              </div>
              <div className="flex-1 min-h-0">
                <SimpleTeleprompterPreview
                  ref={previewRef}
                  content={rawContent}
                  layoutSettings={layoutSettings}
                  isScrolling={playbackState.isScrolling}
                  speed={playbackState.speed}
                  onSettingsChange={(newSettings) => {
                    setLayoutSettings(prev => ({ ...prev, ...newSettings }))
                  }}
                  onScrollToTop={handleScrollToTop}
                  onScrollToBottom={handleScrollToBottom}
                  onDebugInfoChange={handleDebugInfoChange}
                />
              </div>
            </div>
          </ResizablePanel>

          {/* Bottom - Text Editor */}
          <div className="flex-1 min-h-0 bg-gray-900">
            <div className="h-full flex flex-col">
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
                <h3 className="text-sm font-medium text-gray-300">📝 Text Editor</h3>
              </div>
              <div className="flex-1 min-h-0">
                <TeleprompterEditor
                  rawContent={rawContent}
                  onContentChange={handleContentChange}
                  layoutSettings={layoutSettings}
                  className="h-full p-4"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InputPage
