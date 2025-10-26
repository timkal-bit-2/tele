import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTeleprompterClient } from '../hooks/useTeleprompterClient.js'
import { useIpadScrollEngine } from '../hooks/useIpadScrollEngine.js'
import { MESSAGE_TYPES, STATES } from '../types/teleprompterProtocol.js'
import { calculateTextHash } from '../utils/lineCalculator.js'
import P2PConnection from './P2PConnection'
import MetaShell from './MetaShell'

const AusspielungPageInternal = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [showP2PPanel, setShowP2PPanel] = useState(false)
  const [isP2PConnected, setIsP2PConnected] = useState(false)
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

  // P2P Connection Handlers
  const handleP2PConnectionEstablished = (connection) => {
    console.log('✅ iPad P2P Connection established!')
    setIsP2PConnected(true)
  }
  
  const handleP2PConnectionLost = () => {
    console.log('❌ iPad P2P Connection lost')
    setIsP2PConnected(false)
  }
  
  const handleP2PMessage = (message) => {
    console.log('📥 iPad received P2P message:', message)
    
    // Handle different message types
    if (message.type === 'CONTENT_UPDATE' && message.data) {
      const { content, settings } = message.data
      
      if (content) {
        const hash = calculateTextHash(content)
        const version = Date.now()
        scrollEngine.loadScript(content, version, hash)
      }
      
      if (settings) {
        scrollEngine.updateParams({
          speed: (settings.speed || 0.2) * 300,
          fontSize: settings.fontSize || 48,
          lineHeight: settings.lineHeight || 1.4,
          mirror: {
            horizontal: settings.mirrorHorizontal || false,
            vertical: settings.mirrorVertical || false
          },
          margins: settings.padding || 20
        })
      }
    }
    
    if (message.type === 'SCROLL_POSITION' && message.data) {
      // Sync scroll position from laptop
      const { scrollPosition } = message.data
      if (scrollPosition !== undefined) {
        // Could implement remote scroll control here
        console.log('Remote scroll position:', scrollPosition)
      }
    }
  }

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

  // No additional scroll handling needed - iPad scroll engine handles everything

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

  // Content is managed by iPad scroll engine - no additional processing needed

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
              onClick={() => setShowP2PPanel(!showP2PPanel)}
              className={`px-3 py-2 rounded text-white text-sm transition-colors ${
                isP2PConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-500'
              }`}
            >
              {isP2PConnected ? '🔗 P2P Connected' : '🔗 Connect to Laptop'}
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-colors"
              data-fullscreen-toggle
            >
              {isFullscreen ? '🔲 Exit Fullscreen' : '⛶ Fullscreen'}
            </button>
          </div>
        </div>
      )}
      
      {/* P2P Connection Panel - shows when requested */}
      {showP2PPanel && !isFullscreen && (
        <div className="absolute top-16 right-4 z-40 w-96 max-w-full">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <h3 className="text-sm font-bold text-white">Direct Connection to Laptop</h3>
              <button
                onClick={() => setShowP2PPanel(false)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-3">
              <P2PConnection
                mode="client"
                onConnectionEstablished={handleP2PConnectionEstablished}
                onConnectionLost={handleP2PConnectionLost}
                onMessage={handleP2PMessage}
              />
            </div>
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

// Meta Shell Wrapper - Progressive Enhancement Layer
const AusspielungPage = () => {
  const [isFullscreenInternal, setIsFullscreenInternal] = useState(false)
  const innerPageRef = useRef(null)

  // Extract state from inner component for context panel
  // This is a bridge layer - non-invasive
  
  const navigationItems = [
    {
      icon: '🏠',
      label: 'Home',
      onClick: () => window.location.href = '/',
      position: 'top'
    },
    {
      icon: '🎛️',
      label: 'Regie',
      onClick: () => window.location.href = '/regie',
      position: 'top'
    },
    {
      icon: '⛶',
      label: isFullscreenInternal ? 'Exit Fullscreen' : 'Fullscreen',
      onClick: () => {
        // Will be handled by inner component
        const fullscreenBtn = document.querySelector('[data-fullscreen-toggle]')
        if (fullscreenBtn) fullscreenBtn.click()
      },
      position: 'bottom'
    }
  ]

  const contextSections = [
    {
      title: 'Status',
      content: (
        <div className="meta-context-section__content">
          <div className="meta-status meta-status--info">
            <span className="meta-status__indicator"></span>
            <span>Teleprompter Active</span>
          </div>
        </div>
      )
    },
    {
      title: 'Quick Info',
      content: (
        <div className="meta-context-section__content">
          <div className="meta-metric">
            <span className="meta-metric__label">Device</span>
            <span className="meta-metric__value">iPad</span>
          </div>
          <div className="meta-metric">
            <span className="meta-metric__label">Mode</span>
            <span className="meta-metric__value">Display</span>
          </div>
        </div>
      )
    },
    {
      title: 'Help',
      content: (
        <div className="meta-context-section__content">
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
            Touch the screen to activate controls. Use buttons at bottom to control playback.
          </p>
        </div>
      )
    }
  ]

  // Listen for fullscreen changes from inner component
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenInternal(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <MetaShell
      navigationItems={navigationItems}
      contextSections={contextSections}
      isFullscreen={isFullscreenInternal}
    >
      {/* Existing app mounts here - completely untouched */}
      <div ref={innerPageRef} style={{ width: '100%', height: '100%' }}>
        <AusspielungPageInternal />
      </div>
    </MetaShell>
  )
}

export default AusspielungPage
