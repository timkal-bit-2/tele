import { useState, useEffect, useRef, useCallback } from 'react'
import { useLineMeasurement } from '../hooks/useLineMeasurement'

const InputPreviewTeleprompter = ({ 
  plainText, 
  layoutSettings, 
  currentLineIndex,
  onSeekToLine,
  className = "",
  style = {} 
}) => {
  const containerRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  
  // Line measurement (same as output)
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

  // Calculate marker position (40% of viewport height - "look ahead")
  const markerY = viewportHeight * 0.40

  // Update scroll position to center current line at marker
  useEffect(() => {
    if (!lines.length || currentLineIndex < 0) return
    
    const targetY = getYForLineIndex(currentLineIndex) - markerY
    setScrollY(Math.max(0, targetY))
  }, [currentLineIndex, lines, getYForLineIndex, markerY])

  // Handle wheel scrolling
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    
    const delta = e.deltaY
    const scrollSensitivity = lineHeightPx / 3 // Smooth scrolling
    const newScrollY = Math.max(0, scrollY + delta * scrollSensitivity / 100)
    
    setScrollY(newScrollY)
    
    // Find line at marker and notify parent
    const markerAbsoluteY = newScrollY + markerY
    const lineIndex = getLineIndexAtY(markerAbsoluteY)
    onSeekToLine?.(lineIndex)
  }, [scrollY, markerY, lineHeightPx, getLineIndexAtY, onSeekToLine])

  // Handle click to seek
  const handleClick = useCallback((e) => {
    const rect = containerRef.current.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const absoluteY = scrollY + clickY
    const lineIndex = getLineIndexAtY(absoluteY)
    onSeekToLine?.(lineIndex)
  }, [scrollY, getLineIndexAtY, onSeekToLine])

  // Handle drag scrolling
  const dragStateRef = useRef({ startY: 0, startScrollY: 0 })

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return
    setIsDragging(true)
    dragStateRef.current = { 
      startY: e.clientY, 
      startScrollY: scrollY 
    }
  }, [scrollY])

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return
    
    const deltaY = e.clientY - dragStateRef.current.startY
    const newScrollY = Math.max(0, dragStateRef.current.startScrollY - deltaY)
    
    setScrollY(newScrollY)
    
    // Find line at marker and notify parent
    const markerAbsoluteY = newScrollY + markerY
    const lineIndex = getLineIndexAtY(markerAbsoluteY)
    onSeekToLine?.(lineIndex)
  }, [isDragging, markerY, getLineIndexAtY, onSeekToLine])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Event listeners
  useEffect(() => {
    if (!isDragging) return
    
    const handleGlobalMove = (e) => handlePointerMove(e)
    const handleGlobalUp = () => handlePointerUp()
    
    window.addEventListener('pointermove', handleGlobalMove)
    window.addEventListener('pointerup', handleGlobalUp)
    
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove)
      window.removeEventListener('pointerup', handleGlobalUp)
    }
  }, [isDragging, handlePointerMove, handlePointerUp])

  // Generate line-by-line display for better readability
  const renderLines = () => {
    if (!lines.length) return null
    
    return lines.map((line, index) => {
      const isActive = index === currentLineIndex
      const y = line.yTop - scrollY
      
      // Only render visible lines for performance
      if (y < -lineHeightPx || y > viewportHeight + lineHeightPx) {
        return null
      }
      
      return (
        <div
          key={index}
          className={`absolute left-0 right-0 grid grid-cols-[4ch_1fr] gap-4 items-center px-4 ${
            isActive ? 'text-white' : 'text-gray-300'
          }`}
          style={{
            top: y,
            height: lineHeightPx,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          <span className="text-sm font-mono text-right text-gray-500 select-none">
            {index + 1}
          </span>
          <span className="truncate">
            {line.text}
          </span>
        </div>
      )
    })
  }

  const containerStyle = {
    fontSize: `${layoutSettings.fontSize}px`,
    lineHeight: layoutSettings.lineHeightUnitless,
    fontFamily: layoutSettings.fontFamily,
    cursor: isDragging ? 'grabbing' : 'grab',
    ...style
  }

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-900 text-white select-none ${className}`}
      style={containerStyle}
      onWheel={handleWheel}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      spellCheck={false}
    >
      {/* Line content */}
      <div className="absolute inset-0">
        {renderLines()}
      </div>
      
      {/* Marker line at 40% */}
      <div 
        className="absolute left-0 right-0 pointer-events-none z-10"
        style={{ 
          top: `${markerY}px`,
          height: `${lineHeightPx}px`,
          marginTop: `-${lineHeightPx/2}px`
        }}
      >
        <div className="w-full h-full border-2 border-blue-400/80 rounded bg-blue-500/20" />
      </div>
      
      {/* Scrollbar indicator */}
      {lines.length > 0 && (
        <div className="absolute top-2 right-2 bottom-2 w-2 bg-gray-700/50 rounded">
          <div 
            className="w-full bg-blue-500/60 rounded"
            style={{
              height: `${Math.min(100, (viewportHeight / (lines[lines.length - 1]?.yTop + lineHeightPx || 1)) * 100)}%`,
              top: `${(scrollY / (lines[lines.length - 1]?.yTop + lineHeightPx || 1)) * 100}%`
            }}
          />
        </div>
      )}
      
      {/* Info overlay */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-400 bg-black/60 px-2 py-1 rounded font-mono">
        Line: {currentLineIndex + 1}/{lines.length}
      </div>
    </div>
  )
}

export default InputPreviewTeleprompter
