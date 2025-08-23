import { useRef, useEffect, useState, useMemo } from 'react'

const InputLineView = ({ content, settings, currentLine, onCurrentLineChange }) => {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    const resize = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const lines = useMemo(() => {
    if (!content || !width) return []
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const charWidth = settings.fontSize * 0.6
    const availableWidth = width - (settings.margin * 2)
    const charsPerLine = Math.max(10, Math.floor(availableWidth / charWidth))
    const words = textContent.split(' ')
    const arr = ['', '', '', '',] // initial 4 blank
    let line = ''
    for (const w of words) {
      const test = line ? line + ' ' + w : w
      if (test.length <= charsPerLine) line = test
      else { if (line) arr.push(line); line = w }
    }
    if (line) arr.push(line)
    return arr
  }, [content, width, settings.fontSize, settings.margin])

  const lineHeightPx = settings.fontSize * settings.lineHeight + 8
  const visibleLinesCount = 20

  useEffect(() => {
    if (!containerRef.current) return
    const handler = () => setScrollTop(containerRef.current.scrollTop)
    containerRef.current.addEventListener('scroll', handler)
    return () => containerRef.current?.removeEventListener('scroll', handler)
  }, [])

  // Compute top visible line index
  const topVisible = Math.floor(scrollTop / lineHeightPx)
  const highlightVisible = topVisible + 2 // dritte Zeile

  useEffect(() => {
    onCurrentLineChange && onCurrentLineChange(highlightVisible)
  }, [highlightVisible, onCurrentLineChange])

  return (
    <div className="h-full flex flex-col border-t border-gray-700">
      <div className="flex-shrink-0 text-xs px-4 py-1 text-gray-400 bg-gray-800">Zeilenansicht</div>
      <div ref={containerRef} className="flex-1 overflow-auto custom-scrollbar bg-black" style={{scrollbarWidth:'thin'}}>
        <div style={{padding: settings.margin}}>
          {lines.map((l, idx) => {
            const displayNumber = idx + 1 - 4 <= 0 ? '' : (idx + 1 - 4)
            const highlighted = idx === highlightVisible
            return (
              <div key={idx} className={`flex items-start py-1 px-2 rounded ${highlighted ? 'bg-blue-600/30' : ''}`}
                style={{minHeight: lineHeightPx}}>
                <span style={{
                  color: `rgba(156,163,175,${(settings.lineNumberOpacity ?? 60)/100})`
                }} className="text-sm font-mono w-12 select-none text-right pr-2">{displayNumber}</span>
                <span className="text-sm text-gray-200 whitespace-pre-wrap">{l}</span>
              </div>
            )
          })}
          <div style={{height: lineHeightPx * 4}} />
        </div>
      </div>
    </div>
  )
}

export default InputLineView
