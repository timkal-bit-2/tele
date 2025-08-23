import { useState, useEffect, useRef, useCallback } from 'react'

// Hook für getClientRects() basierte Zeilenmessung
export const useLineMeasurement = (plainText, layoutSettings, containerRef) => {
  const [lines, setLines] = useState([])
  const [lineHeightPx, setLineHeightPx] = useState(0)
  const measurementRef = useRef(null)

  const measureLines = useCallback(() => {
    if (!plainText || !containerRef.current || !layoutSettings.containerWidth) {
      setLines([])
      setLineHeightPx(0)
      return
    }

    // Cleanup previous measurement
    if (measurementRef.current) {
      measurementRef.current.remove()
    }

    // Create measurement container
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.top = '-9999px'
    container.style.left = '-9999px'
    container.style.visibility = 'hidden'
    container.style.pointerEvents = 'none'
    container.style.width = `${layoutSettings.containerWidth - layoutSettings.margins * 2}px`
    container.style.fontFamily = layoutSettings.fontFamily
    container.style.fontSize = `${layoutSettings.fontSize}px`
    container.style.lineHeight = layoutSettings.lineHeightUnitless
    container.style.whiteSpace = layoutSettings.whiteSpace
    container.style.hyphens = layoutSettings.hyphens ? 'auto' : 'none'
    container.style.wordBreak = 'normal'
    container.style.overflowWrap = 'normal'
    container.style.padding = '0'
    container.style.margin = '0'
    container.style.border = 'none'

    document.body.appendChild(container)
    measurementRef.current = container

    // Measure line height with test span
    const testSpan = document.createElement('span')
    testSpan.textContent = 'Hg'
    container.appendChild(testSpan)
    const measuredLineHeight = testSpan.getBoundingClientRect().height
    setLineHeightPx(measuredLineHeight)

    // Clear container and add text
    container.innerHTML = ''
    container.textContent = plainText

    // Create range for each character to find line breaks
    const range = document.createRange()
    const textNode = container.firstChild
    
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      setLines([])
      return
    }

    const text = textNode.textContent
    const measuredLines = []
    let currentLineStart = 0
    let lastRect = null

    // Walk through each character to detect line breaks
    for (let i = 0; i <= text.length; i++) {
      range.setStart(textNode, i)
      range.setEnd(textNode, i)
      
      const rect = range.getBoundingClientRect()
      
      // New line detected or end of text
      if (lastRect && (rect.top > lastRect.top + measuredLineHeight / 2) || i === text.length) {
        const lineEnd = i === text.length ? i : i - 1
        const lineText = text.slice(currentLineStart, lineEnd)
        
        if (lineText.trim()) {
          // Get accurate line bounds
          range.setStart(textNode, currentLineStart)
          range.setEnd(textNode, lineEnd)
          const lineRect = range.getBoundingClientRect()
          
          measuredLines.push({
            index: measuredLines.length,
            text: lineText,
            yTop: lineRect.top - container.getBoundingClientRect().top,
            yBottom: lineRect.bottom - container.getBoundingClientRect().top,
            yCenter: (lineRect.top + lineRect.bottom) / 2 - container.getBoundingClientRect().top
          })
        }
        
        currentLineStart = i
      }
      
      lastRect = rect
    }

    setLines(measuredLines)

    // Cleanup
    return () => {
      if (measurementRef.current) {
        measurementRef.current.remove()
        measurementRef.current = null
      }
    }
  }, [plainText, layoutSettings, containerRef])

  // Re-measure on dependencies change
  useEffect(() => {
    measureLines()
  }, [measureLines])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (measurementRef.current) {
        measurementRef.current.remove()
      }
    }
  }, [])

  // Find line index at given Y position
  const getLineIndexAtY = useCallback((y) => {
    if (!lines.length) return 0
    
    let closestIndex = 0
    let closestDistance = Math.abs(lines[0].yCenter - y)
    
    for (let i = 1; i < lines.length; i++) {
      const distance = Math.abs(lines[i].yCenter - y)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = i
      }
    }
    
    return closestIndex
  }, [lines])

  // Get Y position for line index
  const getYForLineIndex = useCallback((index) => {
    if (!lines.length || index < 0) return 0
    if (index >= lines.length) return lines[lines.length - 1]?.yTop || 0
    return lines[index]?.yTop || 0
  }, [lines])

  return {
    lines,
    lineHeightPx,
    getLineIndexAtY,
    getYForLineIndex,
    remeasure: measureLines
  }
}
