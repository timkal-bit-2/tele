import React, { forwardRef, useEffect } from 'react'

const TeleprompterDisplay = forwardRef(({ 
  text, 
  fontSize = 40, 
  margin = 20, 
  flipHorizontal = false, 
  flipVertical = false 
}, ref) => {
  // Debug: Check if JetBrains Mono is loading
  useEffect(() => {
    const checkFont = async () => {
      try {
        await document.fonts.load('500 40px JetBrains Mono')
        console.log('🎯 JetBrains Mono loaded successfully')
      } catch (error) {
        console.warn('⚠️ JetBrains Mono failed to load:', error)
      }
    }
    checkFont()
  }, [])

  return (
    <div
      ref={ref}
      className="overflow-hidden relative"
      style={{
        // Fixed dimensions for deterministic rendering
        width: '640px',
        height: '480px',
        backgroundColor: '#000000',
        padding: `${margin}px`,
        paddingTop: `${margin * 1.1}px`,
        paddingBottom: `${margin * 1.1}px`,
        transform: `scale(${flipHorizontal ? -1 : 1}, ${flipVertical ? -1 : 1})`,
        transformOrigin: 'center center'
      }}
    >
      <div
        className="leading-relaxed text-white"
        style={{
          // JetBrains Mono - Modern deterministic font rendering
          fontFamily: 'JetBrains Mono, IBM Plex Mono, Consolas, Monaco, "Courier New", monospace',
          fontSize: `${fontSize}px`,
          fontWeight: '600', // Semibold für deutlich sichtbaren Unterschied und bessere Teleprompter-Lesbarkeit
          lineHeight: '1.8',
          letterSpacing: '0',
          fontKerning: 'none',
          fontFeatureSettings: 'normal',
          hyphens: 'none',
          wordBreak: 'normal',
          whiteSpace: 'pre-wrap',
          textRendering: 'geometricPrecision'
        }}
      >
        {/* 5 Leerzeilen vor dem Text */}
        {Array(5).fill(null).map((_, index) => (
          <div key={`before-${index}`} className="mb-2">
            &nbsp;
          </div>
        ))}
        
        {/* Haupttext */}
        {text.split('\n').map((line, index) => (
          <div key={index} className="mb-2">
            {line || '\u00A0'}
          </div>
        ))}
        
        {/* 5 Leerzeilen nach dem Text */}
        {Array(5).fill(null).map((_, index) => (
          <div key={`after-${index}`} className="mb-2">
            &nbsp;
          </div>
        ))}
      </div>
    </div>
  )
})

TeleprompterDisplay.displayName = 'TeleprompterDisplay'

export default TeleprompterDisplay
