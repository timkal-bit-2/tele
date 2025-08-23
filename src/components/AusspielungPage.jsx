import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { NewWebSocketProvider, useNewWebSocket } from '../hooks/useNewWebSocket.jsx'
import { optimizeScrollAnimation, getOptimizedSettings, detectFreeTierHosting } from '../utils/performanceOptimizer.js'

const AusspielungPageInternal = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [currentSettings, setCurrentSettings] = useState({})
  const [rawContent, setRawContent] = useState('')
  const previewRef = useRef(null)
  
  // WebSocket connection
  const {
    connectionStatus,
    isConnected,
    sendScrollPosition,
    onMessage,
    MESSAGE_TYPES
  } = useNewWebSocket()
  
  // Performance optimization for free tier hosting
  const hostingInfo = detectFreeTierHosting()
  const perfSettings = getOptimizedSettings()
  const [performanceWarning, setPerformanceWarning] = useState(false)

  // Get data from location state
  const locationData = location.state || {}
  const initialContent = locationData.rawContent || ''
  const initialSettings = locationData.settings || {}
  const initialScrollPosition = locationData.initialScrollPosition || 0

  // Initialize with data from location state
  useEffect(() => {
    setCurrentSettings(initialSettings)
    setRawContent(initialContent)
    setScrollPosition(initialScrollPosition)
  }, [initialSettings, initialContent, initialScrollPosition])

  // Debug log to check settings
  useEffect(() => {
    console.log('AusspielungPage settings:', currentSettings)
  }, [currentSettings])

  // Sync settings from localStorage (for real-time updates)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const storedSettings = localStorage.getItem('teleprompter-settings')
      if (storedSettings) {
        try {
          const parsedSettings = JSON.parse(storedSettings)
          setCurrentSettings(parsedSettings)
        } catch (error) {
          console.error('Error parsing settings:', error)
        }
      }
    }, 500)

    return () => clearInterval(pollInterval)
  }, [])

  // Initialize scroll position
  useEffect(() => {
    setScrollPosition(initialScrollPosition)
  }, [initialScrollPosition])

  // Sync scroll position back to main app via localStorage and WebSocket
  useEffect(() => {
    localStorage.setItem('ausspielungScrollPosition', scrollPosition.toString())
    
    // Send scroll position with super light mode awareness
    if (isConnected) {
      const superLightMode = currentSettings.superLightMode || false
      sendScrollPosition(scrollPosition, superLightMode)
    }
  }, [scrollPosition, isConnected, sendScrollPosition, currentSettings.superLightMode])

  // Listen for scroll position updates from main app
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'mainScrollPosition') {
        const newPosition = parseFloat(e.newValue) || 0
        setScrollPosition(newPosition)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Also poll for changes (fallback for same-origin)
    const pollInterval = setInterval(() => {
      const mainPosition = localStorage.getItem('mainScrollPosition')
      if (mainPosition !== null) {
        const position = parseFloat(mainPosition)
        if (Math.abs(position - scrollPosition) > 1) {
          setScrollPosition(position)
        }
      }
    }, 100)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(pollInterval)
    }
  }, [scrollPosition])

  // Listen for WebSocket messages from Regie
  useEffect(() => {
    const cleanupFunctions = []

    // Listen for scroll position updates
    cleanupFunctions.push(
      onMessage(MESSAGE_TYPES.SCROLL_POSITION, (data) => {
        console.log('📥 Received scroll position from Regie:', data.scrollPosition)
        if (Math.abs(data.scrollPosition - scrollPosition) > 5) {
          setScrollPosition(data.scrollPosition)
        }
      })
    )

    // Listen for content updates
    cleanupFunctions.push(
      onMessage(MESSAGE_TYPES.CONTENT_UPDATE, (data) => {
        console.log('📥 Received content update from Regie')
        if (data.content !== undefined) {
          setRawContent(data.content)
        }
        if (data.layoutSettings) {
          setCurrentSettings(prev => ({ ...prev, ...data.layoutSettings }))
        }
      })
    )

    // Listen for settings updates
    cleanupFunctions.push(
      onMessage(MESSAGE_TYPES.SETTINGS_UPDATE, (data) => {
        console.log('📥 Received settings update from Regie:', data)
        setCurrentSettings(data)
      })
    )

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [onMessage, MESSAGE_TYPES, scrollPosition])

  // Handle wheel scrolling
  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY
    setScrollPosition(prev => Math.max(0, Math.min(prev + delta, 50000)))
  }

  // Handle touch/mouse dragging
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ y: 0, scrollPosition: 0 })

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setDragStart({
      y: e.clientY,
      scrollPosition: scrollPosition
    })
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      
      const deltaY = e.clientY - dragStart.y
      const newPosition = Math.max(0, Math.min(dragStart.scrollPosition - deltaY, 50000))
      setScrollPosition(newPosition)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  // Fullscreen handling
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } catch (err) {
        console.log('Fullscreen not supported:', err)
      }
    } else {
      try {
        await document.exitFullscreen()
        setIsFullscreen(false)
      } catch (err) {
        console.log('Exit fullscreen failed:', err)
      }
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Process content - fall back to localStorage if WebSocket content is empty
  useEffect(() => {
    if (!rawContent) {
      const savedFiles = localStorage.getItem('teleprompter-files')
      if (savedFiles) {
        try {
          const files = JSON.parse(savedFiles)
          if (files.length > 0) {
            setRawContent(files[0].content)
          }
        } catch (error) {
          console.error('Error loading files from localStorage:', error)
        }
      }
    }
  }, [rawContent])

  // Process content
  const contentToProcess = rawContent || 'Warten auf Regie-Verbindung...\n\nBitte starten Sie die Regie und laden Sie einen Text.'
  const processedContent = ('\n'.repeat(currentSettings.emptyLinesAtStart || 5) + contentToProcess)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .split('\n').map((line, index) => (
      <div key={index} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
    ))

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Header with controls - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="bg-gray-900 px-4 py-3 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
            >
              🏠 Zur Startseite
            </button>
            <button
              onClick={() => navigate('/regie')}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white text-sm transition-colors"
            >
              🎛️ Zur Regie
            </button>
            <h1 className="text-white font-medium">📺 Ausspielung</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {currentSettings.superLightMode && (
              <div className="text-xs px-2 py-1 rounded bg-purple-600 text-white font-medium">
                ⚡ Super Light Modus
              </div>
            )}
            {hostingInfo.isFreeTier && !currentSettings.superLightMode && (
              <div className="text-xs px-2 py-1 rounded bg-orange-600 text-white font-medium">
                ⚡ Free Tier - Reduzierte Performance
              </div>
            )}
            <div className={`text-xs px-2 py-1 rounded font-medium ${
              connectionStatus === 'connected' 
                ? 'bg-green-600 text-white' 
                : connectionStatus === 'connecting'
                ? 'bg-yellow-600 text-white'
                : 'bg-red-600 text-white'
            }`}>
              {connectionStatus === 'connected' ? '🟢 Sync' :
               connectionStatus === 'connecting' ? '🟡 Verbinde...' : '🔴 Offline'}
            </div>
            <div className="text-sm text-gray-400">
              Position: {Math.round(scrollPosition)}px
            </div>
            <button
              onClick={toggleFullscreen}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-colors"
            >
              {isFullscreen ? '🔲 Vollbild verlassen' : '⛶ Vollbild'}
            </button>
          </div>
        </div>
      )}

      {/* Discrete fullscreen exit button - only visible in fullscreen */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-30 px-2 py-1 bg-gray-800 bg-opacity-60 hover:bg-opacity-80 rounded text-gray-300 text-xs transition-all opacity-70 hover:opacity-100"
          style={{ fontSize: '12px' }}
        >
          ✕ Vollbild verlassen
        </button>
      )}

      {/* Main teleprompter display */}
      <div 
        ref={previewRef}
        className="flex-1 overflow-hidden bg-black relative"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
      >
        {/* Speed Display */}
        <div style={{
          position: 'absolute',
          top: isFullscreen ? '4px' : '20px',
          right: isFullscreen ? '4px' : '20px',
          backgroundColor: isFullscreen ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.8)',
          color: isFullscreen ? 'rgba(255, 255, 255, 0.6)' : 'white',
          padding: isFullscreen ? '6px 10px' : '12px 16px',
          borderRadius: '8px',
          fontSize: isFullscreen ? '12px' : '16px',
          fontWeight: 'bold',
          zIndex: 20,
          border: isFullscreen ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
          opacity: isFullscreen ? 0.7 : 1,
          transition: 'all 0.3s ease'
        }}>
          Speed: {((currentSettings.speed || 0.5) * 10).toFixed(1)}
        </div>
        
        <div className="h-full flex items-start justify-center overflow-auto">
          <div style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: `${currentSettings.fontSize || 48}px`,
            lineHeight: currentSettings.lineHeight || 1.4,
            color: 'white',
            paddingLeft: `${currentSettings.padding || 100}px`,
            paddingRight: `${currentSettings.padding || 100}px`,
            paddingTop: '40px',
            paddingBottom: '40px',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            // Performance-optimized transform based on hosting provider
            ...(() => {
              const optimized = optimizeScrollAnimation(scrollPosition + 180, perfSettings)
              return {
                transform: `${optimized.transform} 
                           scaleX(${currentSettings.mirrorHorizontal ? -1 : 1}) 
                           scaleY(${currentSettings.mirrorVertical ? -1 : 1})`,
                willChange: optimized.willChange,
                backfaceVisibility: 'hidden',
                perspective: '1000px'
              }
            })(),
            transition: 'none',
            width: '1000px',
            minWidth: '1000px',
            textAlign: 'left',
            // Font rendering optimization
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            // Prevent layout shifts
            contain: 'layout style paint'
          }}>
            {processedContent}
          </div>
        </div>
      </div>

      {/* Touch controls for mobile */}
      <div className="md:hidden bg-gray-900 px-4 py-3 flex justify-center gap-4">
        <button
          onTouchStart={() => setScrollPosition(prev => Math.max(0, prev - 50))}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded text-white text-lg"
        >
          ⬆️
        </button>
        <button
          onTouchStart={() => setScrollPosition(prev => Math.min(prev + 50, 50000))}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded text-white text-lg"
        >
          ⬇️
        </button>
      </div>
    </div>
  )
}

// Wrapper component with WebSocket Provider
const AusspielungPage = () => {
  return (
    <NewWebSocketProvider>
      <AusspielungPageInternal />
    </NewWebSocketProvider>
  )
}

export default AusspielungPage
