import { useState, useEffect, useCallback } from 'react'
import TeleprompterEditor from './TeleprompterEditor'
import Settings from './Settings'
import FileManager from './FileManager'
import NewInputPreviewTeleprompter from './NewInputPreviewTeleprompter'
import { useNewWebSocket } from '../hooks/useNewWebSocket'

const InputPage = ({ onReset }) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [rawContent, setRawContent] = useState('')
  const [files, setFiles] = useState([])
  const [activeFileId, setActiveFileId] = useState(null)
  
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
    
    if (activeFileId === fileId) {
      const remainingFiles = files.filter(f => f.id !== fileId)
      if (remainingFiles.length > 0) {
        setActiveFileId(remainingFiles[0].id)
        setRawContent(remainingFiles[0].content)
      } else {
        setActiveFileId(null)
        setRawContent('')
      }
    }
  }

  const handleContentChange = (newContent) => {
    setRawContent(newContent)
    
    // Update active file
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
    scrollSpeed: playbackState.speed * 60,
    margin: layoutSettings.margins,
    lineHeight: layoutSettings.lineHeightUnitless,
    mirrorHorizontal: false,
    mirrorVertical: false,
    lineNumberOpacity: 60
  }

  const handleLegacySettingsChange = (newSettings) => {
    if (typeof newSettings === 'function') {
      const updated = newSettings(legacySettings)
      
      // Convert back to new format
      const newLayoutSettings = {
        fontSize: updated.fontSize,
        lineHeightUnitless: updated.lineHeight,
        margins: updated.margin,
        fontFamily: layoutSettings.fontFamily
      }
      
      const newPlaybackState = {
        ...playbackState,
        speed: updated.scrollSpeed / 60
      }
      
      setLayoutSettings(newLayoutSettings)
      setPlaybackState(newPlaybackState)
      
      // Send updates via WebSocket
      if (isConnected) {
        sendLayoutSettings(newLayoutSettings)
        sendPlaybackState(newPlaybackState.isScrolling, newPlaybackState.speed)
      }
    }
  }

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onReset}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              ← Zurück
            </button>
            <h1 className="text-xl font-semibold">Input (Regie)</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-300">
              Status: {isConnected ? '🔗 Connected' : '🔌 Disconnected'}
            </div>
            <button
              onClick={togglePlayback}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                playbackState.isScrolling
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-green-600 hover:bg-green-500'
              }`}
            >
              {playbackState.isScrolling ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                isPreviewMode 
                  ? 'bg-blue-600 hover:bg-blue-500' 
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
            >
              {isPreviewMode ? '📝 Editor' : '👁️ Preview'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - File Manager & Settings */}
        <div className="bg-gray-900 border-r border-gray-700 flex flex-col w-80">
          <FileManager
            files={files}
            activeFileId={activeFileId}
            onFileSelect={handleFileSelect}
            onFileAdd={handleFileAdd}
            onFileDelete={handleFileDelete}
          />
          
          <div className="overflow-auto flex-shrink-0">
            <Settings 
              settings={legacySettings} 
              onSettingsChange={handleLegacySettingsChange}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {isPreviewMode ? (
            <NewInputPreviewTeleprompter
              content={rawContent}
              layoutSettings={layoutSettings}
              isScrolling={playbackState.isScrolling}
              speed={playbackState.speed}
              currentLineIndex={playbackState.currentLineIndex}
              onLineChange={handleLineChange}
              onSeek={handleSeek}
              className="flex-1"
            />
          ) : (
            <TeleprompterEditor
              rawContent={rawContent}
              onContentChange={handleContentChange}
              layoutSettings={layoutSettings}
              className="flex-1 p-4"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default InputPage
