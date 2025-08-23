import { useRef, useEffect } from 'react'

const TextEditor = ({ content, onContentChange, settings, scrollPosition, onScrollPositionChange, currentLine = 0, onCurrentLineChange }) => {
  const editorRef = useRef(null)
  const scrollUpdateTimeoutRef = useRef(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content
    }
  }, [content])

  const handleInput = () => {
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML)
    }
  }

  const handleScroll = () => {
    if (!editorRef.current || !onScrollPositionChange) return
    
    // Clear previous timeout
    if (scrollUpdateTimeoutRef.current) {
      clearTimeout(scrollUpdateTimeoutRef.current)
    }
    
    // Debounce scroll updates
    scrollUpdateTimeoutRef.current = setTimeout(() => {
      const element = editorRef.current
      const scrollTop = element.scrollTop
      const scrollHeight = element.scrollHeight
      const clientHeight = element.clientHeight
      const maxScroll = scrollHeight - clientHeight
      
      if (maxScroll > 0) {
        const percentage = (scrollTop / maxScroll) * 100
        onScrollPositionChange(Math.min(100, Math.max(0, percentage)))
      } else {
        onScrollPositionChange(0)
      }
    }, 100)
  }

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value)
    editorRef.current.focus()
    handleInput()
  }

  const handleKeyDown = (e) => {
    // Allow basic shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          formatText('bold')
          break
        case 'i':
          e.preventDefault()
          formatText('italic')
          break
        case 'u':
          e.preventDefault()
          formatText('underline')
          break
      }
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollUpdateTimeoutRef.current) {
        clearTimeout(scrollUpdateTimeoutRef.current)
      }
    }
  }, [])

  return (
  <div className="h-full flex flex-col bg-gray-900 border border-gray-700 rounded">
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 p-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => formatText('bold')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold transition-colors"
            title="Fett (Ctrl+B)"
          >
            B
          </button>
          <button
            onClick={() => formatText('italic')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm italic transition-colors"
            title="Kursiv (Ctrl+I)"
          >
            I
          </button>
          <button
            onClick={() => formatText('underline')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm underline transition-colors"
            title="Unterstrichen (Ctrl+U)"
          >
            U
          </button>
          
          <div className="w-px h-6 bg-gray-600 mx-2"></div>
          
          <select
            onChange={(e) => formatText('fontSize', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
            defaultValue="3"
          >
            <option value="1">Klein</option>
            <option value="2">Klein-Mittel</option>
            <option value="3">Normal</option>
            <option value="4">Mittel-Groß</option>
            <option value="5">Groß</option>
            <option value="6">Sehr groß</option>
            <option value="7">Extra groß</option>
          </select>

          <div className="w-px h-6 bg-gray-600 mx-2"></div>

          <button
            onClick={() => formatText('removeFormat')}
            className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-sm transition-colors"
            title="Formatierung entfernen"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Editor */}
  <div className="flex-1 p-4 overflow-auto relative" id="editor-scroll-container">
        <div className="absolute inset-0 pointer-events-none select-none text-right pr-2" aria-hidden="true" style={{fontSize: `${settings.fontSize * 0.55}px`, lineHeight: settings.lineHeight}}>
          {/* Dynamic line numbers best-effort by rough split */}
          {(() => {
            const raw = (editorRef.current?.innerText || '').split(/\n+/)
            const arr = ['', '', '', '', ...raw] // 4 empty pre-roll
            const opacity = (settings.lineNumberOpacity ?? 60)/100
            return arr.map((_, i) => (
              <div key={i} style={{opacity, color: '#6b7280'}}>{i < 4 ? '' : i - 3}</div>
            ))
          })()}
        </div>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          className="w-full h-full bg-gray-900 text-white font-teleprompter outline-none pl-12"
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            minHeight: '100%'
          }}
          placeholder="Beginne hier mit deinem Teleprompter-Text..."
          suppressContentEditableWarning={true}
        />
      </div>
    </div>
  )
}

export default TextEditor
