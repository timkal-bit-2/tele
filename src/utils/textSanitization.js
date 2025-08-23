/**
 * Text Sanitization for Teleprompter
 * 
 * Converts HTML to plain text, normalizes whitespace and line breaks
 * according to teleprompter requirements
 */

/**
 * Sanitize text content for teleprompter display
 * @param {string} rawContent - Raw input content (HTML or plain text)
 * @returns {string} - Sanitized plain text
 */
export const sanitizeText = (rawContent) => {
  if (!rawContent || typeof rawContent !== 'string') {
    return ''
  }

  let text = rawContent

  // 1. Convert HTML to plain text (without adding spaces around tags)
  if (text.includes('<')) {
    // Create temporary DOM element for parsing
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = text
    
    // Extract text content without extra spaces
    text = tempDiv.textContent || tempDiv.innerText || ''
  }

  // 2. Convert HTML entities to normal characters
  text = text
    .replace(/&nbsp;/g, ' ')         // Non-breaking space to normal space
    .replace(/&amp;/g, '&')         // Ampersand
    .replace(/&lt;/g, '<')          // Less than
    .replace(/&gt;/g, '>')          // Greater than
    .replace(/&quot;/g, '"')        // Quote
    .replace(/&#39;/g, "'")         // Apostrophe
    .replace(/&apos;/g, "'")        // Apostrophe (alternative)

  // 3. Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // 4. Handle excessive line breaks (limit to max 2 consecutive)
  text = text.replace(/\n{3,}/g, '\n\n')

  // 5. Preserve paragraph separations (empty lines between paragraphs)
  // Don't trim leading/trailing whitespace yet to preserve intentional spacing

  // 6. Normalize spaces (but preserve intentional multiple spaces)
  // Only collapse spaces that are clearly unintentional (more than 3 consecutive)
  text = text.replace(/ {4,}/g, '   ') // Max 3 consecutive spaces

  // 7. Clean up but preserve paragraph structure
  const lines = text.split('\n')
  const cleanedLines = lines.map(line => {
    // Trim each line but preserve empty lines for paragraph separation
    return line.trim()
  })

  // Rejoin and do final cleanup
  text = cleanedLines.join('\n')

  // Remove leading/trailing whitespace from entire text
  text = text.trim()

  return text
}

/**
 * Check if two texts are substantially the same after sanitization
 * @param {string} text1 
 * @param {string} text2 
 * @returns {boolean}
 */
export const areTextsEquivalent = (text1, text2) => {
  return sanitizeText(text1) === sanitizeText(text2)
}

/**
 * Count lines in sanitized text
 * @param {string} text 
 * @returns {number}
 */
export const countLines = (text) => {
  const sanitized = sanitizeText(text)
  if (!sanitized) return 0
  return sanitized.split('\n').length
}

/**
 * Split text into paragraphs (separated by empty lines)
 * @param {string} text 
 * @returns {string[]}
 */
export const splitIntoParagraphs = (text) => {
  const sanitized = sanitizeText(text)
  if (!sanitized) return []
  
  // Split by double newlines (empty line separation)
  return sanitized.split('\n\n').filter(paragraph => paragraph.trim())
}

/**
 * Get text statistics for debugging
 * @param {string} text 
 * @returns {object}
 */
export const getTextStats = (text) => {
  const sanitized = sanitizeText(text)
  const lines = sanitized.split('\n')
  const paragraphs = splitIntoParagraphs(sanitized)
  
  return {
    originalLength: text?.length || 0,
    sanitizedLength: sanitized.length,
    lineCount: lines.length,
    paragraphCount: paragraphs.length,
    emptyLines: lines.filter(line => !line.trim()).length,
    averageLineLength: lines.length > 0 ? sanitized.length / lines.length : 0,
    hasHtml: text?.includes('<') || false
  }
}
