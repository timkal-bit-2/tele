import { useState, useEffect, useRef } from 'react'

const LineBasedTeleprompter = ({ content, settings, isScrolling, currentLine, fractionalLine, onLineChange, onLinesCountChange }) => {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)
  
  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }
    
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Lines State
  const [lines, setLines] = useState([])

  // Sanitize + echte Wrap-Ermittlung
  const sanitize = (html) => html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ') // Mehrfach-Spaces
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  useEffect(() => {
    if (!content || !containerWidth) return
    const plain = sanitize(content)
    const paragraphs = plain.split('\n')
    const temp = document.createElement('div')
    temp.style.position = 'absolute'
    temp.style.visibility = 'hidden'
    temp.style.pointerEvents = 'none'
    temp.style.width = (containerWidth - settings.margin * 2) + 'px'
    temp.style.fontSize = settings.fontSize + 'px'
    temp.style.lineHeight = settings.lineHeight
    temp.style.fontFamily = 'inherit'
    temp.style.whiteSpace = 'normal'
    temp.style.wordBreak = 'normal'
    temp.style.hyphens = 'none'
    document.body.appendChild(temp)
    const out = []
    paragraphs.forEach((para, pi) => {
      const clean = para.trim()
      if (clean === '') { out.push(''); return }
      const words = clean.split(/\s+/)
      let currentLineTop = null
      let currentWords = []
      words.forEach((w, i) => {
        const span = document.createElement('span')
        span.textContent = (i === 0 ? '' : ' ') + w
        temp.appendChild(span)
        const top = span.offsetTop
        if (currentLineTop === null) currentLineTop = top
        if (top !== currentLineTop) {
          out.push(currentWords.join(' ').trim())
          currentWords = [w]
          currentLineTop = top
        } else {
          currentWords.push(w)
        }
      })
      if (currentWords.length) out.push(currentWords.join(' ').trim())
      if (pi < paragraphs.length - 1) out.push('')
    })
    document.body.removeChild(temp)
    const normalized = []
    let emptyRun = 0
    for (const l of out) {
      if (l === '') { emptyRun++; if (emptyRun <= 2) normalized.push(l) } else { emptyRun = 0; normalized.push(l) }
    }
    setLines(['', '', '', '', ...normalized])
  }, [content, containerWidth, settings.fontSize, settings.lineHeight, settings.margin])

  // Notify parent about line count
  useEffect(() => {
    if (onLinesCountChange) {
      onLinesCountChange(lines.length)
    }
  }, [lines, onLinesCountChange])

  // Reale Zeilenhöhe messen (1. Zeile) für exakte Translation
  const [measuredRow, setMeasuredRow] = useState(null)
  useEffect(() => {
    if (!containerRef.current) return
    const row = containerRef.current.querySelector('.tele-line-row')
    if (row) {
      const h = row.getBoundingClientRect().height
      if (h && h > 0) setMeasuredRow(h)
    }
  }, [lines, settings.fontSize, settings.lineHeight])
  const defaultRow = settings.fontSize * settings.lineHeight + 16
  const lineBlockHeight = measuredRow || defaultRow

  const highlightIndex = 2 // 3rd line stays centered
  const effectiveFractional = fractionalLine !== undefined ? fractionalLine : currentLine
  // Translate all lines so that the fractional line aligns to highlightIndex
  const translateY = Math.round(-(effectiveFractional - highlightIndex) * lineBlockHeight)

  return (
    <div 
      ref={containerRef}
      className="h-full w-full bg-black text-white font-teleprompter overflow-hidden"
      style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
        padding: `${settings.margin}px`,
        transform: `scaleX(${settings.mirrorHorizontal ? -1 : 1}) scaleY(${settings.mirrorVertical ? -1 : 1})`
      }}
      spellCheck={false}
    >
      <div className="h-full relative overflow-hidden">
        {/* Moving lines container */}
        <div
          className="absolute left-0 top-1/2 w-full"
          style={{
            transform: `translate3d(0, ${translateY}px, 0) translateY(-50%)`,
            willChange: 'transform',
            transition: isScrolling ? 'transform 0.05s linear' : 'transform 0.22s ease-out'
          }}
        >
          {lines.map((text, idx) => {
            const isHighlighted = Math.floor(effectiveFractional) === idx
            const logicalNumber = idx + 1 - 4 <= 0 ? '' : (idx + 1 - 4)
            return (
              <div
                key={idx}
                className={`tele-line-row grid grid-cols-[4ch_1fr] gap-4 items-center py-2 px-4 ${isHighlighted ? '' : ''}`}
                style={{ height: `${lineBlockHeight}px`, fontVariantNumeric: 'tabular-nums' }}
              >
                <span
                  className="text-sm font-mono text-right select-none"
                  style={{ color: `rgba(156,163,175,${(settings.lineNumberOpacity ?? 60)/100})` }}
                >{logicalNumber}</span>
                <span className={isHighlighted ? 'text-white' : 'text-gray-300'}>{text}</span>
              </div>
            )
          })}
        </div>

        {/* Highlight overlay box (3rd line position) */}
        <div
          className="pointer-events-none absolute left-0 w-full flex justify-center"
          style={{
            top: `${(highlightIndex + 0.5) * lineBlockHeight}px`,
            height: `${lineBlockHeight}px`,
            marginTop: '-50%'
          }}
        >
          <div className="w-[96%] h-full border border-blue-400/60 rounded bg-blue-500/10" />
        </div>
      </div>
    </div>
  )
}

export default LineBasedTeleprompter
