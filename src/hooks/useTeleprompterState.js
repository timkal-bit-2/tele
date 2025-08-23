import { useState, useCallback, useMemo } from 'react'

// Single Source of Truth für Teleprompter State
export const useTeleprompterState = () => {
  const [docId] = useState(() => `doc_${Date.now()}`)
  const [rawContent, setRawContent] = useState('')
  const [layoutSettings, setLayoutSettings] = useState({
    fontFamily: 'system-ui, sans-serif',
    fontSize: 24,
    lineHeightUnitless: 1.4,
    containerWidth: 800,
    margins: 20,
    hyphens: false,
    whiteSpace: 'pre-wrap'
  })
  
  const [playbackState, setPlaybackState] = useState({
    isScrolling: false,
    speed: 1.5, // Zeilen pro Minute → wird zu Pixel/s
    currentLineIndex: 0
  })

  // Sanitize HTML → Plain Text
  const sanitize = useCallback((html) => {
    if (!html) return ''
    
    // Temporärer DOM für HTML parsing
    const temp = document.createElement('div')
    temp.innerHTML = html
    
    // Extrahiere plain text, preserve paragraph breaks
    const walker = document.createTreeWalker(
      temp,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null,
      false
    )
    
    let result = ''
    let node
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase()
        if (['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
          result += '\n'
        }
      }
    }
    
    return result
      .replace(/\r\n?/g, '\n')           // Normalize line endings
      .replace(/\u00A0/g, ' ')           // Replace &nbsp; with space
      .replace(/[ \t\f\v]+/g, ' ')       // Collapse multiple spaces
      .replace(/\n{3,}/g, '\n\n')        // Max 2 consecutive newlines
      .trim()
  }, [])

  // Memoized plain text
  const plainText = useMemo(() => sanitize(rawContent), [rawContent, sanitize])

  // Update content
  const updateContent = useCallback((content) => {
    setRawContent(content)
  }, [])

  // Update layout settings
  const updateLayoutSettings = useCallback((updates) => {
    setLayoutSettings(prev => ({ ...prev, ...updates }))
  }, [])

  // Update playback state  
  const updatePlaybackState = useCallback((updates) => {
    setPlaybackState(prev => ({ ...prev, ...updates }))
  }, [])

  // Convenience methods
  const play = useCallback(() => updatePlaybackState({ isScrolling: true }), [updatePlaybackState])
  const pause = useCallback(() => updatePlaybackState({ isScrolling: false }), [updatePlaybackState])
  const seekToLine = useCallback((lineIndex) => {
    updatePlaybackState({ currentLineIndex: lineIndex, isScrolling: false })
  }, [updatePlaybackState])

  return {
    // State
    docId,
    rawContent,
    plainText,
    layoutSettings,
    playbackState,
    
    // Actions
    updateContent,
    updateLayoutSettings,
    updatePlaybackState,
    play,
    pause,
    seekToLine,
    
    // Utils
    sanitize
  }
}
