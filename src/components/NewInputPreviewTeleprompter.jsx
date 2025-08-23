import { useEffect, useRef } from 'react'
import RealTextDisplay from './RealTextDisplay'
import FixedMarker from './FixedMarker'
import { useRealLineMeasurement } from '../hooks/useRealLineMeasurement'
import { usePreciseScroll } from '../hooks/usePreciseScroll'

/**
 * NewInputPreviewTeleprompter - Input side preview with 40% marker
 * 
 * Implements the new architecture:
 * - Real DOM line measurement (no synthetic lines)
 * - Fixed marker at 40% (look ahead)
 * - Precise scroll mapping
 * - Flow text rendering
 */
const NewInputPreviewTeleprompter = ({
  content = '',
  layoutSettings = {},
  isScrolling = false,
  speed = 1,
  currentLineIndex = 0,
  onLineChange = null,
  onSeek = null,
  className = ''
}) => {

  console.log('NewInputPreviewTeleprompter received content:', content)

  const containerRef = useRef(null)
  const textRef = useRef(null)

  // Real line measurement from actual DOM
  const {
    lines,
    isReady: measurementReady,
    textElementRef,
    measureLines
  } = useRealLineMeasurement(content, layoutSettings)

  // Precise scroll control with 40% marker
  const {
    currentLineIndex: scrollLineIndex,
    isScrolling: scrollIsScrolling,
    scrollY,
    scrollToLine,
    startAutoScroll,
    stopAutoScroll,
    scrollTransform,
    markerY
  } = usePreciseScroll(lines, 40) // 40% marker for Input (look ahead)

  // Sync with external state
  useEffect(() => {
    if (measurementReady && currentLineIndex !== scrollLineIndex) {
      scrollToLine(currentLineIndex, true) // Immediate sync
    }
  }, [currentLineIndex, scrollLineIndex, measurementReady, scrollToLine])

  // Handle auto-scroll state
  useEffect(() => {
    if (!measurementReady) return

    if (isScrolling && !scrollIsScrolling) {
      startAutoScroll(speed)
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

  // Handle click-to-seek
  const handleClick = (event) => {
    if (!measurementReady || !onSeek) return

    const rect = containerRef.current.getBoundingClientRect()
    const clickY = event.clientY - rect.top
    const worldY = clickY + scrollY

    // Find closest line
    let targetLineIndex = 0
    let closestDistance = Infinity

    lines.forEach((line, index) => {
      const lineCenter = line.top + line.height / 2
      const distance = Math.abs(lineCenter - worldY)
      
      if (distance < closestDistance) {
        closestDistance = distance
        targetLineIndex = index
      }
    })

    onSeek(targetLineIndex)
  }

  // Ensure text element ref is connected
  useEffect(() => {
    if (textRef.current) {
      textElementRef.current = textRef.current
      // Trigger re-measurement after ref connection
      setTimeout(measureLines, 10)
    }
  }, [textElementRef, measureLines])

  const containerStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    cursor: onSeek ? 'pointer' : 'default'
  }

  const scrollContentStyle = {
    transform: scrollTransform,
    willChange: 'transform',
    transformOrigin: 'top left'
  }

  const debugInfo = process.env.NODE_ENV === 'development' ? {
    lines: lines.length,
    ready: measurementReady,
    scrollY: Math.round(scrollY),
    lineIndex: scrollLineIndex,
    markerY: Math.round(markerY)
  } : null

  return (
    <div 
      ref={containerRef}
      className={className}
      style={containerStyle}
      onClick={handleClick}
    >
      {/* Fixed marker at 40% */}
      <FixedMarker position="input">
        40%
      </FixedMarker>

      {/* Scrolling text content */}
      <div style={scrollContentStyle}>
        {/* Debug content display */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          backgroundColor: 'red',
          color: 'white',
          padding: '10px',
          zIndex: 1000
        }}>
          Content: "{content}" (Length: {content.length})
        </div>
        
        <RealTextDisplay
          ref={textRef}
          content={content}
          layoutSettings={layoutSettings}
          showLineNumbers={true}
          lineNumberGutterWidth={4}
        />
      </div>

      {/* Debug info overlay */}
      {debugInfo && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            fontSize: '10px',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#00ff00',
            padding: '4px 8px',
            borderRadius: '3px',
            zIndex: 200,
            pointerEvents: 'none'
          }}
        >
          Lines: {debugInfo.lines} | Ready: {debugInfo.ready ? '✓' : '⏳'} |{' '}
          ScrollY: {debugInfo.scrollY} | Line: {debugInfo.lineIndex} |{' '}
          MarkerY: {debugInfo.markerY}
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
            fontSize: '14px'
          }}
        >
          Measuring lines...
        </div>
      )}
    </div>
  )
}

export default NewInputPreviewTeleprompter
