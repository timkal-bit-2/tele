import { useState, useEffect, useRef } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import LineBasedTeleprompter from './LineBasedTeleprompter'

const OutputPage = ({ onReset }) => {
  // Access ws plus sendMessage for broadcasting line updates
  const { ws, sendMessage } = useWebSocket()
  const [content, setContent] = useState('')
  const [settings, setSettings] = useState({
    fontSize: 24,
  scrollSpeed: 1.5, // 0-5 lines per second (0 = stop)
    margin: 20,
    lineHeight: 1.5,
    mirrorHorizontal: false,
  mirrorVertical: false,
  lineNumberOpacity: 60
  })
  const [isScrolling, setIsScrolling] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [currentLine, setCurrentLine] = useState(0) // Local actively scrolled line
  const [remoteCurrentLine, setRemoteCurrentLine] = useState(0) // Incoming line (from Input)
  const [fractionalLine, setFractionalLine] = useState(0) // Smooth progress
  const [totalLines, setTotalLines] = useState(0)
  const [showHeader, setShowHeader] = useState(true)
  const hideTimerRef = useRef(null)

  // Refs for animation stability
  const scrollAnimationRef = useRef(null)
  const isScrollingRef = useRef(false)
  const speedRef = useRef(0)
  const targetLineRef = useRef(null)
  const smoothingRef = useRef(false)
  const lastLineBroadcastRef = useRef(-1)

  // Listen for WebSocket messages
  useEffect(() => {
    const handleMessage = (event) => {
      const data = event.detail

      switch (data.type) {
        case 'content-update':
          setContent(data.content || '')
          setSettings(data.settings || settings)
          if (data.currentLine !== undefined) {
            setRemoteCurrentLine(data.currentLine)
          }
          // Remote play/pause only after user activation
          if (data.isScrolling !== undefined && hasUserInteracted) {
            if (data.isScrolling && !isScrollingRef.current) {
              startScrolling()
            } else if (!data.isScrolling && isScrollingRef.current) {
              stopScrolling()
            }
          }
          break
        case 'line-update':
          // Line updates from Output (self) or potentially future authority changes
          if (typeof data.currentLine === 'number') {
            setRemoteCurrentLine(data.currentLine)
          }
          break
        case 'line-sync':
          if (typeof data.currentLine === 'number' && !isScrollingRef.current) {
            // Smooth interpolation to new target line
            targetLineRef.current = data.currentLine
            if (!smoothingRef.current) {
              smoothingRef.current = true
              const ease = () => {
                if (targetLineRef.current == null) { smoothingRef.current = false; return }
                setFractionalLine(f => {
                  const diff = targetLineRef.current - f
                  if (Math.abs(diff) < 0.02) {
                    setCurrentLine(targetLineRef.current)
                    targetLineRef.current = null
                    return targetLineRef.current ?? f
                  }
                  const step = diff * 0.18 // easing factor
                  const next = f + step
                  setCurrentLine(Math.floor(next))
                  return next
                })
                if (targetLineRef.current != null) requestAnimationFrame(ease)
                else smoothingRef.current = false
              }
              requestAnimationFrame(ease)
            }
          }
          break
        default:
          break
      }
    }
    window.addEventListener('websocket-message', handleMessage)
    return () => window.removeEventListener('websocket-message', handleMessage)
  }, [hasUserInteracted, settings])

  // Load cached content from localStorage
  useEffect(() => {
    const cachedContent = localStorage.getItem('teleprompter-cached-content')
    const cachedSettings = localStorage.getItem('teleprompter-cached-settings')
    
    if (cachedContent) {
      setContent(cachedContent)
    }
    
    if (cachedSettings) {
      try {
        setSettings(JSON.parse(cachedSettings))
      } catch (error) {
        console.error('Error loading cached settings:', error)
      }
    }
  }, [])

  // Cache content and settings
  useEffect(() => {
    localStorage.setItem('teleprompter-cached-content', content)
  }, [content])

  useEffect(() => {
    localStorage.setItem('teleprompter-cached-settings', JSON.stringify(settings))
  }, [settings])

  // Handle touch/click interaction for iOS Safari and desktop
  const handleUserInteraction = () => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true)
    }
  }

  // Fullscreen handling
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } catch (error) {
        console.error('Error entering fullscreen:', error)
      }
    } else {
      try {
        await document.exitFullscreen()
        setIsFullscreen(false)
      } catch (error) {
        console.error('Error exiting fullscreen:', error)
      }
    }
  }

  // Line-based scrolling animation
  const startScrolling = () => {
    if (!hasUserInteracted) return
    isScrollingRef.current = true
    setIsScrolling(true)

  const speed = Math.max(0, settings.scrollSpeed)
    if (speed === 0) {
      // Sofort pausieren falls 0 gewählt
      isScrollingRef.current = false
      setIsScrolling(false)
      return
    }
  speedRef.current = speed
    let last = performance.now()

    const loop = (now) => {
      if (!isScrollingRef.current) return
      const dt = (now - last) / 1000
      last = now
      setFractionalLine(f => {
        const next = f + speedRef.current * dt
        const intPart = Math.floor(next)
        setCurrentLine(prev => (intPart > prev ? intPart : prev))
        return next
      })
      if (isScrollingRef.current) {
        scrollAnimationRef.current = requestAnimationFrame(loop)
      }
    }
    scrollAnimationRef.current = requestAnimationFrame(loop)
  }

  const stopScrolling = () => {
    isScrollingRef.current = false
    setIsScrolling(false)
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current)
      scrollAnimationRef.current = null
    }
  }

  const resetScroll = () => {
    stopScrolling()
    setCurrentLine(0)
  setFractionalLine(0)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault()
          if (isScrolling) {
            stopScrolling()
          } else {
            startScrolling()
          }
          break
        case 'Escape':
          e.preventDefault()
          resetScroll()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isScrolling, hasUserInteracted])

  // Broadcast line changes so Input sieht Fortschritt
  useEffect(() => {
    if (!isScrollingRef.current) return
    if (lastLineBroadcastRef.current === currentLine) return
    lastLineBroadcastRef.current = currentLine
    sendMessage({ type: 'line-update', currentLine })
  }, [currentLine, sendMessage])

  // Update speed ref live
  useEffect(() => {
    speedRef.current = Math.max(0, settings.scrollSpeed)
  }, [settings.scrollSpeed])

  // Stop at end
  useEffect(() => {
    if (totalLines > 0 && currentLine >= totalLines) {
      stopScrolling()
    }
  }, [currentLine, totalLines])

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current)
      }
    }
  }, [])

  // Auto-hide Header: blendet nach 3s aus, erscheint bei Mausbewegung oder Touch
  useEffect(() => {
    const scheduleHide = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setShowHeader(false), 3000)
    }
    if (showHeader) scheduleHide()
    const handleMove = () => {
      setShowHeader(true)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('touchstart', handleMove)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('touchstart', handleMove)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [showHeader])

  return (
    <div
      className={`h-screen bg-black text-white overflow-hidden relative ${isFullscreen ? 'ios-fullscreen' : ''}`}
      onTouchStart={(e) => { handleUserInteraction(); setShowHeader(true) }}
      onClick={() => { handleUserInteraction(); setShowHeader(true) }}
    >
      {/* Top Header (auto-hide) */}
      {showHeader && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-sm p-3 flex items-center justify-between transition-opacity">
          <div className="flex items-center space-x-4">
            <button
              onClick={onReset}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              ← Zurück
            </button>
            <h1 className="text-lg font-semibold">Output (iPad)</h1>
          </div>
          <div className="flex items-center space-x-2">
            {!hasUserInteracted && (
              <div className="text-yellow-400 text-sm animate-pulse">Touch zum Aktivieren</div>
            )}
            {hasUserInteracted && (
              <>
                <button
                  onClick={isScrolling ? stopScrolling : startScrolling}
                  className={`px-4 py-2 rounded transition-colors ${isScrolling ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
                >
                  {isScrolling ? '⏸️ Stop' : '▶️ Start'}
                </button>
                <button
                  onClick={resetScroll}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                >
                  ⏮️
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                >
                  ⛶
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content Display */}
      <div className="h-full w-full">
        {content ? (
          <LineBasedTeleprompter
            content={content}
            settings={settings}
            isScrolling={isScrolling}
            currentLine={currentLine}
            fractionalLine={fractionalLine}
            onLineChange={setCurrentLine}
            onLinesCountChange={setTotalLines}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-center">
            <div>
              <div className="text-4xl mb-4">📄</div>
              <p className="text-xl mb-2">Warte auf Inhalte...</p>
              <p className="text-sm">Verbinde dich mit dem Input-Gerät</p>
            </div>
          </div>
        )}
      </div>

      {/* Touch/Click Instructions Overlay */}
      {!hasUserInteracted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
          <div className="text-center text-white p-8 rounded-lg bg-black bg-opacity-75">
            <div className="text-4xl mb-4">👆</div>
            <p className="text-xl mb-2">Klicken oder Berühren</p>
            <p className="text-sm text-gray-300">um die Teleprompter-Funktionen zu aktivieren</p>
          </div>
        </div>
      )}

      {/* Line Position Indicator */}
  {/* Removed mini overlay (requested) */}

      {/* Floating Control Panel (Fullscreen) */}
      {hasUserInteracted && isFullscreen && (
        <div className="absolute top-8 right-8 z-20 flex space-x-2">
          <button
            onClick={resetScroll}
            className="w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center text-white transition-all duration-300 shadow-lg hover:scale-110"
            title="Reset (ESC)"
          >
            ⏮
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-all duration-300 shadow-lg hover:scale-110"
            title="Exit Fullscreen (F)"
          >
            ⛶
          </button>
        </div>
      )}

  {/* Entfernt: Floating Play Button */}

      {/* Keyboard Shortcuts Help (only in fullscreen) */}
      {isFullscreen && hasUserInteracted && (
        <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-black bg-opacity-50 p-2 rounded">
          <div>SPACE: Start/Stop</div>
          <div>ESC: Reset</div>
          <div>F: Fullscreen</div>
        </div>
      )}
    </div>
  )
}

export default OutputPage
