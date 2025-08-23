import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react'

const SimpleTeleprompterPreview = forwardRef(({ 
  content = '', 
  layoutSettings = {},
  isScrolling = false,
  speed = 1,
  onSettingsChange = null,
  onScrollToTop = null,
  onScrollToBottom = null,
  onDebugInfoChange = null
}, ref) => {
  const containerRef = useRef(null)
  const textRef = useRef(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isDraggingLine, setIsDraggingLine] = useState(false)
  const [isDraggingText, setIsDraggingText] = useState(false)
  const animationFrameRef = useRef(null)

  // Scroll-to-top function
  const scrollToTop = useCallback(() => {
    setScrollPosition(0);
    if (onScrollToTop) {
      onScrollToTop();
    }
  }, [onScrollToTop]);

  // Scroll-to-bottom function  
  const scrollToBottom = useCallback(() => {
    // Use setTimeout to ensure the DOM is updated
    setTimeout(() => {
      if (textRef.current && containerRef.current) {
        const textHeight = textRef.current.scrollHeight;
        const containerHeight = containerRef.current.clientHeight;
        const maxScroll = Math.max(0, textHeight - containerHeight + 100); // Add some padding
        console.log('ScrollToBottom:', { textHeight, containerHeight, maxScroll });
        setScrollPosition(maxScroll);
      }
    }, 50); // Small delay to ensure DOM is rendered
    
    if (onScrollToBottom) {
      onScrollToBottom();
    }
  }, [onScrollToBottom]);

  // Expose scroll functions via ref using useImperativeHandle
  useImperativeHandle(ref, () => ({
    scrollToTop,
    scrollToBottom
  }), [scrollToTop, scrollToBottom]);

  // Send debug info to parent
  useEffect(() => {
    if (onDebugInfoChange) {
      const debugInfo = {
        status: isScrolling ? '▶️ Auto' : (isDraggingText ? '👋 Drag' : '⏸️ Manual'),
        speed: speed,
        position: Math.round(scrollPosition),
        chars: cleanContent.length,
        isScrolling,
        isDraggingText
      };
      onDebugInfoChange(debugInfo);
    }
  }, [isScrolling, isDraggingText, speed, scrollPosition, cleanContent.length, onDebugInfoChange]);

  const {
    fontSize = 24,
    lineHeightUnitless = 1.4,
    fontFamily = 'system-ui, sans-serif',
    marginLeft = 20,
    marginRight = 20,
    margins = 20, // fallback for old format
    showReadingLine = true,
    readingLinePosition = 40
  } = layoutSettings

  // Use separate margins or fallback to old margins setting
  const leftMargin = marginLeft || margins
  const rightMargin = marginRight || margins

  // Reading line position as percentage
  const readingLineY = `${readingLinePosition}%`

  console.log('SimpleTeleprompterPreview received:', content, 'isScrolling:', isScrolling, 'speed:', speed)

  // Clean and process text content
  const processContent = (text) => {
    if (!text) return ''
    
    // Convert HTML breaks to actual line breaks
    let processed = text
      .replace(/<br\s*\/?>/gi, '\n')  // <br> tags to newlines
      .replace(/<\/p>/gi, '\n\n')     // </p> tags to double newlines
      .replace(/<p[^>]*>/gi, '')      // Remove <p> opening tags
      .replace(/<[^>]*>/g, '')        // Remove any remaining HTML tags
      .replace(/&nbsp;/g, ' ')        // Convert non-breaking spaces
      .replace(/&amp;/g, '&')         // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
    
    // Add 5 empty paragraphs at the beginning for smooth scroll-in
    // and 5 empty paragraphs at the end for smooth scroll-out
    const leadingSpaces = '\n\n\n\n\n\n\n\n\n\n' // 5 double line breaks = 5 empty paragraphs
    const trailingSpaces = '\n\n\n\n\n\n\n\n\n\n' // 5 double line breaks = 5 empty paragraphs
    
    return leadingSpaces + processed.trim() + trailingSpaces
  }

  const cleanContent = processContent(content)

  // Auto-scroll effect with proper speed calculation
  useEffect(() => {
    if (isScrolling && speed > 0) {
      const scroll = () => {
        setScrollPosition(prev => {
          // Convert speed (1-10) to pixels per frame
          // Speed 1 = 0.5px/frame, Speed 10 = 5px/frame
          const pixelsPerFrame = (speed * 0.5)
          const newPos = prev + pixelsPerFrame
          
          // Reset when reaching bottom
          if (textRef.current && containerRef.current) {
            const textHeight = textRef.current.scrollHeight
            const containerHeight = containerRef.current.clientHeight
            if (newPos > textHeight + containerHeight) {
              return 0
            }
          }
          
          return newPos
        })
        animationFrameRef.current = requestAnimationFrame(scroll)
      }
      
      animationFrameRef.current = requestAnimationFrame(scroll)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isScrolling, speed])

  // Manual scroll with mouse wheel
  const handleWheel = (e) => {
    e.preventDefault()
    
    setScrollPosition(prev => {
      const scrollSensitivity = 50 // pixels per wheel notch
      const delta = e.deltaY > 0 ? scrollSensitivity : -scrollSensitivity
      const newPos = prev + delta
      
      // Constrain scroll position
      if (textRef.current && containerRef.current) {
        const textHeight = textRef.current.scrollHeight
        const containerHeight = containerRef.current.clientHeight
        const maxScroll = Math.max(0, textHeight - containerHeight + 100) // +100 for bottom padding
        
        return Math.max(0, Math.min(maxScroll, newPos))
      }
      
      return Math.max(0, newPos)
    })
  }

  // Drag to scroll functionality
  const handleMouseDown = (e) => {
    if (isScrolling || isDraggingLine) return // Don't drag when auto-scrolling or dragging line
    
    e.preventDefault()
    setIsDraggingText(true)
    
    const startY = e.clientY
    const startScrollPos = scrollPosition
    
    const handleMouseMove = (e) => {
      const deltaY = e.clientY - startY
      const newPos = startScrollPos - deltaY // Invert for natural feel
      
      setScrollPosition(prev => {
        if (textRef.current && containerRef.current) {
          const textHeight = textRef.current.scrollHeight
          const containerHeight = containerRef.current.clientHeight
          const maxScroll = Math.max(0, textHeight - containerHeight + 100)
          
          return Math.max(0, Math.min(maxScroll, newPos))
        }
        return Math.max(0, newPos)
      })
    }
    
    const handleMouseUp = () => {
      setIsDraggingText(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Reset scroll position when content changes
  useEffect(() => {
    setScrollPosition(0)
  }, [cleanContent])

  const textStyle = {
    fontFamily: fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: lineHeightUnitless,
    color: 'white',
    paddingLeft: `${leftMargin}px`,
    paddingRight: `${rightMargin}px`,
    paddingTop: '20px',
    paddingBottom: '20px',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    transform: `translateY(-${scrollPosition}px)`,
    transition: isScrolling ? 'none' : 'transform 0.3s ease'
  }

  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        overflow: 'hidden', // Hide overflow for scrolling
        position: 'relative',
        cursor: isScrolling ? 'default' : (isDraggingText ? 'grabbing' : 'grab'),
        userSelect: 'none' // Prevent text selection during drag
      }}
    >
      {/* Fixed Reading Line with Handle */}
      {showReadingLine && (
        <>
          {/* Reading Line */}
          <div style={{
            position: 'absolute',
            top: readingLineY,
            left: 0,
            right: '30px', // Leave space for handle
            height: '2px',
            backgroundColor: 'rgba(255, 0, 0, 0.9)',
            zIndex: 999,
            boxShadow: '0 0 10px rgba(255, 0, 0, 0.6)',
            pointerEvents: 'none'
          }} />

          {/* Drag Handle */}
          <div 
            style={{
              position: 'absolute',
              top: `calc(${readingLineY} - 10px)`,
              right: '5px',
              width: '20px',
              height: '20px',
              backgroundColor: isDraggingLine ? 'rgba(255, 0, 0, 0.9)' : 'rgba(255, 0, 0, 0.7)',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              borderRadius: '50%',
              cursor: 'ns-resize',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'white',
              userSelect: 'none'
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              setIsDraggingLine(true)
              
              const startY = e.clientY
              const startPosition = readingLinePosition
              
              const handleMouseMove = (e) => {
                if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect()
                  const deltaY = e.clientY - startY
                  const deltaPercent = (deltaY / rect.height) * 100
                  const newPosition = Math.max(10, Math.min(90, startPosition + deltaPercent))
                  
                  // Update via callback if available
                  if (onSettingsChange) {
                    onSettingsChange({ readingLinePosition: newPosition })
                  }
                }
              }
              
              const handleMouseUp = () => {
                setIsDraggingLine(false)
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
              }
              
              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}
          >
            ⋮
          </div>
        </>
      )}

      {/* Remove old static marker line */}

      {/* Main text content */}
      <div ref={textRef} style={textStyle}>
        {cleanContent || 'Kein Text eingegeben...'}
      </div>
    </div>
  )
})

SimpleTeleprompterPreview.displayName = 'SimpleTeleprompterPreview'

export default SimpleTeleprompterPreview
