import React, { useState, useRef, useEffect } from 'react'

const SimpleTeleprompter = () => {
  // Basis State
  const [text, setText] = useState('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.\n\nEaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.\n\nNemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores.\n\nEos qui ratione voluptatem sequi nesciunt neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.\n\nConsectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam.\n\nAliquam quaerat voluptatem ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit.\n\nLaboriosam, nisi ut aliquid ex ea commodi consequatur quis autem vel eum iure reprehenderit qui in ea.\n\nVoluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla.\n\nPariatur at vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum.\n\nDeleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.\n\nSimilique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.\n\nEt harum quidem rerum facilis est et expedita distinctio nam libero tempore cum soluta nobis est.\n\nEligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus omnis voluptas.\n\nAssumenda est, omnis dolor repellendus temporibus autem quibusdam et aut officiis debitis aut rerum.\n\nNecessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae itaque earum.\n\nRerum hic tenetur a sapiente delectus ut aut reiciendis voluptatibus maiores alias consequatur aut.\n\nPerferendis doloribus asperiores repellat nam cum soluta nobis est eligendi optio cumque nihil impedit.\n\nQuo minus id quod maxime placeat facere possimus omnis voluptas assumenda est omnis dolor repellendus.\n\nTemporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut voluptates.\n\nRepudiandae sint et molestiae non recusandae itaque earum rerum hic tenetur a sapiente delectus.\n\nUt aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat. 🎉')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [debugLogs, setDebugLogs] = useState([])
  
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
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://tele-bs9i.onrender.com/ws'
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
    sendMessage('SIMPLE_PLAYBACK_STATE', { isPlaying, speed })
  }, [isPlaying, speed])

  // Auto-Scroll wenn Playing
  useEffect(() => {
    if (isPlaying) {
      const scroll = () => {
        setScrollPosition(prev => {
          const newPos = prev + speed * 0.1
          if (teleprompterRef.current) {
            teleprompterRef.current.scrollTop = newPos
          }
          return newPos
        })
        animationRef.current = requestAnimationFrame(scroll)
      }
      animationRef.current = requestAnimationFrame(scroll)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, speed])

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
      {/* Links: Editor */}
      <div className="w-1/2 border-r border-gray-700 flex flex-col">
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

      {/* Rechts: Teleprompter */}
      <div className="w-1/2 flex flex-col">
        {/* Controls */}
        <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-2 rounded font-bold ${
              isPlaying 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          
          <div className="flex items-center gap-2">
            <label className="text-sm">Speed:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm w-8">{speed}</span>
          </div>

          <div className="text-sm text-gray-400">
            Pos: {Math.round(scrollPosition)}px
          </div>
        </div>

        {/* Teleprompter Display */}
        <div 
          ref={teleprompterRef}
          className="flex-1 bg-black p-8 overflow-hidden relative cursor-pointer"
          onWheel={handleWheel}
        >
          <div 
            className="text-2xl leading-relaxed"
            style={{
              lineHeight: '1.8',
              fontSize: '28px'
            }}
          >
            {text.split('\n').map((line, index) => (
              <div key={index} className="mb-2">
                {line || '\u00A0'}
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
