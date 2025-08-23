import { useState, useEffect } from 'react'
import NewOutputTeleprompter from './NewOutputTeleprompter'

/**
 * NewOutputPage - Modern Output page with WebSocket sync
 * 
 * Displays teleprompter content with:
 * - 30% marker position
 * - Auto-scroll functionality
 * - WebSocket synchronization with Input
 * - Fullscreen support
 * - Clean output-optimized UI
 */
const NewOutputPage = ({ onReset }) => {
  const [content, setContent] = useState('')
  const [layoutSettings, setLayoutSettings] = useState({
    fontSize: 24,
    lineHeightUnitless: 1.4,
    margins: 20,
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 400,
    letterSpacing: 0,
    mirrorHorizontal: false,
    mirrorVertical: false
  })
  
  const [playbackState, setPlaybackState] = useState({
    isScrolling: false,
    speed: 1.5,
    currentLineIndex: 0
  })
  
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [wsConnection, setWsConnection] = useState(null)
  const [showDebug, setShowDebug] = useState(false)

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket('ws://localhost:3002/ws')
        
        ws.onopen = () => {
          console.log('🔗 WebSocket connected to server')
          setConnectionStatus('connected')
          setWsConnection(ws)
        }
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            console.log('📨 Received:', message)
            
            switch (message.type) {
              case 'CONTENT_UPDATE':
                if (message.data.content !== undefined) {
                  setContent(message.data.content)
                }
                if (message.data.layoutSettings) {
                  setLayoutSettings(prev => ({ ...prev, ...message.data.layoutSettings }))
                }
                break
                
              case 'PLAYBACK_STATE':
                setPlaybackState(prev => ({ ...prev, ...message.data }))
                break
                
              case 'SEEK_LINE':
                setPlaybackState(prev => ({ 
                  ...prev, 
                  currentLineIndex: message.data.lineIndex 
                }))
                break
                
              case 'LAYOUT_SETTINGS':
                setLayoutSettings(prev => ({ ...prev, ...message.data }))
                break
                
              // Legacy support
              case 'content-update':
                if (message.content !== undefined) {
                  setContent(message.content)
                }
                if (message.isScrolling !== undefined || message.scrollPosition !== undefined) {
                  setPlaybackState(prev => ({
                    ...prev,
                    isScrolling: message.isScrolling || prev.isScrolling
                  }))
                }
                break
                
              default:
                console.log('Unknown message type:', message.type)
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }
        
        ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.reason)
          setConnectionStatus('disconnected')
          setWsConnection(null)
          
          // Auto-reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000)
        }
        
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error)
          setConnectionStatus('error')
        }
        
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        setConnectionStatus('error')
        setTimeout(connectWebSocket, 3000)
      }
    }

    connectWebSocket()

    // Cleanup on unmount
    return () => {
      if (wsConnection) {
        wsConnection.close()
      }
    }
  }, [])

  // Send line change updates back to Input
  const handleLineChange = (lineIndex) => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.send(JSON.stringify({
        type: 'OUTPUT_LINE_UPDATE',
        data: { lineIndex }
      }))
    }
  }

  // Connection status indicator
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#00ff00'
      case 'connecting': return '#ffaa00'
      case 'error': return '#ff0000'
      default: return '#666666'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '🔗 Connected'
      case 'connecting': return '🔄 Connecting'
      case 'error': return '❌ Error'
      default: return '🔌 Disconnected'
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'd' || event.key === 'D') {
        setShowDebug(!showDebug)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [showDebug])

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      {/* Minimal header */}
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onReset}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              ← Zurück
            </button>
            <h1 className="text-lg font-semibold">Output (iPad Pro-Teleprompter)</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection status */}
            <div 
              className="flex items-center space-x-2 text-sm"
              style={{ color: getStatusColor() }}
            >
              <span>{getStatusText()}</span>
            </div>
            
            {/* Playback status */}
            <div className="text-sm text-gray-300">
              {playbackState.isScrolling ? '▶️ Playing' : '⏸️ Paused'} 
              {playbackState.speed && ` (${playbackState.speed}x)`}
            </div>
            
            {/* Debug toggle */}
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                showDebug 
                  ? 'bg-green-600 hover:bg-green-500' 
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
            >
              Debug (D)
            </button>
          </div>
        </div>
      </div>

      {/* Main teleprompter display */}
      <div className="flex-1">
        <NewOutputTeleprompter
          content={content}
          layoutSettings={layoutSettings}
          isScrolling={playbackState.isScrolling}
          speed={playbackState.speed}
          currentLineIndex={playbackState.currentLineIndex}
          onLineChange={handleLineChange}
          showDebug={showDebug}
          className="w-full h-full"
        />
      </div>

      {/* Connection help */}
      {connectionStatus === 'disconnected' && (
        <div className="absolute bottom-4 left-4 right-4 bg-gray-900 border border-gray-700 rounded p-4">
          <div className="text-sm text-gray-300">
            <div className="font-semibold mb-2">🔌 Not connected to Input</div>
            <div className="text-xs space-y-1">
              <div>• Make sure the WebSocket server is running</div>
              <div>• Check that the Input page is open</div>
              <div>• Server should be running on ws://localhost:3002/ws</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewOutputPage
