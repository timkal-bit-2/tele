/**
 * iPad Authoritative Scroll Engine
 * Single source of truth for all scrolling
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { STATES, CONFIG, MESSAGE_TYPES } from '../types/teleprompterProtocol.js'
import { calculateLines, interpolatePosition, calculateFractionalLine } from '../utils/lineCalculator.js'

// Add missing import fix
const calculateLinesInternal = (content, params) => {
  // Simple line calculation for now - can be optimized later
  const lines = content.split('\n').map((text, index) => ({
    text: text.trim(),
    height: params.fontSize * params.lineHeight
  }))
  return lines
}

export const useIpadScrollEngine = (teleprompterClient) => {
  const [engineState, setEngineState] = useState(STATES.IDLE)
  const [currentParams, setCurrentParams] = useState({
    speed: 60, // lines per minute
    lineHeight: 1.4,
    fontSize: 48,
    mirror: { horizontal: false, vertical: false },
    margins: 20
  })
  const [lines, setLines] = useState([])
  const [scriptVersion, setScriptVersion] = useState(1)
  const [textHash, setTextHash] = useState('')
  
  // Engine state
  const rafRef = useRef(null)
  const playStartTime = useRef(null)
  const baseLineIndex = useRef(0)
  const baseFractionalLine = useRef(0)
  const currentScrollY = useRef(0)
  const lastKeyframeTime = useRef(0)
  const keyframeInterval = useRef(CONFIG.KEYFRAME_INTERVAL_NORMAL)
  
  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 60,
    frameDrops: 0,
    lastKeyframeAge: 0
  })
  
  const frameCount = useRef(0)
  const lastFpsCheck = useRef(performance.now())
  
  // Load script and calculate lines
  const loadScript = useCallback((content, version, hash) => {
    console.log('🎬 Loading script, version:', version)
    
    const calculatedLines = calculateLinesInternal(content, {
      fontSize: currentParams.fontSize,
      lineHeight: currentParams.lineHeight,
      viewportWidth: window.innerWidth * 0.8 // Estimate iPad viewport
    })
    
    setLines(calculatedLines)
    setScriptVersion(version)
    setTextHash(hash)
    setEngineState(STATES.LOADED)
    
    // Reset position
    baseLineIndex.current = 0
    baseFractionalLine.current = 0
    currentScrollY.current = 0
    
    console.log(`📄 Script loaded: ${calculatedLines.length} lines`)
  }, [currentParams.fontSize, currentParams.lineHeight])
  
  // Update parameters and recalculate if needed
  const updateParams = useCallback((newParams) => {
    const oldParams = currentParams
    const merged = { ...currentParams, ...newParams }
    setCurrentParams(merged)
    
    // If font/layout params changed, recalculate lines
    if (newParams.fontSize !== oldParams.fontSize || 
        newParams.lineHeight !== oldParams.lineHeight) {
      if (lines.length > 0) {
        const recalculatedLines = calculateLinesInternal(
          lines.map(l => l.text).join('\n'), 
          merged
        )
        setLines(recalculatedLines)
        console.log('🔄 Recalculated lines due to param change')
      }
    }
    
    setEngineState(STATES.READY)
    
    // Send immediate keyframe after param change
    sendKeyframe('PARAM_CHANGE')
  }, [currentParams, lines])
  
  // Calculate current position based on time
  const getCurrentPosition = useCallback(() => {
    if (engineState !== STATES.PLAYING || !playStartTime.current) {
      return {
        lineIndex: Math.floor(baseFractionalLine.current),
        fractionalLine: baseFractionalLine.current,
        scrollY: currentScrollY.current
      }
    }
    
    const elapsed = performance.now() - playStartTime.current
    const linesPerSecond = currentParams.speed / 60
    const targetFractionalLine = baseLineIndex.current + (elapsed / 1000 * linesPerSecond)
    
    const lineIndex = Math.floor(targetFractionalLine)
    const fractionalLine = Math.max(0, Math.min(targetFractionalLine, lines.length - 1))
    
    // Calculate scroll position
    let scrollY = 0
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      scrollY += lines[i].height || (currentParams.fontSize * currentParams.lineHeight)
    }
    
    // Add fractional part
    if (lineIndex < lines.length) {
      const lineHeight = lines[lineIndex]?.height || (currentParams.fontSize * currentParams.lineHeight)
      scrollY += (fractionalLine - lineIndex) * lineHeight
    }
    
    currentScrollY.current = scrollY
    
    return { lineIndex, fractionalLine, scrollY }
  }, [engineState, currentParams, lines, baseLineIndex])
  
  // Send keyframe to laptop
  const sendKeyframe = useCallback((reason = 'PERIODIC') => {
    const position = getCurrentPosition()
    const now = performance.now()
    
    teleprompterClient.sendKeyframe(
      position.lineIndex,
      position.fractionalLine,
      now + teleprompterClient.clockOffset,
      currentParams
    )
    
    lastKeyframeTime.current = now
    console.log(`📡 Keyframe sent (${reason}):`, position.lineIndex, position.fractionalLine)
  }, [getCurrentPosition, teleprompterClient, currentParams])
  
  // Main RAF loop - only runs on iPad
  const rafLoop = useCallback(() => {
    if (engineState !== STATES.PLAYING) return
    
    frameCount.current++
    const now = performance.now()
    
    // FPS monitoring
    if (now - lastFpsCheck.current > 1000) {
      const fps = frameCount.current
      setPerformanceMetrics(prev => ({
        ...prev,
        fps,
        frameDrops: fps < 50 ? prev.frameDrops + 1 : prev.frameDrops,
        lastKeyframeAge: now - lastKeyframeTime.current
      }))
      frameCount.current = 0
      lastFpsCheck.current = now
    }
    
    // Get current position
    const position = getCurrentPosition()
    
    // Check if we need to send keyframe
    const timeSinceLastKF = now - lastKeyframeTime.current
    const shouldSendKF = timeSinceLastKF > keyframeInterval.current
    
    if (shouldSendKF) {
      sendKeyframe('PERIODIC')
    }
    
    // Continue loop
    rafRef.current = requestAnimationFrame(rafLoop)
  }, [engineState, getCurrentPosition, sendKeyframe])
  
  // Start playing
  const play = useCallback((t0) => {
    console.log('▶️ Play command received, t0:', t0)
    
    if (engineState !== STATES.READY && engineState !== STATES.PAUSED) {
      console.warn('Cannot play in state:', engineState)
      return false
    }
    
    // Sync to network time
    const networkTime = t0 - teleprompterClient.clockOffset
    const localTime = performance.now()
    
    if (networkTime > localTime) {
      // Future start - wait
      const delay = networkTime - localTime
      console.log(`⏱️ Delayed start in ${delay}ms`)
      setTimeout(() => {
        playStartTime.current = networkTime
        setEngineState(STATES.PLAYING)
        rafRef.current = requestAnimationFrame(rafLoop)
        sendKeyframe('PLAY_START')
      }, delay)
    } else {
      // Immediate start
      playStartTime.current = networkTime
      setEngineState(STATES.PLAYING)
      rafRef.current = requestAnimationFrame(rafLoop)
      sendKeyframe('PLAY_START')
    }
    
    return true
  }, [engineState, teleprompterClient.clockOffset, rafLoop, sendKeyframe])
  
  // Pause
  const pause = useCallback(() => {
    console.log('⏸️ Pause command received')
    
    if (engineState !== STATES.PLAYING) return false
    
    // Update base position to current position
    const position = getCurrentPosition()
    baseLineIndex.current = position.lineIndex
    baseFractionalLine.current = position.fractionalLine
    
    setEngineState(STATES.PAUSED)
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    
    sendKeyframe('PAUSE')
    return true
  }, [engineState, getCurrentPosition, sendKeyframe])
  
  // Seek to absolute line
  const seekAbsolute = useCallback((lineIndex) => {
    console.log('🎯 Seek absolute to line:', lineIndex)
    
    const clampedIndex = Math.max(0, Math.min(lineIndex, lines.length - 1))
    
    baseLineIndex.current = clampedIndex
    baseFractionalLine.current = clampedIndex
    
    if (engineState === STATES.PLAYING) {
      playStartTime.current = performance.now()
    }
    
    sendKeyframe('SEEK_ABS')
    return true
  }, [lines.length, engineState, sendKeyframe])
  
  // Seek relative
  const seekRelative = useCallback((deltaLines) => {
    const currentPos = getCurrentPosition()
    const newLine = currentPos.lineIndex + deltaLines
    return seekAbsolute(newLine)
  }, [getCurrentPosition, seekAbsolute])
  
  // Jump commands
  const jumpTop = useCallback(() => seekAbsolute(0), [seekAbsolute])
  const jumpEnd = useCallback(() => seekAbsolute(lines.length - 1), [seekAbsolute, lines.length])
  
  // Handle manual scroll (iPad touch)
  const handleManualScroll = useCallback((scrollY) => {
    if (engineState === STATES.PLAYING) {
      // Convert scroll to line index - simple calculation
      let accumulatedHeight = 0
      let targetLine = 0
      
      for (let i = 0; i < lines.length; i++) {
        accumulatedHeight += lines[i].height
        if (accumulatedHeight > scrollY) {
          targetLine = i
          break
        }
      }
      
      baseLineIndex.current = targetLine
      baseFractionalLine.current = targetLine
      playStartTime.current = performance.now()
      
      sendKeyframe('MANUAL_SCROLL')
    }
  }, [engineState, lines, sendKeyframe])
  
  // Set keyframe interval based on mode
  const setSuperLightMode = useCallback((enabled) => {
    keyframeInterval.current = enabled ? 
      CONFIG.KEYFRAME_INTERVAL_SUPER_LIGHT : 
      CONFIG.KEYFRAME_INTERVAL_NORMAL
    console.log('🔄 Keyframe interval:', keyframeInterval.current + 'ms')
  }, [])
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])
  
  return {
    // State
    engineState,
    currentParams,
    lines,
    scriptVersion,
    textHash,
    performanceMetrics,
    
    // Current position
    getCurrentPosition,
    currentScrollY: currentScrollY.current,
    
    // Control
    loadScript,
    updateParams,
    play,
    pause,
    seekAbsolute,
    seekRelative,
    jumpTop,
    jumpEnd,
    handleManualScroll,
    setSuperLightMode,
    
    // Utils
    sendKeyframe
  }
}
