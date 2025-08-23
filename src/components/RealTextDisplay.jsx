import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { sanitizeText } from '../utils/textSanitization'

/**
 * RealTextDisplay - Pure flow text component
 * 
 * Renders text as natural flowing paragraphs without synthetic line breaks.
 * Uses precise typography settings for consistent cross-device rendering.
 * 
 * No Grid, no per-line styling, no artificial line heights.
 * Just real text that the browser renders naturally.
 */
const RealTextDisplay = forwardRef(({
  content = '',
  layoutSettings = {},
  className = '',
  showLineNumbers = false,
  lineNumberGutterWidth = 4, // in ch units
  onTextReady = null,
  style = {}
}, ref) => {

  console.log('RealTextDisplay received content:', content)

  const {
    fontSize = 24,
    lineHeightUnitless = 1.4,
    fontFamily = 'system-ui, sans-serif',
    fontWeight = 400,
    letterSpacing = 0,
    margins = 20
  } = layoutSettings

  // Sanitize content
  const sanitizedText = sanitizeText(content)

  // Precise typography CSS for consistent rendering
  const typographyStyle = {
    // Core typography - must be identical across Input/Output
    fontFamily: fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: lineHeightUnitless, // Unitless for consistency
    fontWeight: fontWeight,
    letterSpacing: `${letterSpacing}px`,
    
    // Text behavior
    whiteSpace: 'pre-wrap',       // Preserve line breaks and spaces
    wordWrap: 'break-word',       // Allow long words to break
    hyphens: 'none',              // No automatic hyphenation
    textAlign: 'left',            // Consistent alignment
    
    // Disable browser features that affect layout
    textDecoration: 'none',
    textTransform: 'none',
    fontVariantLigatures: 'none', // Disable ligatures for consistency
    fontFeatureSettings: 'normal',
    
    // Layout
    margin: 0,
    padding: `${margins}px`,
    width: '100%',
    boxSizing: 'border-box',
    
    // Disable user interactions that affect measurement
    userSelect: 'none',
    pointerEvents: 'none',
    
    // Disable visual effects
    textShadow: 'none',
    filter: 'none',
    transform: 'none', // No scale transforms!
    
    // Override any inherited styles
    color: 'inherit',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    
    ...style
  }

  // Line number gutter style
  const gutterStyle = {
    fontFamily: fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: lineHeightUnitless,
    fontWeight: fontWeight,
    fontVariantNumeric: 'tabular-nums', // Monospace numbers
    textAlign: 'right',
    width: `${lineNumberGutterWidth}ch`,
    flexShrink: 0,
    padding: `${margins}px 8px ${margins}px ${margins}px`,
    color: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'transparent',
    userSelect: 'none',
    pointerEvents: 'none'
  }

  // Container style for two-column layout (if line numbers enabled)
  const containerStyle = showLineNumbers ? {
    display: 'flex',
    width: '100%',
    alignItems: 'flex-start'
  } : {}

  // Expose measurement methods to parent
  useImperativeHandle(ref, () => ({
    measureLines: () => {
      // This would be called by the measurement hook
      return []
    },
    getElement: () => ref.current,
    scrollToLine: (lineIndex) => {
      // Placeholder for scroll functionality
      console.log('Scroll to line:', lineIndex)
    }
  }), [])

  // Notify parent when text is ready for measurement
  useEffect(() => {
    if (onTextReady && sanitizedText) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        onTextReady()
      }, 10)
    }
  }, [sanitizedText, onTextReady])

  if (showLineNumbers) {
    // Two-column layout with line numbers
    const lineCount = sanitizedText.split('\n').length
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')

    return (
      <div 
        className={className}
        style={containerStyle}
      >
        {/* Line number gutter */}
        <div style={gutterStyle}>
          {lineNumbers}
        </div>
        
        {/* Main text content */}
        <div
          ref={ref}
          style={typographyStyle}
          spellCheck={false}
          suppressContentEditableWarning={true}
        >
          {sanitizedText}
        </div>
      </div>
    )
  }

  // Single column layout without line numbers
  return (
    <div
      ref={ref}
      className={className}
      style={typographyStyle}
      spellCheck={false}
      suppressContentEditableWarning={true}
    >
      {sanitizedText}
    </div>
  )
})

RealTextDisplay.displayName = 'RealTextDisplay'

export default RealTextDisplay
