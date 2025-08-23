import { useEffect, useRef, useState } from 'react'
import RealTextDisplay from './RealTextDisplay'
import FixedMarker from './FixedMarker'
import { useRealLineMeasurement } from '../hooks/useRealLineMeasurement'
import { usePreciseScroll } from '../hooks/usePreciseScroll'

/**
 * NewOutputTeleprompter - Output side with 30% marker
 * 
 * Auto-scroll teleprompter for display device (iPad Pro-Teleprompter)
 * - Fixed marker at 30% (reading position)
 * - Auto-scroll animation
 * - WebSocket sync with Input
 * - Fullscreen optimized
 */
const NewOutputTeleprompter = ({
  content = '',
  layoutSettings = {},
  isScrolling = false,
  speed = 1,
  currentLineIndex = 0,
  onLineChange = null,
  className = '',
  showDebug = false
}) => {

  const containerRef = useRef(null)
  const textRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Real line measurement from actual DOM
  const {
    lines,
    isReady: measurementReady,
    textElementRef,
    measureLines
  } = useRealLineMeasurement(content, layoutSettings)

  // Precise scroll control with 30% marker
  const {
    currentLineIndex: scrollLineIndex,
    isScrolling: scrollIsScrolling,
    scrollY,
    scrollToLine,
    startAutoScroll,
    stopAutoScroll,
    scrollTransform,
    markerY
  } = usePreciseScroll(lines, 30) // 30% marker for Output

  // Sync with external state
  useEffect(() => {
    if (measurementReady && currentLineIndex !== scrollLineIndex) {
      scrollToLine(currentLineIndex, false) // Smooth animation for Output
    }
  }, [currentLineIndex, scrollLineIndex, measurementReady, scrollToLine])

  // Handle auto-scroll state
  useEffect(() => {
    if (!measurementReady) return

    if (isScrolling && !scrollIsScrolling) {
      startAutoScroll(speed * 60) // Convert to pixels per second
    } else if (!isScrolling && scrollIsScrolling) {
      stopAutoScroll()
    }
  }, [isScrolling, scrollIsScrolling, speed, measurementReady, startAutoScroll, stopAutoScroll])

  // Report line changes
  useEffect(() => {
    if (onLineChange && scrollLineIndex !== currentLineIndex) {
      onLineChange(scrollLineIndex)
    }
  }, [scrollLineIndex, currentLineIndex, onLineChange])

  // Ensure text element ref is connected
  useEffect(() => {
    if (textRef.current) {
      textElementRef.current = textRef.current
      // Trigger re-measurement after ref connection
      setTimeout(measureLines, 10)
    }
  }, [textElementRef, measureLines])

  // Fullscreen handling
  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'f' || event.key === 'F') {
        toggleFullscreen()
      } else if (event.key === 'Escape' && isFullscreen) {
        document.exitFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [isFullscreen])

  const containerStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#000000', // Pure black for output
    color: '#ffffff',
    cursor: 'none', // Hide cursor in output mode
    transform: `scaleX(${layoutSettings.mirrorHorizontal ? -1 : 1}) scaleY(${layoutSettings.mirrorVertical ? -1 : 1})`
  }

  const scrollContentStyle = {
    transform: scrollTransform,
    willChange: 'transform',
    transformOrigin: 'top left'
  }

  const debugInfo = showDebug ? {
    lines: lines.length,
    ready: measurementReady,
    scrollY: Math.round(scrollY),
    lineIndex: scrollLineIndex,
    markerY: Math.round(markerY),
    isScrolling: scrollIsScrolling,
    speed: speed
  } : null

  // Larger font size for output display
  const outputLayoutSettings = {
    ...layoutSettings,
    fontSize: layoutSettings.fontSize * 1.2, // 20% larger for better readability
    margins: layoutSettings.margins * 1.5
  }

  return (
    <div 
      ref={containerRef}
      className={className}
      style={containerStyle}
    >
      {/* Fixed marker at 30% */}
      <FixedMarker position="output">
        {showDebug ? '30%' : ''}
      </FixedMarker>

      {/* Scrolling text content */}
      <div style={scrollContentStyle}>
        <RealTextDisplay
          ref={textRef}
          content={content}
          layoutSettings={outputLayoutSettings}
          showLineNumbers={false} // No line numbers on output
        />
      </div>

      {/* Fullscreen toggle button */}
      {!isFullscreen && (
        <button
          onClick={toggleFullscreen}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            zIndex: 150
          }}
        >
          ⛶ Fullscreen (F)
        </button>
      )}

      {/* Debug info overlay */}
      {debugInfo && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            fontSize: '12px',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#00ff00',
            padding: '8px 12px',
            borderRadius: '4px',
            zIndex: 200,
            pointerEvents: 'none',
            border: '1px solid #333'
          }}
        >
          <div>Lines: {debugInfo.lines} | Ready: {debugInfo.ready ? '✓' : '⏳'}</div>
          <div>ScrollY: {debugInfo.scrollY} | Line: {debugInfo.lineIndex}</div>
          <div>MarkerY: {debugInfo.markerY} | Scrolling: {debugInfo.isScrolling ? '▶️' : '⏸️'}</div>
          <div>Speed: {debugInfo.speed}x</div>
        </div>
      )}

      {/* Loading state */}
      {!measurementReady && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#666',
            fontSize: '18px',
            textAlign: 'center'
          }}
        >
          <div>📏 Measuring lines...</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>
            Please wait while we analyze the text layout
          </div>
        </div>
      )}

      {/* No content state */}
      {measurementReady && !content.trim() && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#666',
            fontSize: '18px',
            textAlign: 'center'
          }}
        >
          <div>📄 No content loaded</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>
            Load a text file in the Input interface
          </div>
        </div>
      )}

      {/* Fullscreen instructions */}
      {isFullscreen && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.3)',
            zIndex: 150,
            pointerEvents: 'none'
          }}
        >
          Press ESC to exit fullscreen
        </div>
      )}
    </div>
  )
}

export default NewOutputTeleprompter
