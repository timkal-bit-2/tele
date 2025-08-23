import { useRef, useEffect, useState } from 'react'

// Kombinierte Vorschau mit exakter DOM-basierter Zeilenmessung + Maus / Touch / Scrollbar Steuerung
const CombinedPreviewTeleprompter = ({ content, settings, currentLine, onCurrentLineChange }) => {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [lines, setLines] = useState([])

  // Resize observer
  useEffect(() => {
    const update = () => { if (containerRef.current) setContainerWidth(containerRef.current.clientWidth) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Sanitize + Wrap identisch zum Output
  const sanitize = (html) => html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
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

  // Konstanten
  const highlightIndex = 2
  const [measuredRow, setMeasuredRow] = useState(null)
  useEffect(() => {
    if (!containerRef.current) return
    const row = containerRef.current.querySelector('.tele-line-row')
    if (row) {
      const h = row.getBoundingClientRect().height
      if (h && h > 0) setMeasuredRow(h)
    }
  }, [lines, settings.fontSize, settings.lineHeight])
  const fallbackRow = settings.fontSize * settings.lineHeight + 16
  const lineBlockHeight = measuredRow || fallbackRow
  const translateY = Math.round(-(currentLine - highlightIndex) * lineBlockHeight)

  // Wheel Scroll -> Linien bewegen (intuitive Steps ab halber Zeilenhöhe)
  const wheelAccumRef = useRef(0)
  const handleWheel = (e) => {
    e.preventDefault()
    wheelAccumRef.current += e.deltaY
    const threshold = lineBlockHeight / 2
    if (Math.abs(wheelAccumRef.current) >= threshold) {
      const steps = Math.trunc(wheelAccumRef.current / threshold)
      wheelAccumRef.current -= steps * threshold
      stepLines(steps)
    }
  }

  const stepLines = (delta) => {
    if (!lines.length) return
    const next = Math.min(lines.length - 1, Math.max(0, currentLine + delta))
    if (next !== currentLine) onCurrentLineChange(next)
  }

  // Click auf bestimmte Linie -> reposition
  const handleClick = (idx) => {
    onCurrentLineChange(Math.min(lines.length - 1, Math.max(0, idx)))
  }

  // Touch / Pointer Drag (vertikal) für mobile Geräte
  const dragStateRef = useRef(null)
  const startDrag = (clientY) => {
    dragStateRef.current = { startY: clientY, startLine: currentLine, accum: 0 }
  }
  const moveDrag = (clientY) => {
    if (!dragStateRef.current) return
    const dy = clientY - dragStateRef.current.startY
    dragStateRef.current.accum = dy
    const threshold = lineBlockHeight / 2
    if (Math.abs(dragStateRef.current.accum) >= threshold) {
      const steps = Math.trunc(dragStateRef.current.accum / threshold)
      dragStateRef.current.accum -= steps * threshold
      stepLines(steps)
    }
  }
  const endDrag = () => { dragStateRef.current = null }

  // Pointer Events
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onPointerDown = (e) => { if (e.button !== 0) return; startDrag(e.clientY) }
    const onPointerMove = (e) => moveDrag(e.clientY)
    const onPointerUp = () => endDrag()
    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [lineBlockHeight, lines.length, currentLine])

  // Custom Scrollbar (rechts) für direkte Positionswahl
  const trackRef = useRef(null)
  const draggingScrollbarRef = useRef(null)
  const totalLines = Math.max(1, lines.length - 1)
  const percent = (currentLine / totalLines) * 100

  const setLineByPercent = (p) => {
    const clamped = Math.min(100, Math.max(0, p))
    const target = Math.round((clamped / 100) * totalLines)
    if (target !== currentLine) onCurrentLineChange(target)
  }

  const handleScrollbarPointerDown = (e) => {
    e.stopPropagation()
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const y = e.clientY - rect.top
    const p = (y / rect.height) * 100
    setLineByPercent(p)
    draggingScrollbarRef.current = { rect }
  }
  const handleGlobalPointerMove = (e) => {
    if (!draggingScrollbarRef.current) return
    const { rect } = draggingScrollbarRef.current
    const y = e.clientY - rect.top
    setLineByPercent((y / rect.height) * 100)
  }
  const handleGlobalPointerUp = () => { draggingScrollbarRef.current = null }
  useEffect(() => {
    window.addEventListener('pointermove', handleGlobalPointerMove)
    window.addEventListener('pointerup', handleGlobalPointerUp)
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove)
      window.removeEventListener('pointerup', handleGlobalPointerUp)
    }
  })

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
  className="w-full h-full relative overflow-hidden select-none bg-black text-white font-teleprompter"
      style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
        padding: `${settings.margin}px`,
        cursor: 'ns-resize',
        touchAction: 'none',
        userSelect: 'none'
        // Keine Spiegelung im Input Preview (bewusst deaktiviert)
      }}
  spellCheck={false}
    >
      {/* Bewegte Zeilen */}
      <div
        className="absolute left-0 top-1/2 w-full"
        style={{
          transform: `translate3d(0, ${translateY}px, 0) translateY(-50%)`,
          willChange: 'transform',
          transition: 'transform 0.08s linear'
        }}
      >
        {lines.map((text, idx) => {
          const logicalNumber = idx + 1 - 4 <= 0 ? '' : (idx + 1 - 4)
          const highlighted = idx === currentLine
          return (
            <div
              key={idx}
              onClick={() => handleClick(idx)}
              className={`tele-line-row grid grid-cols-[4ch_1fr] gap-4 items-center py-2 px-4 ${highlighted ? 'relative' : ''}`}
              style={{ height: `${lineBlockHeight}px`, fontVariantNumeric: 'tabular-nums' }}
            >
              <span
                className="text-sm font-mono text-right select-none"
                style={{ color: `rgba(156,163,175,${(settings.lineNumberOpacity ?? 60)/100})` }}
              >{logicalNumber}</span>
              <span className={highlighted ? 'text-white' : 'text-gray-300'}>{text}</span>
            </div>
          )
        })}
      </div>
      {/* Highlight Box (3. Zeile) */}
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
      {/* Info Overlay */}
      <div className="absolute bottom-2 right-10 text-xs text-gray-400 bg-black/60 px-2 py-1 rounded">
        Zeile {Math.max(0, currentLine - 3) + 1}/{Math.max(0, lines.length - 4)}
      </div>
      {/* Remote Navigation Panel */}
      <RemoteNavigator
        totalLines={lines.length}
        currentLine={currentLine}
        onStep={(d)=>stepLines(d)}
        onJumpTop={()=>onCurrentLineChange(0)}
        onJumpBottom={()=>onCurrentLineChange(Math.max(0, lines.length-1))}
      />
      {/* Custom Scrollbar */}
      <div className="absolute top-2 right-2 bottom-2 w-4 flex justify-center">
        <div
          ref={trackRef}
            className="w-1 bg-gray-700/60 rounded relative cursor-pointer group"
            onPointerDown={handleScrollbarPointerDown}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 w-3 h-5 bg-blue-500 rounded opacity-80 group-hover:opacity-100 cursor-grab active:cursor-grabbing shadow"
            style={{ top: `${percent}%`, transform: 'translate(-50%, -50%)' }}
            onPointerDown={handleScrollbarPointerDown}
          />
        </div>
      </div>
    </div>
  )
}

export default CombinedPreviewTeleprompter

// --- Remote Navigator Subcomponent ---
const RemoteNavigator = ({ totalLines, currentLine, onStep, onJumpTop, onJumpBottom }) => {
  const holdRef = useRef(null)
  const directionRef = useRef(0)

  const startHold = (dir) => {
    directionRef.current = dir
    onStep(dir)
    const repeat = () => {
      onStep(directionRef.current)
      holdRef.current = setTimeout(repeat, 120)
    }
    holdRef.current = setTimeout(repeat, 300)
  }
  const endHold = () => {
    if (holdRef.current) clearTimeout(holdRef.current)
    holdRef.current = null
    directionRef.current = 0
  }
  useEffect(()=>endHold,[])

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-2 flex items-center space-x-2 bg-black/60 rounded px-3 py-2 text-sm backdrop-blur-sm border border-white/10">
      <button
        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={onJumpTop}
        title="Ganz nach oben"
  >⏫</button>
      <button
        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        onMouseDown={()=>startHold(-1)}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={(e)=>{e.preventDefault(); startHold(-1)}}
        onTouchEnd={endHold}
        title="Zeile zurück"
  >⬆️</button>
      <div className="px-2 text-xs text-gray-300 font-mono">{currentLine}</div>
      <button
        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        onMouseDown={()=>startHold(1)}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={(e)=>{e.preventDefault(); startHold(1)}}
        onTouchEnd={endHold}
        title="Zeile vor"
  >⬇️</button>
      <button
        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={onJumpBottom}
        title="Ganz nach unten"
  >⏬</button>
    </div>
  )
}
