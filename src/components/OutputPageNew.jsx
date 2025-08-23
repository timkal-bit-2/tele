import { useState, useEffect } from 'react'
import OutputTeleprompter from './OutputTeleprompter'
import { useTeleprompterState } from '../hooks/useTeleprompterState'
import { useTeleprompterWebSocket, MESSAGE_TYPES } from '../hooks/useTeleprompterWebSocket'

const OutputPage = ({ onReset }) => {
  const [headerVisible, setHeaderVisible] = useState(true)
  
  // Central state management
  const {
    docId,
    plainText,
    layoutSettings,
    playbackState,
    updateLayoutSettings,
    updatePlaybackState,
    updateContent,
    play,
    pause,
    seekToLine
  } = useTeleprompterState()

  // WebSocket connection
  const websocket = useTeleprompterWebSocket(
    process.env.REACT_APP_WS_URL || `ws://${window.location.hostname}:3002`
  )

  // Auto-hide header
  useEffect(() => {
    let hideTimer
    
    const showHeader = () => {
      setHeaderVisible(true)
      clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        setHeaderVisible(false)
      }, 3000)
    }
    
    const handleMouseMove = () => showHeader()
    const handleKeyPress = () => showHeader()
    
    // Show initially
    showHeader()
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('keydown', handleKeyPress)
    
    return () => {
      clearTimeout(hideTimer)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [])

  // WebSocket message handlers
  useEffect(() => {
    const cleanup = []
    
    // Handle content updates from input
    cleanup.push(websocket.on(MESSAGE_TYPES.CONTENT_UPDATE, (payload) => {
      updateContent(payload.plainText)
    }))
    
    // Handle layout settings changes
    cleanup.push(websocket.on(MESSAGE_TYPES.LAYOUT_SETTINGS, (payload) => {
      updateLayoutSettings(payload)
    }))
    
    // Handle playback state changes
    cleanup.push(websocket.on(MESSAGE_TYPES.PLAYBACK_STATE, (payload) => {
      updatePlaybackState(payload)
    }))
    
    // Handle seek commands
    cleanup.push(websocket.on(MESSAGE_TYPES.SEEK_LINE, (payload) => {
      seekToLine(payload.lineIndex)
    }))

    return () => cleanup.forEach(fn => fn())
  }, [websocket, updateContent, updateLayoutSettings, updatePlaybackState, seekToLine])

  // Broadcast current line changes to other clients
  const handleCurrentLineChange = (lineIndex) => {
    updatePlaybackState({ currentLineIndex: lineIndex })
    if (websocket.isConnected()) {
      websocket.send('line-update', { currentLineIndex: lineIndex })
    }
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (playbackState.isScrolling) {
          pause()
        } else {
          play()
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault()
        seekToLine(Math.max(0, playbackState.currentLineIndex - 1))
      } else if (e.code === 'ArrowDown') {
        e.preventDefault()
        seekToLine(playbackState.currentLineIndex + 1)
      } else if (e.code === 'Home') {
        e.preventDefault()
        seekToLine(0)
      }
    }
    
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [playbackState.isScrolling, playbackState.currentLineIndex, play, pause, seekToLine])

  return (
    <div className="h-screen w-screen bg-black text-white relative overflow-hidden">
      {/* Header (auto-hide) */}
      <div 
        className={`absolute top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm transition-all duration-300 ${
          headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onReset}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              ← Zurück
            </button>
            <h1 className="text-xl font-semibold">Output (iPad/Display)</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-300">
              Zeile: {playbackState.currentLineIndex + 1}
            </div>
            <div className="text-sm text-gray-300">
              Speed: {playbackState.speed.toFixed(1)} L/min
            </div>
            <button
              onClick={playbackState.isScrolling ? pause : play}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                playbackState.isScrolling 
                  ? 'bg-red-600 hover:bg-red-500 text-white' 
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {playbackState.isScrolling ? '⏸️ Stop' : '▶️ Play'}
            </button>
          </div>
        </div>
      </div>

      {/* Main teleprompter content */}
      <OutputTeleprompter
        plainText={plainText}
        layoutSettings={layoutSettings}
        playbackState={playbackState}
        onCurrentLineChange={handleCurrentLineChange}
        className="h-full w-full"
      />
      
      {/* Keyboard shortcuts help */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-black/60 px-2 py-1 rounded">
        Space: Play/Pause • ↑↓: Navigate • Home: Top
      </div>
    </div>
  )
}

export default OutputPage
