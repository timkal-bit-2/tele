import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTeleprompterClient } from '../hooks/useTeleprompterClient.js'
import { useIpadScrollEngine } from '../hooks/useIpadScrollEngine.js'
import { MESSAGE_TYPES, STATES } from '../types/teleprompterProtocol.js'
import { calculateTextHash } from '../utils/lineCalculator.js'

const AusspielungPageInternal = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const containerRef = useRef(null)
  
  // Initialize teleprompter client
  const teleprompterClient = useTeleprompterClient(true) // isIpad = true
  
  // Initialize iPad scroll engine
  const scrollEngine = useIpadScrollEngine(teleprompterClient)
  
  // Get initial data from location state
  const locationData = location.state || {}
  const initialContent = locationData.rawContent || ''
  const initialSettings = locationData.settings || {}
  
  // Initialize with content if provided
  useEffect(() => {
    if (initialContent && teleprompterClient.isConnected) {
      const hash = calculateTextHash(initialContent)
      const version = Date.now() // Simple versioning
      
      scrollEngine.loadScript(initialContent, version, hash)
      
      if (Object.keys(initialSettings).length > 0) {
        scrollEngine.updateParams({
          speed: (initialSettings.speed || 0.2) * 300, // Convert to lines/min
          fontSize: initialSettings.fontSize || 48,
          lineHeight: initialSettings.lineHeight || 1.4,
          mirror: {
            horizontal: initialSettings.mirrorHorizontal || false,
            vertical: initialSettings.mirrorVertical || false
          },
          margins: initialSettings.padding || 20
        })
      }
    }
  }, [initialContent, initialSettings, teleprompterClient.isConnected, scrollEngine])

  // Set up message handlers for new protocol
  useEffect(() => {
    const cleanupFunctions = []
    
    // Handle LOAD_SCRIPT from laptop
    cleanupFunctions.push(
      teleprompterClient.onMessage(MESSAGE_TYPES.LOAD_SCRIPT, (data) => {
        console.log('📜 Received LOAD_SCRIPT')
        scrollEngine.loadScript(data.content, data.scriptVersion, data.textHash)
        teleprompterClient.sendMessage({
          type: MESSAGE_TYPES.ACK,
          data: { originalSeq: data.seq, scriptVersion: data.scriptVersion }
        })
      })
    )
    
    // Handle SET_PARAMS from laptop
    cleanupFunctions.push(
      teleprompterClient.onMessage(MESSAGE_TYPES.SET_PARAMS, (data) => {
        console.log('⚙️ Received SET_PARAMS')
        scrollEngine.updateParams(data)
        teleprompterClient.sendMessage({
          type: MESSAGE_TYPES.ACK,
          data: { originalSeq: data.seq, scriptVersion: data.scriptVersion }
        })
      })
    )
    
    // Handle PLAY command
    cleanupFunctions.push(
      teleprompterClient.onMessage(MESSAGE_TYPES.PLAY, (data) => {
        console.log('▶️ Received PLAY')
        scrollEngine.play(data.t0)
        teleprompterClient.sendMessage({
          type: MESSAGE_TYPES.ACK,
          data: { originalSeq: data.seq, scriptVersion: data.scriptVersion }
        })
      })
    )
    
    // Handle PAUSE command
    cleanupFunctions.push(
      teleprompterClient.onMessage(MESSAGE_TYPES.PAUSE, (data) => {
        console.log('⏸️ Received PAUSE')
        scrollEngine.pause()
        teleprompterClient.sendMessage({
          type: MESSAGE_TYPES.ACK,
          data: { originalSeq: data.seq, scriptVersion: data.scriptVersion }
        })
      })
    )
    
    // Handle SEEK commands
    cleanupFunctions.push(
      teleprompterClient.onMessage(MESSAGE_TYPES.SEEK_ABS, (data) => {
        console.log('🎯 Received SEEK_ABS:', data.lineIndex)
        scrollEngine.seekAbsolute(data.lineIndex)
        teleprompterClient.sendMessage({
          type: MESSAGE_TYPES.ACK,
          data: { originalSeq: data.seq, scriptVersion: data.scriptVersion }
        })
      })
    )
    
    cleanupFunctions.push(
      teleprompterClient.onMessage(MESSAGE_TYPES.SEEK_REL, (data) => {
        console.log('↕️ Received SEEK_REL:', data.deltaLines)
        scrollEngine.seekRelative(data.deltaLines)
        teleprompterClient.sendMessage({
          type: MESSAGE_TYPES.ACK,
          data: { originalSeq: data.seq, scriptVersion: data.scriptVersion }
        })
      })
    )
    
    // Handle JUMP commands
    cleanupFunctions.push(
      teleprompterClient.onMessage(MESSAGE_TYPES.JUMP_TOP, (data) => {
        console.log('⬆️ Received JUMP_TOP')
        scrollEngine.jumpTop()
        teleprompterClient.sendMessage({
          type: MESSAGE_TYPES.ACK,
          data: { originalSeq: data.seq, scriptVersion: data.scriptVersion }
        })
      })
    )
    
    cleanupFunctions.push(
      teleprompterClient.onMessage(MESSAGE_TYPES.JUMP_END, (data) => {
        console.log('⬇️ Received JUMP_END')
        scrollEngine.jumpEnd()
        teleprompterClient.sendMessage({
          type: MESSAGE_TYPES.ACK,
          data: { originalSeq: data.seq, scriptVersion: data.scriptVersion }
        })
      })
    )
    
    // Handle keyframe requests
    cleanupFunctions.push(
      teleprompterClient.onMessage(MESSAGE_TYPES.REQUEST_KF, (data) => {
        console.log('📡 Keyframe requested')
        scrollEngine.sendKeyframe('REQUESTED')
      })
    )
    
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [teleprompterClient, scrollEngine])

  // Handle user interaction for iOS Safari
  const handleUserInteraction = () => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true)
      console.log('👆 User interaction detected')
    }
  }

  // Handle manual touch scrolling
  const handleTouchScroll = (deltaY) => {
    if (scrollEngine.engineState === STATES.PLAYING) {
      const currentPos = scrollEngine.getCurrentPosition()
      const newScrollY = Math.max(0, currentPos.scrollY + deltaY)
      scrollEngine.handleManualScroll(newScrollY)
    }
  }

  // Touch event handlers
  const [touchState, setTouchState] = useState({ startY: 0, lastY: 0, isDragging: false })

  const handleTouchStart = (e) => {
    handleUserInteraction()
    const touch = e.touches[0]
    setTouchState({
      startY: touch.clientY,
      lastY: touch.clientY,
      isDragging: true
    })
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    if (!touchState.isDragging) return

    const touch = e.touches[0]
    const deltaY = touchState.lastY - touch.clientY
    
    if (Math.abs(deltaY) > 2) { // Threshold to avoid jitter
      handleTouchScroll(deltaY * 2) // Amplify for better control
      setTouchState(prev => ({ ...prev, lastY: touch.clientY }))
    }
  }

  const handleTouchEnd = () => {
    setTouchState(prev => ({ ...prev, isDragging: false }))
  }

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
            <h1 className="text-white font-medium">📺 iPad Ausspielung v2.0</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`text-xs px-2 py-1 rounded font-medium ${
              scrollEngine.engineState === STATES.PLAYING ? 'bg-green-600' :
              scrollEngine.engineState === STATES.PAUSED ? 'bg-yellow-600' :
              scrollEngine.engineState === STATES.READY ? 'bg-blue-600' :
              'bg-gray-600'
            } text-white`}>
              {scrollEngine.engineState === STATES.PLAYING ? '▶️ Playing' :
               scrollEngine.engineState === STATES.PAUSED ? '⏸️ Paused' :
               scrollEngine.engineState === STATES.READY ? '🔄 Ready' :
               scrollEngine.engineState === STATES.LOADED ? '📄 Loaded' :
               '⭕ Idle'}
            </div>
            
            <div className={`text-xs px-2 py-1 rounded font-medium ${
              teleprompterClient.connectionStatus === 'connected' 
                ? 'bg-green-600 text-white' 
                : teleprompterClient.connectionStatus === 'connecting'
                ? 'bg-yellow-600 text-white'
                : 'bg-red-600 text-white'
            }`}>
              {teleprompterClient.connectionStatus === 'connected' ? '🟢 Connected' :
               teleprompterClient.connectionStatus === 'connecting' ? '🟡 Connecting...' : '🔴 Disconnected'}
            </div>
            
            <div className="text-sm text-gray-400">
              Line: {scrollEngine.getCurrentPosition().lineIndex} | FPS: {scrollEngine.performanceMetrics.fps}
            </div>
            
            <button
              onClick={toggleFullscreen}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-colors"
            >
              {isFullscreen ? '🔲 Exit Fullscreen' : '⛶ Fullscreen'}
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

      {/* Main teleprompter display - iPad Authoritative */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden bg-black relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleUserInteraction}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        {/* Performance and State Display */}
        <div style={{
          position: 'absolute',
          top: isFullscreen ? '8px' : '20px',
          right: isFullscreen ? '8px' : '20px',
          backgroundColor: isFullscreen ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.8)',
          color: isFullscreen ? 'rgba(255, 255, 255, 0.8)' : 'white',
          padding: isFullscreen ? '8px 12px' : '12px 16px',
          borderRadius: '8px',
          fontSize: isFullscreen ? '14px' : '16px',
          fontWeight: 'bold',
          zIndex: 20,
          border: isFullscreen ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.3)',
          opacity: isFullscreen ? 0.8 : 1,
          transition: 'all 0.3s ease',
          fontFamily: 'monospace'
        }}>
          <div>Speed: {scrollEngine.currentParams.speed}/min</div>
          <div>Line: {scrollEngine.getCurrentPosition().lineIndex}/{scrollEngine.lines.length}</div>
          <div>FPS: {scrollEngine.performanceMetrics.fps}</div>
          {teleprompterClient.rtt > 0 && <div>RTT: {teleprompterClient.rtt.toFixed(0)}ms</div>}
        </div>
        
        {/* Touch interaction hint */}
        {!hasUserInteracted && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '20px 30px',
            borderRadius: '12px',
            fontSize: '18px',
            textAlign: 'center',
            zIndex: 30,
            animation: 'pulse 2s infinite'
          }}>
            👆 Touch screen to activate controls
          </div>
        )}
        
        <div className="h-full flex items-start justify-center overflow-hidden">
          <div style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: `${scrollEngine.currentParams.fontSize}px`,
            lineHeight: scrollEngine.currentParams.lineHeight,
            color: 'white',
            paddingLeft: `${scrollEngine.currentParams.margins}px`,
            paddingRight: `${scrollEngine.currentParams.margins}px`,
            paddingTop: '40px',
            paddingBottom: '40px',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            // Authoritative transform - only source of truth
            transform: `translate3d(0, ${-scrollEngine.getCurrentPosition().scrollY}px, 0) 
                       scaleX(${scrollEngine.currentParams.mirror?.horizontal ? -1 : 1}) 
                       scaleY(${scrollEngine.currentParams.mirror?.vertical ? -1 : 1})`,
            // Hardware acceleration for 60fps
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            perspective: '1000px',
            transition: 'none', // No transitions - pure rAF control
            width: '90vw',
            maxWidth: '1000px',
            textAlign: 'left',
            // Font rendering optimization
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            // Performance containment
            contain: 'layout style paint'
          }}>
            {scrollEngine.lines.map((line, index) => (
              <div 
                key={index} 
                style={{ 
                  minHeight: `${scrollEngine.currentParams.fontSize * scrollEngine.currentParams.lineHeight}px`,
                  display: 'flex',
                  alignItems: 'center'
                }}
                dangerouslySetInnerHTML={{ __html: line.text || '&nbsp;' }} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Touch controls for mobile */}
      {!isFullscreen && hasUserInteracted && (
        <div className="bg-gray-900 px-4 py-3 flex justify-center gap-4">
          <button
            onTouchStart={() => scrollEngine.seekRelative(-5)}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded text-white text-lg"
          >
            ⏮️ -5
          </button>
          <button
            onTouchStart={() => scrollEngine.seekRelative(-1)}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded text-white text-lg"
          >
            ⬆️ -1
          </button>
          <button
            onTouchStart={() => 
              scrollEngine.engineState === STATES.PLAYING ? 
                scrollEngine.pause() : 
                scrollEngine.play()
            }
            className={`px-6 py-3 rounded text-white text-lg ${
              scrollEngine.engineState === STATES.PLAYING ? 
                'bg-red-600 hover:bg-red-700' : 
                'bg-green-600 hover:bg-green-700'
            }`}
          >
            {scrollEngine.engineState === STATES.PLAYING ? '⏸️' : '▶️'}
          </button>
          <button
            onTouchStart={() => scrollEngine.seekRelative(1)}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded text-white text-lg"
          >
            ⬇️ +1
          </button>
          <button
            onTouchStart={() => scrollEngine.seekRelative(5)}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded text-white text-lg"
          >
            ⏭️ +5
          </button>
        </div>
      )}
    </div>
  )
}

// Direct export - no wrapper needed, client is self-contained
const AusspielungPage = AusspielungPageInternal

export default AusspielungPage
