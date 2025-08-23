/**
 * Deterministic Line Calculator
 * Must produce identical results on Laptop and iPad
 */

// Calculate text hash for version control
export const calculateTextHash = (text) => {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

// Tokenize text into lines based on viewport width and font settings
export const calculateLines = (text, params) => {
  const { fontSize, lineHeight, viewportWidth = 800, fontFamily = 'system-ui' } = params
  
  // Create invisible measurement element
  const measurer = document.createElement('div')
  measurer.style.cssText = `
    position: absolute;
    top: -9999px;
    left: -9999px;
    font-family: ${fontFamily};
    font-size: ${fontSize}px;
    line-height: ${lineHeight};
    width: ${viewportWidth}px;
    white-space: pre-wrap;
    word-wrap: break-word;
    visibility: hidden;
  `
  document.body.appendChild(measurer)
  
  try {
    const lines = []
    const paragraphs = text.split('\n')
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        lines.push({ text: '', height: fontSize * lineHeight })
        continue
      }
      
      measurer.textContent = paragraph
      const words = paragraph.split(' ')
      let currentLine = ''
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        measurer.textContent = testLine
        
        if (measurer.scrollWidth > viewportWidth && currentLine) {
          // Line break needed
          lines.push({ 
            text: currentLine, 
            height: fontSize * lineHeight 
          })
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      
      if (currentLine) {
        lines.push({ 
          text: currentLine, 
          height: fontSize * lineHeight 
        })
      }
    }
    
    return lines
  } finally {
    document.body.removeChild(measurer)
  }
}

// Calculate line index from scroll position
export const positionToLineIndex = (scrollY, lines) => {
  let accumulatedHeight = 0
  
  for (let i = 0; i < lines.length; i++) {
    accumulatedHeight += lines[i].height
    if (accumulatedHeight > scrollY) {
      return i
    }
  }
  
  return Math.max(0, lines.length - 1)
}

// Calculate scroll position from line index
export const lineIndexToPosition = (lineIndex, lines) => {
  let position = 0
  
  for (let i = 0; i < Math.min(lineIndex, lines.length); i++) {
    position += lines[i].height
  }
  
  return position
}

// Calculate fractional line from precise position
export const calculateFractionalLine = (scrollY, lines) => {
  if (!lines.length) return 0
  
  let accumulatedHeight = 0
  
  for (let i = 0; i < lines.length; i++) {
    const lineHeight = lines[i].height
    
    if (scrollY <= accumulatedHeight + lineHeight) {
      const fraction = (scrollY - accumulatedHeight) / lineHeight
      return i + Math.max(0, Math.min(1, fraction))
    }
    
    accumulatedHeight += lineHeight
  }
  
  return lines.length - 1
}

// Smooth interpolation for simulation
export const interpolatePosition = (t0, currentTime, speed, baseLineIndex, lines) => {
  if (!lines.length) return { lineIndex: 0, fractionalLine: 0, scrollY: 0 }
  
  const elapsed = (currentTime - t0) / 1000 // Convert to seconds
  const linesPerSecond = speed / 60 // speed is lines per minute
  const targetFractionalLine = baseLineIndex + (elapsed * linesPerSecond)
  
  const lineIndex = Math.floor(targetFractionalLine)
  const fractionalLine = targetFractionalLine
  const scrollY = lineIndexToPosition(lineIndex, lines) + 
                  ((targetFractionalLine - lineIndex) * (lines[lineIndex]?.height || 0))
  
  return {
    lineIndex: Math.max(0, Math.min(lineIndex, lines.length - 1)),
    fractionalLine: Math.max(0, Math.min(fractionalLine, lines.length - 1)),
    scrollY: Math.max(0, scrollY)
  }
}
