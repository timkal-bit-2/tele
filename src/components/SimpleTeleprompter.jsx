import React, { useState, useRef, useEffect } from 'react'

const SimpleTeleprompter = () => {
  // Basis State
  const [text, setText] = useState('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.\n\nEaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.\n\nNemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores.\n\nEos qui ratione voluptatem sequi nesciunt neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.\n\nConsectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam.\n\nAliquam quaerat voluptatem ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit.\n\nLaboriosam, nisi ut aliquid ex ea commodi consequatur quis autem vel eum iure reprehenderit qui in ea.\n\nVoluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla.\n\nPariatur at vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum.\n\nDeleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.\n\nSimilique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.\n\nEt harum quidem rerum facilis est et expedita distinctio nam libero tempore cum soluta nobis est.\n\nEligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus omnis voluptas.\n\nAssumenda est, omnis dolor repellendus temporibus autem quibusdam et aut officiis debitis aut rerum.\n\nNecessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae itaque earum.\n\nRerum hic tenetur a sapiente delectus ut aut reiciendis voluptatibus maiores alias consequatur aut.\n\nPerferendis doloribus asperiores repellat nam cum soluta nobis est eligendi optio cumque nihil impedit.\n\nQuo minus id quod maxime placeat facere possimus omnis voluptas assumenda est omnis dolor repellendus.\n\nTemporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut voluptates.\n\nRepudiandae sint et molestiae non recusandae itaque earum rerum hic tenetur a sapiente delectus.\n\nUt aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat. 🎉')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(3)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [debugLogs, setDebugLogs] = useState([])
  
  // Layout-Einstellungen
  const [fontSize, setFontSize] = useState(40)
  const [margin, setMargin] = useState(20)
  
  // Spiegelungsoptionen
  const [flipHorizontal, setFlipHorizontal] = useState(false)
  const [flipVertical, setFlipVertical] = useState(false)
  
  // iPad Position Tracking
  const [ipadPosition, setIpadPosition] = useState({ percentage: 0, lastUpdate: 0 })
  
  // Display Format
  const [displayFormat, setDisplayFormat] = useState('16:9') // '16:9' oder '4:3'
  
  // Debug Console Toggle
  const [showDebugConsole, setShowDebugConsole] = useState(false)
  
  const teleprompterRef = useRef(null)
  const animationRef = useRef(null)
  const wsRef = useRef(null)

  // Debug helper
  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs(prev => [...prev.slice(-4), `${timestamp}: ${message}`])
  }

  // WebSocket Verbindung
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3002/ws'
    console.log('🔌 Simple Regie: Connecting to WebSocket:', wsUrl)
    
    wsRef.current = new WebSocket(wsUrl)
    
    wsRef.current.onopen = () => {
      console.log('✅ Simple Regie: WebSocket connected!')
      addDebugLog('✅ WebSocket connected!')
      setConnectionStatus('connected')
    }

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'SIMPLE_POSITION_FEEDBACK') {
          const percentage = data.scrollPercentage || 0
          setIpadPosition({ 
            percentage: percentage, 
            lastUpdate: Date.now() 
          })
          
          // Synchronisiere Regie-Preview mit iPad-Position (nur wenn pausiert)
          if (!isPlaying && teleprompterRef.current) {
            const element = teleprompterRef.current
            const maxScroll = element.scrollHeight - element.clientHeight
            const targetPosition = percentage * maxScroll
            
            element.scrollTop = targetPosition
            addDebugLog(`🔄 Synced to iPad: ${(percentage * 100).toFixed(1)}%`)
          } else {
            addDebugLog(`📍 iPad at: ${(percentage * 100).toFixed(1)}%`)
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }
    
    wsRef.current.onclose = () => {
      console.log('🔌 Simple Regie: WebSocket disconnected')
      addDebugLog('🔌 WebSocket disconnected')
      setConnectionStatus('disconnected')
    }
    
    wsRef.current.onerror = (error) => {
      console.error('❌ Simple Regie: WebSocket error:', error)
      addDebugLog('❌ WebSocket error')
      setConnectionStatus('error')
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Send message via WebSocket
  const sendMessage = (type, data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = { type, ...data }
      wsRef.current.send(JSON.stringify(message))
      console.log('📤 Simple Regie sent:', type, data)
      addDebugLog(`📤 Sent: ${type}`)
    } else {
      addDebugLog(`❌ Can't send ${type} - WebSocket not open`)
    }
  }

  // Send text updates
  useEffect(() => {
    console.log('🔄 Text changed, sending update. Length:', text.length)
    addDebugLog(`🔄 Text changed (${text.length} chars)`)
    sendMessage('SIMPLE_TEXT_UPDATE', { text })
  }, [text])

  // Send playback state updates
  useEffect(() => {
    addDebugLog(`🎮 Sending playback: ${isPlaying ? 'PLAY' : 'PAUSE'} Speed: ${speed}`)
    
    // Bei Play-Start: aktuelle Position übertragen
    if (isPlaying && teleprompterRef.current) {
      const currentPos = teleprompterRef.current.scrollTop
      sendMessage('SIMPLE_PLAYBACK_STATE', { 
        isPlaying, 
        speed, 
        startPosition: currentPos // Position für nahtlosen Übergang
      })
      addDebugLog(`🚀 Play from position: ${Math.round(currentPos)}px`)
    } else {
      sendMessage('SIMPLE_PLAYBACK_STATE', { isPlaying, speed })
    }
  }, [isPlaying, speed])

  // Manual scroll position sync when paused (inkl. Layout-Einstellungen)
  useEffect(() => {
    let positionSyncTimer = null
    
    if (!isPlaying) {
      // Send position and layout every 200ms when paused for smooth following
      positionSyncTimer = setInterval(() => {
        if (teleprompterRef.current) {
          const currentPos = teleprompterRef.current.scrollTop
          sendMessage('SIMPLE_MANUAL_POSITION', { 
            scrollPosition: currentPos,
            fontSize,
            margin,
            flipHorizontal,
            flipVertical,
            displayFormat
          })
          addDebugLog(`📍 Manual pos: ${Math.round(currentPos)}px, Font: ${fontSize}, Margin: ${margin}, H: ${flipHorizontal}, V: ${flipVertical}`)
        }
      }, 200)
    }

    return () => {
      if (positionSyncTimer) {
        clearInterval(positionSyncTimer)
      }
    }
  }, [isPlaying, fontSize, margin, flipHorizontal, flipVertical, displayFormat])

  // Berechne Scroll-Rate für Regie-Preview (identisch zum iPad)
  const calculateScrollRate = () => {
    if (!teleprompterRef.current || !text) return 0
    
    const element = teleprompterRef.current
    const maxScroll = element.scrollHeight - element.clientHeight
    const textLength = text.length
    
    if (maxScroll <= 0 || textLength <= 0) return 0
    
    // Speed = Scale-Factor * 100 = tatsächliche CPM
    const charsPerMinute = speed * 100 // Speed 3 = 300 cpm
    const totalSeconds = textLength / charsPerMinute * 60 // Zeit in Sekunden für ganzen Text
    const pixelsPerSecond = maxScroll / totalSeconds
    const pixelsPerTick = pixelsPerSecond / 60 // 60fps
    
    return pixelsPerTick
  }

  // Regie-Preview Scroll (synchron zum iPad)
  useEffect(() => {
    if (isPlaying && teleprompterRef.current) {
      const scrollRate = calculateScrollRate()
      const totalDuration = text.length / (speed * 100) * 60 // Sekunden
      
      addDebugLog(`👁️ Preview scroll: ${scrollRate.toFixed(2)}px/tick, ${totalDuration.toFixed(1)}s total`)
      
      const scroll = () => {
        setScrollPosition(prev => {
          const newPos = prev + scrollRate
          if (teleprompterRef.current) {
            const element = teleprompterRef.current
            const maxScroll = element.scrollHeight - element.clientHeight
            
            // Scroll nur wenn wir noch nicht am Ende sind
            if (newPos < maxScroll) {
              element.scrollTop = newPos
            }
          }
          return newPos
        })
        animationRef.current = requestAnimationFrame(scroll)
      }
      animationRef.current = requestAnimationFrame(scroll)
    } else {
      addDebugLog('👁️ Preview scroll stopped')
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, speed, text])

  // Manueller Scroll
  const handleWheel = (e) => {
    if (!isPlaying) {
      e.preventDefault()
      const newPos = scrollPosition + e.deltaY
      setScrollPosition(Math.max(0, newPos))
      if (teleprompterRef.current) {
        teleprompterRef.current.scrollTop = newPos
      }
    }
  }

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-600'
      case 'disconnected': return 'bg-red-600' 
      case 'error': return 'bg-orange-600'
      default: return 'bg-gray-600'
    }
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex">
      {/* Links: Editor - Max 30% */}
      <div className="w-[30%] min-w-[300px] border-r border-gray-700 flex flex-col">
        <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Teleprompter-Regie</h2>
          <div className={`px-3 py-1 rounded text-xs ${getConnectionColor()}`}>
            WebSocket: {connectionStatus.toUpperCase()}
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 p-4 bg-gray-800 text-white resize-none outline-none"
          placeholder="Hier Text eingeben..."
        />
      </div>

      {/* Rechts: Preview + Controls - Rest 70% */}
      <div className="flex-1 flex flex-col">
        {/* Teleprompter Display - Dynamic Format - OBEN - max 50% Höhe */}
        <div className="flex items-center justify-center bg-gray-800 p-4" style={{ maxHeight: '50vh' }}>
          <div 
            ref={teleprompterRef}
            className="bg-black overflow-hidden relative cursor-pointer border-2 border-gray-600 rounded-lg shadow-2xl"
            onWheel={handleWheel}
            style={{
              aspectRatio: displayFormat, // Dynamic: 16/9 oder 4/3
              padding: `${margin}px`,
              // Responsive scaling - strikt auf 50vh begrenzt
              width: 'auto',
              height: displayFormat === '16:9' 
                ? 'min(calc(70vw * 9 / 16), 45vh)' // 45vh statt 50vh für Padding
                : 'min(calc(70vw * 3 / 4), 45vh)',  // 4:3 ist höher, gleiche Begrenzung
              maxHeight: '45vh', // Absolute Grenze für beide Formate
              maxWidth: '100%'
            }}
          >
          <div 
            className="leading-relaxed"
            style={{
              lineHeight: '1.8',
              fontSize: `${fontSize}px`
            }}
          >
            {/* 5 Leerzeilen vor dem Text */}
            {Array(5).fill(null).map((_, index) => (
              <div key={`before-${index}`} className="mb-2">
                &nbsp;
              </div>
            ))}
            
            {/* Haupttext */}
            {text.split('\n').map((line, index) => (
              <div key={index} className="mb-2">
                {line || '\u00A0'}
              </div>
            ))}
            
            {/* 5 Leerzeilen nach dem Text */}
            {Array(5).fill(null).map((_, index) => (
              <div key={`after-${index}`} className="mb-2">
                &nbsp;
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Controls UNTEN - unter Preview - Rest der Höhe */}
        <div className="flex-1 bg-gray-800 border-t border-gray-700 p-6 space-y-4 overflow-y-auto">
          {/* Play Button - groß und zentriert */}
          <div className="flex justify-center">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-8 py-4 rounded-lg font-bold text-xl transition-all duration-200 shadow-lg ${
                isPlaying 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isPlaying ? '⏸️ PAUSE' : '▶️ PLAY'}
            </button>
          </div>

          {/* Speed Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300">Speed ({speed})</label>
              <span className="text-xs text-gray-400">1 ────────── 20</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Font Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300">Font ({fontSize}px)</label>
              <span className="text-xs text-gray-400">20 ──────── 100</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              disabled={isPlaying}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50"
            />
          </div>

          {/* Margin Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300">Margin ({margin}px)</label>
              <span className="text-xs text-gray-400">0 ────── 200</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="10"
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              disabled={isPlaying}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50"
            />
          </div>

          {/* Toggles Row */}
          <div className="flex items-center justify-between pt-2">
            {/* Format Toggle */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">📐</span>
              <button
                onClick={() => setDisplayFormat('16:9')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  displayFormat === '16:9' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                16:9
              </button>
              <button
                onClick={() => setDisplayFormat('4:3')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  displayFormat === '4:3' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                4:3
              </button>
            </div>

            {/* Flip Toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFlipHorizontal(!flipHorizontal)}
                disabled={isPlaying}
                className={`px-3 py-1 rounded text-xs font-medium transition-all disabled:opacity-50 ${
                  flipHorizontal 
                    ? 'bg-orange-600 text-white shadow-md' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                ↔️
              </button>
              <button
                onClick={() => setFlipVertical(!flipVertical)}
                disabled={isPlaying}
                className={`px-3 py-1 rounded text-xs font-medium transition-all disabled:opacity-50 ${
                  flipVertical 
                    ? 'bg-orange-600 text-white shadow-md' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                ↕️
              </button>
            </div>

            {/* iPad Position */}
            <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-1">
              <span className="text-xs text-gray-400">📺</span>
              <span className="text-sm font-bold text-blue-400">
                {(ipadPosition.percentage * 100).toFixed(1)}%
              </span>
              <span className="text-xs">
                {Date.now() - ipadPosition.lastUpdate < 5000 ? '🟢' : '🔴'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Console Toggle Button - unten rechts */}
      <button
        onClick={() => setShowDebugConsole(!showDebugConsole)}
        className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300 transition-all shadow-lg"
      >
        🔧 Debug {showDebugConsole ? '▼' : '▲'}
      </button>

      {/* Debug Console */}
      {showDebugConsole && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-600 p-2 h-20 overflow-y-auto transition-all duration-300">
          <div className="text-xs text-green-400 font-mono">
            <div className="font-bold mb-1">🔧 Regie Debug Console:</div>
            {debugLogs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SimpleTeleprompter
