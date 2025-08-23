import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Real DOM Line Measurement Hook
 * 
 * Measures actual line boxes from rendered text using getClientRects()
 * No synthetic lines, no temp containers, no word spans
 * 
 * Returns lines[] = [{top, bottom, height, index}] based on actual DOM rendering
 */
export const useRealLineMeasurement = (textContent, layoutSettings) => {
  const [lines, setLines] = useState([])
  const [isReady, setIsReady] = useState(false)
  const textElementRef = useRef(null)
  const measurementTimeoutRef = useRef(null)

  // Debounced measurement function
  const measureLines = useCallback(() => {
    if (measurementTimeoutRef.current) {
      clearTimeout(measurementTimeoutRef.current)
    }

    measurementTimeoutRef.current = setTimeout(() => {
      if (!textElementRef.current || !textContent.trim()) {
        setLines([])
        setIsReady(true)
        return
      }

      try {
        const element = textElementRef.current
        const textNode = element.firstChild

        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
          console.warn('No text node found for line measurement')
          setLines([])
          setIsReady(true)
          return
        }

        // Get all character rectangles
        const range = document.createRange()
        range.selectNodeContents(textNode)
        
        // Get line boxes by analyzing client rects
        const rects = Array.from(range.getClientRects())
        
        if (rects.length === 0) {
          setLines([])
          setIsReady(true)
          return
        }

        // Group rects into lines by Y position
        const lineMap = new Map()
        const tolerance = 2 // pixels tolerance for same line

        rects.forEach((rect, index) => {
          const roundedTop = Math.round(rect.top)
          
          // Find existing line within tolerance
          let lineKey = null
          for (const [key] of lineMap) {
            if (Math.abs(key - roundedTop) <= tolerance) {
              lineKey = key
              break
            }
          }
          
          if (lineKey === null) {
            lineKey = roundedTop
            lineMap.set(lineKey, {
              top: rect.top,
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
              rects: []
            })
          }
          
          const line = lineMap.get(lineKey)
          line.rects.push(rect)
          line.top = Math.min(line.top, rect.top)
          line.bottom = Math.max(line.bottom, rect.bottom)
          line.left = Math.min(line.left, rect.left)
          line.right = Math.max(line.right, rect.right)
        })

        // Convert to sorted lines array
        const measuredLines = Array.from(lineMap.values())
          .sort((a, b) => a.top - b.top)
          .map((line, index) => ({
            index,
            top: line.top,
            bottom: line.bottom,
            height: line.bottom - line.top,
            left: line.left,
            right: line.right,
            width: line.right - line.left,
            rectCount: line.rects.length
          }))

        console.log(`📏 Measured ${measuredLines.length} lines from ${rects.length} rects`)
        setLines(measuredLines)
        setIsReady(true)

      } catch (error) {
        console.error('Line measurement failed:', error)
        setLines([])
        setIsReady(true)
      }
    }, 50) // 50ms debounce
  }, [textContent])

  // Re-measure when content or settings change
  useEffect(() => {
    setIsReady(false)
    measureLines()
  }, [textContent, layoutSettings.fontSize, layoutSettings.lineHeightUnitless, layoutSettings.fontFamily, measureLines])

  // Re-measure on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsReady(false)
      measureLines()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (measurementTimeoutRef.current) {
        clearTimeout(measurementTimeoutRef.current)
      }
    }
  }, [measureLines])

  // Find line index at specific Y position
  const getLineIndexAtY = useCallback((y) => {
    if (!lines.length) return 0
    
    // Find line whose center is closest to y
    let closestIndex = 0
    let closestDistance = Infinity
    
    lines.forEach((line, index) => {
      const lineCenter = line.top + line.height / 2
      const distance = Math.abs(lineCenter - y)
      
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    })
    
    return closestIndex
  }, [lines])

  // Get Y position for line index
  const getYForLineIndex = useCallback((lineIndex) => {
    if (!lines.length || lineIndex < 0) return 0
    if (lineIndex >= lines.length) return lines[lines.length - 1]?.top || 0
    
    return lines[lineIndex].top
  }, [lines])

  return {
    lines,
    isReady,
    textElementRef,
    measureLines,
    getLineIndexAtY,
    getYForLineIndex,
    totalLines: lines.length
  }
}
