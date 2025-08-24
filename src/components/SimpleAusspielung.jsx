import React, { useState, useRef, useEffect } from 'react'
import TeleprompterDisplay from './TeleprompterDisplay'

const SimpleAusspielung = () => {
  // State
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
  
  // Vollbild-Modus
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false)
  
  // Position-Feedback für Regie
  const [lastSentPercentage, setLastSentPercentage] = useState(0)
  
  // Display Format - nur iPad Pro in 4:3
  const [displayFormat, setDisplayFormat] = useState('ipad11')
  const [aspectRatio, setAspectRatio] = useState('4/3')
  
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
    console.log('🔌 Simple Ausspielung: Connecting to WebSocket:', wsUrl)
    
    wsRef.current = new WebSocket(wsUrl)
    
    wsRef.current.onopen = () => {
      console.log('✅ Simple Ausspielung: WebSocket connected!')
      addDebugLog('✅ WebSocket connected!')
      setConnectionStatus('connected')
    }
    
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📨 Simple Ausspielung received:', data.type, data)
        addDebugLog(`📨 Received: ${data.type}`)
        
        if (data.type === 'SIMPLE_TEXT_UPDATE') {
          console.log('🎯 Setting new text. Length:', data.text.length)
          addDebugLog(`🎯 Setting text (${data.text.length} chars)`)
          setText(data.text)
          
          // Check dimensions nach Text-Update
          setTimeout(() => {
            if (teleprompterRef.current) {
              const element = teleprompterRef.current
              addDebugLog(`📐 New dimensions: ${element.scrollHeight}px total, ${element.clientHeight}px visible`)
            }
          }, 100) // Kurz warten damit React re-render fertig ist
        }
        
        if (data.type === 'SIMPLE_PLAYBACK_STATE') {
          addDebugLog(`🎮 Playback: ${data.isPlaying ? 'PLAY' : 'PAUSE'} Speed: ${data.speed}`)
          setIsPlaying(data.isPlaying)
          setSpeed(data.speed)
          
          // Bei Play-Start: Position von Regie übernehmen
          if (data.isPlaying && data.startPosition !== undefined) {
            addDebugLog(`📍 Starting from position: ${Math.round(data.startPosition)}px`)
            setScrollPosition(data.startPosition)
            if (teleprompterRef.current) {
              teleprompterRef.current.scrollTop = data.startPosition
            }
          }
        }

        if (data.type === 'SIMPLE_MANUAL_POSITION') {
          // Nur bei PAUSE: Position und Layout von Regie folgen
          if (!isPlaying) {
            addDebugLog(`📍 Following manual pos: ${Math.round(data.scrollPosition)}px`)
            setScrollPosition(data.scrollPosition)
            if (teleprompterRef.current) {
              teleprompterRef.current.scrollTop = data.scrollPosition
            }
            
            // Layout-Einstellungen übernehmen wenn vorhanden
            if (data.fontSize !== undefined) {
              setFontSize(data.fontSize)
              addDebugLog(`🔤 Font size: ${data.fontSize}px`)
            }
            if (data.margin !== undefined) {
              setMargin(data.margin)
              addDebugLog(`📏 Margin: ${data.margin}px`)
            }
            if (data.flipHorizontal !== undefined) {
              setFlipHorizontal(data.flipHorizontal)
              addDebugLog(`↔️ Horizontal flip: ${data.flipHorizontal}`)
            }
            if (data.flipVertical !== undefined) {
              setFlipVertical(data.flipVertical)
              addDebugLog(`↕️ Vertical flip: ${data.flipVertical}`)
            }
            if (data.displayFormat !== undefined) {
              setDisplayFormat(data.displayFormat)
              addDebugLog(`📐 Display format: ${data.displayFormat}`)
            }
            if (data.aspectRatio !== undefined) {
              setAspectRatio(data.aspectRatio)
              addDebugLog(`📱 Aspect ratio: ${data.aspectRatio}`)
              console.log('🔍 Ausspielung received aspectRatio:', data.aspectRatio)
            }
          } else {
            addDebugLog(`⏭️ Ignoring manual pos (playing): ${Math.round(data.scrollPosition)}px`)
          }
        }
        
        if (data.type === 'SIMPLE_SCROLL_POSITION') {
          setScrollPosition(data.scrollPosition)
          if (teleprompterRef.current) {
            teleprompterRef.current.scrollTop = data.scrollPosition
          }
        }
        
      } catch (error) {
        console.error('❌ Simple Ausspielung: WebSocket message error:', error)
        addDebugLog('❌ Message parse error')
      }
    }
    
    wsRef.current.onclose = () => {
      console.log('🔌 Simple Ausspielung: WebSocket disconnected')
      setConnectionStatus('disconnected')
      
      // Auto-reconnect
      setTimeout(() => {
        console.log('🔄 Simple Ausspielung: Auto-reconnecting...')
        // Restart connection
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          wsRef.current = new WebSocket(wsUrl)
        }
      }, 3000)
    }
    
    wsRef.current.onerror = (error) => {
      console.error('❌ Simple Ausspielung: WebSocket error:', error)
      setConnectionStatus('error')
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Berechne Scroll-Rate basierend auf Zeichen-Geschwindigkeit
  const calculateScrollRate = () => {
    if (!teleprompterRef.current || !text) return 0
    
    const element = teleprompterRef.current
    const maxScroll = element.scrollHeight - element.clientHeight
    const textLength = text.length
    
    if (maxScroll <= 0 || textLength <= 0) return 0
    
    // Speed = Scale-Factor * 100 = tatsächliche CPM
    // Wir wollen: textLength Zeichen in (textLength / charsPerMinute) Minuten
    const charsPerMinute = speed * 100 // Speed 3 = 300 cpm
    const totalSeconds = textLength / charsPerMinute * 60 // Zeit in Sekunden für ganzen Text
    const pixelsPerSecond = maxScroll / totalSeconds
    const pixelsPerTick = pixelsPerSecond / 60 // 60fps
    
    return pixelsPerTick
  }

  // Autonomer iPad-Scroll mit Zeichen-basierter Geschwindigkeit
  useEffect(() => {
    let scrollTimer = null
    
    if (isPlaying && teleprompterRef.current) {
      const scrollRate = calculateScrollRate()
      const totalDuration = text.length / (speed * 100) * 60 // Sekunden
      
      addDebugLog(`🚀 Starting scroll: ${scrollRate.toFixed(2)}px/tick, ${totalDuration.toFixed(1)}s total`)
      
      scrollTimer = setInterval(() => {
        setScrollPosition(prev => {
          const newPos = prev + scrollRate
          if (teleprompterRef.current) {
            const element = teleprompterRef.current
            const maxScroll = element.scrollHeight - element.clientHeight
            
            // Debug info alle 60 ticks (1x pro Sekunde)
            if (Math.floor(prev / scrollRate) % 60 === 0) {
              const progress = maxScroll > 0 ? (newPos / maxScroll * 100) : 0
              addDebugLog(`📏 ${Math.round(newPos)}/${Math.round(maxScroll)}px (${progress.toFixed(1)}%)`)
            }
            
            // Scroll nur wenn wir noch nicht am Ende sind
            if (newPos < maxScroll) {
              element.scrollTop = newPos
            } else {
              addDebugLog('📍 Reached end of content')
            }
          }
          return newPos
        })
      }, 16) // ~60fps für flüssiges Scrollen
      
    } else {
      addDebugLog('⏸️ Stopping autonomous scroll')
      if (scrollTimer) {
        clearInterval(scrollTimer)
      }
    }

    return () => {
      if (scrollTimer) {
        clearInterval(scrollTimer)
      }
    }
  }, [isPlaying, speed, text]) // text hinzugefügt für Neuberechnung bei Text-Änderung

  // Position-Feedback an Regie senden (nur wenn pausiert)
  useEffect(() => {
    let feedbackTimer = null

    if (!isPlaying) {
      feedbackTimer = setInterval(() => {
        if (teleprompterRef.current) {
          const element = teleprompterRef.current
          const maxScroll = element.scrollHeight - element.clientHeight
          
          if (maxScroll > 0) {
            const currentPercentage = element.scrollTop / maxScroll
            
            // Nur senden wenn sich Position signifikant geändert hat (>1%)
            if (Math.abs(currentPercentage - lastSentPercentage) > 0.01) {
              sendMessage('SIMPLE_POSITION_FEEDBACK', {
                scrollPercentage: currentPercentage,
                maxScroll: maxScroll,
                currentPosition: element.scrollTop
              })
              
              setLastSentPercentage(currentPercentage)
              addDebugLog(`📤 Position: ${(currentPercentage * 100).toFixed(1)}%`)
            }
          }
        }
      }, 200)
    }

    return () => {
      if (feedbackTimer) {
        clearInterval(feedbackTimer)
      }
    }
  }, [isPlaying, lastSentPercentage])

  // Browser Vollbild API
  const enterFullscreen = async () => {
    try {
      const element = document.documentElement
      
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen()
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen()
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen()
      }
      
      setIsFullscreen(true)
      setIsBrowserFullscreen(true)
      addDebugLog('🔳 Browser Vollbild aktiviert')
    } catch (error) {
      console.error('Fullscreen error:', error)
      // Fallback zu unserem CSS-Vollbild
      setIsFullscreen(true)
      addDebugLog('⚠️ Fallback zu CSS Vollbild')
    }
  }

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen()
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen()
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen()
        }
      }
      
      setIsFullscreen(false)
      setIsBrowserFullscreen(false)
      addDebugLog('❌ Vollbild beendet')
    } catch (error) {
      console.error('Exit fullscreen error:', error)
      setIsFullscreen(false)
      setIsBrowserFullscreen(false)
    }
  }

  // Vollbild Status überwachen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      )
      
      if (!isFullscreen && isBrowserFullscreen) {
        // Browser Vollbild wurde extern beendet (ESC)
        setIsFullscreen(false)
        setIsBrowserFullscreen(false)
        addDebugLog('❌ Vollbild extern beendet')
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [isBrowserFullscreen])

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-600'
      case 'disconnected': return 'bg-red-600' 
      case 'error': return 'bg-orange-600'
      default: return 'bg-gray-600'
    }
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col relative">
      {/* Status Header - versteckt im Vollbild */}
      {!isFullscreen && (
        <div className="bg-gray-900 p-2 flex items-center justify-between border-b border-gray-700">
          <div className="text-sm text-gray-400">
            📺 Simple Ausspielung
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={enterFullscreen}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              🔳 Vollbild
            </button>
            <div className={`px-3 py-1 rounded text-xs ${getConnectionColor()}`}>
              {connectionStatus.toUpperCase()}
            </div>
            <div className="text-xs text-gray-400">
              {isPlaying ? '▶️ PLAYING' : '⏸️ PAUSED'} | Speed: {speed} | Format: {displayFormat} | Ratio: {aspectRatio} | H: {flipHorizontal ? 'ON' : 'OFF'} | V: {flipVertical ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>
      )}

      {/* Vollbild Exit Button - nur im Vollbild sichtbar */}
      {isFullscreen && (
        <button
          onClick={exitFullscreen}
          className="absolute top-4 right-4 z-50 w-8 h-8 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors opacity-70 hover:opacity-100"
        >
          ✕
        </button>
      )}

      {/* Teleprompter Display - Original Size Fullscreen */}
      <div 
        className="flex-1 overflow-hidden relative flex items-center justify-center"
        style={{
          backgroundColor: '#000000'
        }}
      >
        <TeleprompterDisplay
          ref={teleprompterRef}
          text={text}
          fontSize={fontSize}
          margin={margin}
          flipHorizontal={flipHorizontal}
          flipVertical={flipVertical}
        />
      </div>

      {/* Debug Console - versteckt im Vollbild */}
      {!isFullscreen && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-600 p-2 h-20 overflow-y-auto">
          <div className="text-xs text-blue-400 font-mono">
            <div className="font-bold mb-1">🔧 Ausspielung Debug Console:</div>
            {debugLogs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SimpleAusspielung
