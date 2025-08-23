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
  const [fontSize, setFontSize] = useState(28)
  const [margin, setMargin] = useState(20)
  
  // Spiegelungsoptionen
  const [flipHorizontal, setFlipHorizontal] = useState(false)
  const [flipVertical, setFlipVertical] = useState(false)
  
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
            flipVertical
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
  }, [isPlaying, fontSize, margin, flipHorizontal, flipVertical])

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
          <h2 className="text-lg font-bold">📝 Simple Regie</h2>
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

      {/* Rechts: Teleprompter - Rest 70% */}
      <div className="flex-1 flex flex-col">
        {/* Controls */}
        <div className="bg-gray-800 p-4 border-b border-gray-700 flex flex-col gap-3">
          {/* Play/Pause Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-6 py-3 rounded-lg font-bold text-lg ${
                isPlaying 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
          </div>
          
          {/* Speed, Font, Margin Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm">Speed:</label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm w-8">{speed}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm">Font:</label>
              <input
                type="range"
                min="16"
                max="48"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-20"
                disabled={isPlaying}
              />
              <span className="text-sm w-8">{fontSize}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm">Margin:</label>
              <input
                type="range"
                min="0"
                max="200"
                step="10"
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-20"
                disabled={isPlaying}
              />
              <span className="text-sm w-8">{margin}</span>
            </div>
          </div>
          
          {/* Flip Controls */}
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="flipH"
                checked={flipHorizontal}
                onChange={(e) => setFlipHorizontal(e.target.checked)}
                disabled={isPlaying}
                className="w-4 h-4"
              />
              <label htmlFor="flipH" className="text-sm">↔️ Horizontal flip</label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="flipV"
                checked={flipVertical}
                onChange={(e) => setFlipVertical(e.target.checked)}
                disabled={isPlaying}
                className="w-4 h-4"
              />
              <label htmlFor="flipV" className="text-sm">↕️ Vertical flip</label>
            </div>
          </div>


        </div>

        {/* Teleprompter Display */}
        <div 
          ref={teleprompterRef}
          className="flex-1 bg-black overflow-hidden relative cursor-pointer"
          onWheel={handleWheel}
          style={{
            padding: `${margin}px`
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

      {/* Debug Console */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-600 p-2 h-20 overflow-y-auto">
        <div className="text-xs text-green-400 font-mono">
          <div className="font-bold mb-1">🔧 Regie Debug Console:</div>
          {debugLogs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SimpleTeleprompter
