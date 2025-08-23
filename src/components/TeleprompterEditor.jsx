import { useState, useCallback } from 'react'

const TeleprompterEditor = ({ 
  rawContent, 
  onContentChange, 
  layoutSettings,
  className = "",
  style = {} 
}) => {
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = useCallback((e) => {
    console.log('Editor change:', e.target.value)
    onContentChange?.(e.target.value)
  }, [onContentChange])

  const containerStyle = {
    // Fixed editor settings for optimal editing experience
    fontSize: '16px',
    lineHeight: 1.5,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '200px',
    transform: 'none !important',
    direction: 'ltr !important',
    textAlign: 'left !important',
    // Ignore layoutSettings for editor
    ...style
  }

  return (
    <div className={`relative ${className}`}>
      {/* Simple textarea for debugging */}
      <textarea
        value={rawContent.replace(/<[^>]*>/g, '')} // Strip HTML tags
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        dir="ltr"
        className={`
          w-full p-4 border rounded-lg outline-none resize-none
          bg-gray-50 border-gray-300 text-gray-900
          focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200
          ${isFocused ? 'shadow-lg' : 'shadow-sm'}
        `}
        style={{
          ...containerStyle,
          transform: 'none',
          direction: 'ltr',
          textAlign: 'left',
          unicodeBidi: 'normal',
          minHeight: '300px'
        }}
        spellCheck={true}
        placeholder="Text hier eingeben..."
      />
      
      {/* Helper text */}
      <div className="mt-2 text-sm text-gray-500">
        Text Editor für die Regie - Einstellungen werden nur auf die Vorschau angewendet
      </div>
      
      {/* Character count */}
      <div className="mt-1 text-xs text-gray-400">
        {rawContent.replace(/<[^>]*>/g, '').length} Zeichen
      </div>
    </div>
  )
}

export default TeleprompterEditor
