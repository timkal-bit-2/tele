import { useState, useEffect, useRef } from 'react'
import { useLineMeasurement } from '../hooks/useLineMeasurement'

const OutputTeleprompter = ({ 
  plainText, 
  layoutSettings, 
  playbackState, 
  onCurrentLineChange,
  className = "",
  style = {} 
}) => {
  const containerRef = useRef(null)
  const animationFrameRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)
  const [targetScrollY, setTargetScrollY] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  
  // Line measurement
  const { lines, lineHeightPx, getLineIndexAtY, getYForLineIndex } = useLineMeasurement(
    plainText, 
    layoutSettings, 
    containerRef
  )

  // Update viewport height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight)
      }
    }
    
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Calculate marker position (30% of viewport height)
  const markerY = viewportHeight * 0.30

  // Find current line at marker position
  useEffect(() => {
    if (!lines.length || !viewportHeight) return
    
    const markerAbsoluteY = scrollY + markerY
    const currentLineIndex = getLineIndexAtY(markerAbsoluteY)
    
    if (currentLineIndex !== playbackState.currentLineIndex) {
      onCurrentLineChange?.(currentLineIndex)
    }
  }, [scrollY, markerY, lines, getLineIndexAtY, playbackState.currentLineIndex, onCurrentLineChange])

  // Calculate target scroll position based on current line
  useEffect(() => {
    if (!lines.length || playbackState.currentLineIndex < 0) return
    
    const targetY = getYForLineIndex(playbackState.currentLineIndex) - markerY
    setTargetScrollY(Math.max(0, targetY))
  }, [playbackState.currentLineIndex, lines, getYForLineIndex, markerY])

  // Auto-scroll animation loop
  useEffect(() => {
    if (!playbackState.isScrolling) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    const speedPixelsPerSecond = (playbackState.speed * lineHeightPx) / 60 // speed is lines/minute
    
    const animate = (timestamp) => {
      const deltaTime = 16 / 1000 // ~60fps
      const increment = speedPixelsPerSecond * deltaTime
      
      setScrollY(prevScrollY => {
        const newScrollY = prevScrollY + increment
        return Math.round(newScrollY) // Integer pixels only
      })
      
      if (playbackState.isScrolling) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [playbackState.isScrolling, playbackState.speed, lineHeightPx])

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Handle manual seek (jump to position immediately)
  useEffect(() => {
    if (!playbackState.isScrolling) {
      setScrollY(targetScrollY)
    }
  }, [targetScrollY, playbackState.isScrolling])

  const containerStyle = {
    fontSize: `${layoutSettings.fontSize}px`,
    lineHeight: layoutSettings.lineHeightUnitless,
    fontFamily: layoutSettings.fontFamily,
    padding: `${layoutSettings.margins}px`,
    whiteSpace: layoutSettings.whiteSpace,
    hyphens: layoutSettings.hyphens ? 'auto' : 'none',
    wordBreak: 'normal',
    overflowWrap: 'normal',
    ...style
  }

  const textStyle = {
    transform: `translate3d(0, ${-Math.round(scrollY)}px, 0)`,
    willChange: 'transform',
    transition: playbackState.isScrolling ? 'none' : 'transform 0.2s ease-out'
  }

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden bg-black text-white ${className}`}
      style={containerStyle}
      spellCheck={false}
    >
      {/* Text content */}
      <div 
        className="absolute top-0 left-0 w-full"
        style={textStyle}
      >
        <pre className="m-0 p-0 font-inherit whitespace-pre-wrap">
          {plainText}
        </pre>
      </div>
      
      {/* Marker line at 30% */}
      <div 
        className="absolute left-0 right-0 pointer-events-none z-10"
        style={{ 
          top: `${markerY}px`,
          height: `${lineHeightPx}px`,
          marginTop: `-${lineHeightPx/2}px`
        }}
      >
        <div className="w-full h-full border-2 border-blue-400/60 rounded bg-blue-500/10" />
      </div>
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 text-xs text-gray-400 bg-black/60 px-2 py-1 rounded font-mono">
          Line: {playbackState.currentLineIndex}/{lines.length}<br/>
          ScrollY: {Math.round(scrollY)}<br/>
          Speed: {playbackState.speed.toFixed(1)} L/min
        </div>
      )}
    </div>
  )
}

export default OutputTeleprompter
