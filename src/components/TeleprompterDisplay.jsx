import React, { forwardRef, useEffect } from 'react'

// Smart size presets with auto-detection
const sizePresets = {
  'small': { width: 640, height: 480 },      // Desktop/Mobile
  'medium': { width: 960, height: 720 },     // Standard iPad
  'large': { width: 1280, height: 960 },     // Large iPad
  'xlarge': { width: 1600, height: 1200 },   // Pro iPad
}

const getRecommendedSize = () => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  
  if (vw >= 2000) return 'xlarge'        // Große iPads
  if (vw >= 1500) return 'large'         // Standard iPads Pro
  if (vw >= 1000) return 'medium'        // Standard iPads
  return 'small'                         // Desktop/Fallback
}

const calculateDimensions = (sizePreset) => {
  if (sizePreset === 'auto') {
    return sizePresets[getRecommendedSize()]
  }
  return sizePresets[sizePreset] || sizePresets['small']
}

const TeleprompterDisplay = forwardRef(({ 
  text, 
  fontSize = 40, 
  margin = 20, 
  flipHorizontal = false, 
  flipVertical = false,
  sizePreset = 'small'
}, ref) => {
  const dimensions = calculateDimensions(sizePreset)
  
  // Debug: Check if JetBrains Mono is loading
  useEffect(() => {
    const checkFont = async () => {
      try {
        await document.fonts.load('500 40px JetBrains Mono')
        console.log('🎯 JetBrains Mono loaded successfully')
        console.log('📐 Display dimensions:', dimensions)
      } catch (error) {
        console.warn('⚠️ JetBrains Mono failed to load:', error)
      }
    }
    checkFont()
  }, [dimensions])

  return (
    <div
      ref={ref}
      className="overflow-hidden relative"
      style={{
        // Dynamic dimensions based on size preset
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
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

// Export utility functions for other components
export { sizePresets, getRecommendedSize, calculateDimensions }
export default TeleprompterDisplay
