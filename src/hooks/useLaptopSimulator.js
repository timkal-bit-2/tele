/**
 * Laptop Ghost Simulator
 * Simulates iPad position based on keyframes
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { STATES, CONFIG } from '../types/teleprompterProtocol.js'
import { interpolatePosition } from '../utils/lineCalculator.js'

export const useLaptopSimulator = (teleprompterClient) => {
  const [simulatorState, setSimulatorState] = useState(STATES.CONNECTED)
  const [currentParams, setCurrentParams] = useState({
    speed: 60,
    lineHeight: 1.4,
    fontSize: 48,
    mirror: { horizontal: false, vertical: false },
    margins: 20
  })
  const [lines, setLines] = useState([])
  const [scriptVersion, setScriptVersion] = useState(1)
  
  // Simulation state
  const rafRef = useRef(null)
  const simulationBase = useRef({
    lineIndex: 0,
    fractionalLine: 0,
    timestamp: 0,
    params: null
  })
  
  // Tracking and drift detection
  const [ghostPosition, setGhostPosition] = useState({
    lineIndex: 0,
    fractionalLine: 0,
    scrollY: 0
  })
  
  const [driftMetrics, setDriftMetrics] = useState({
    lastKeyframeAge: 0,
    estimatedDrift: 0,
    connectionQuality: 'good'
  })
  
  const lastKeyframeTime = useRef(0)
  const driftCheckInterval = useRef(null)
  
  // Load script
  const loadScript = useCallback((content, version, hash) => {
    console.log('🎭 Simulator loading script, version:', version)
    
    // Use same line calculation as iPad
    const calculatedLines = calculateLines(content, {
      fontSize: currentParams.fontSize,
      lineHeight: currentParams.lineHeight,
      viewportWidth: 800 // Standard laptop preview width
    })
    
    setLines(calculatedLines)
    setScriptVersion(version)
    setSimulatorState(STATES.LOADED_SIM)
    
    // Reset simulation
    simulationBase.current = {
      lineIndex: 0,
      fractionalLine: 0,
      timestamp: performance.now(),
      params: currentParams
    }
    
    console.log(`🎭 Simulator ready: ${calculatedLines.length} lines`)
  }, [currentParams])
  
  // Update parameters
  const updateParams = useCallback((newParams) => {
    setCurrentParams(prev => ({ ...prev, ...newParams }))
    setSimulatorState(STATES.READY_SIM)
    
    // Update simulation base with new params
    simulationBase.current = {
      ...simulationBase.current,
      params: { ...currentParams, ...newParams },
      timestamp: performance.now()
    }
  }, [currentParams])
  
  // Handle keyframe from iPad
  const handleKeyframe = useCallback((keyframeData) => {
    const now = performance.now()
    
    console.log('🔄 Received keyframe:', keyframeData.lineIndex, keyframeData.fractionalLine)
    
    // Hard reset simulation to keyframe position
    simulationBase.current = {
      lineIndex: keyframeData.lineIndex,
      fractionalLine: keyframeData.fractionalLine || keyframeData.lineIndex,
      timestamp: keyframeData.t_anchor - teleprompterClient.clockOffset,
      params: {
        speed: keyframeData.speed,
        lineHeight: keyframeData.lineHeight,
        fontSize: keyframeData.fontSize,
        mirror: keyframeData.mirror
      }
    }
    
    lastKeyframeTime.current = now
    
    // Update current params if they changed
    if (keyframeData.speed !== currentParams.speed ||
        keyframeData.fontSize !== currentParams.fontSize ||
        keyframeData.lineHeight !== currentParams.lineHeight) {
      setCurrentParams(prev => ({
        ...prev,
        speed: keyframeData.speed,
        fontSize: keyframeData.fontSize,
        lineHeight: keyframeData.lineHeight,
        mirror: keyframeData.mirror
      }))
    }
    
    // Reset drift metrics
    setDriftMetrics(prev => ({
      ...prev,
      lastKeyframeAge: 0,
      estimatedDrift: 0
    }))
  }, [teleprompterClient.clockOffset, currentParams])
  
  // Calculate current simulated position
  const getCurrentSimulatedPosition = useCallback(() => {
    if (!simulationBase.current.params || lines.length === 0) {
      return { lineIndex: 0, fractionalLine: 0, scrollY: 0 }
    }
    
    const now = performance.now()
    const elapsed = (now - simulationBase.current.timestamp) / 1000
    const linesPerSecond = simulationBase.current.params.speed / 60
    
    const targetFractionalLine = simulationBase.current.fractionalLine + (elapsed * linesPerSecond)
    const lineIndex = Math.floor(targetFractionalLine)
    const clampedFractionalLine = Math.max(0, Math.min(targetFractionalLine, lines.length - 1))
    
    // Calculate scroll position
    let scrollY = 0
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      scrollY += lines[i].height || (currentParams.fontSize * currentParams.lineHeight)
    }
    
    if (lineIndex < lines.length) {
      const lineHeight = lines[lineIndex]?.height || (currentParams.fontSize * currentParams.lineHeight)
      scrollY += (clampedFractionalLine - lineIndex) * lineHeight
    }
    
    return {
      lineIndex: Math.max(0, Math.min(lineIndex, lines.length - 1)),
      fractionalLine: clampedFractionalLine,
      scrollY: Math.max(0, scrollY)
    }
  }, [lines, currentParams])
  
  // Simulation RAF loop
  const simulationLoop = useCallback(() => {
    if (simulatorState !== STATES.PLAYING_SIM) return
    
    const position = getCurrentSimulatedPosition()
    setGhostPosition(position)
    
    // Update drift metrics
    const now = performance.now()
    const keyframeAge = now - lastKeyframeTime.current
    
    setDriftMetrics(prev => ({
      ...prev,
      lastKeyframeAge: keyframeAge,
      connectionQuality: keyframeAge > 5000 ? 'poor' : keyframeAge > 2000 ? 'fair' : 'good'
    }))
    
    rafRef.current = requestAnimationFrame(simulationLoop)
  }, [simulatorState, getCurrentSimulatedPosition])
  
  // Start simulation
  const startSimulation = useCallback(() => {
    console.log('🎭 Starting simulation')
    setSimulatorState(STATES.PLAYING_SIM)
    rafRef.current = requestAnimationFrame(simulationLoop)
  }, [simulationLoop])
  
  // Stop simulation
  const stopSimulation = useCallback(() => {
    console.log('🎭 Stopping simulation')
    setSimulatorState(STATES.PAUSED_SIM)
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])
  
  // Request keyframe if drift detected
  const checkDriftAndRequest = useCallback(() => {
    const keyframeAge = performance.now() - lastKeyframeTime.current
    
    if (keyframeAge > CONFIG.MAX_KF_AGE) {
      console.log('⚠️ Keyframe too old, requesting new one')
      teleprompterClient.requestKeyframe()
    }
  }, [teleprompterClient])
  
  // Start drift monitoring
  useEffect(() => {
    if (simulatorState === STATES.PLAYING_SIM) {
      driftCheckInterval.current = setInterval(checkDriftAndRequest, 2000)
    } else {
      if (driftCheckInterval.current) {
        clearInterval(driftCheckInterval.current)
        driftCheckInterval.current = null
      }
    }
    
    return () => {
      if (driftCheckInterval.current) {
        clearInterval(driftCheckInterval.current)
      }
    }
  }, [simulatorState, checkDriftAndRequest])
  
  // Calculate reading line position for editor
  const getReadingLinePosition = useCallback(() => {
    if (lines.length === 0) return 25 // Default 25%
    
    const totalLines = lines.length
    const currentLine = ghostPosition.lineIndex
    const percentage = (currentLine / totalLines) * 100
    
    return Math.max(10, Math.min(90, percentage))
  }, [lines.length, ghostPosition.lineIndex])
  
  // Handle reading line drag in super light mode
  const handleReadingLineDrag = useCallback((newPercentage) => {
    if (lines.length === 0) return
    
    const targetLine = Math.floor((newPercentage / 100) * lines.length)
    
    // Send seek command to iPad
    teleprompterClient.seekAbsolute(targetLine)
    
    // Update local simulation immediately for responsiveness
    simulationBase.current = {
      ...simulationBase.current,
      lineIndex: targetLine,
      fractionalLine: targetLine,
      timestamp: performance.now()
    }
  }, [lines.length, teleprompterClient])
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (driftCheckInterval.current) {
        clearInterval(driftCheckInterval.current)
      }
    }
  }, [])
  
  return {
    // State
    simulatorState,
    currentParams,
    lines,
    scriptVersion,
    ghostPosition,
    driftMetrics,
    
    // Control
    loadScript,
    updateParams,
    handleKeyframe,
    startSimulation,
    stopSimulation,
    
    // Position utilities
    getCurrentSimulatedPosition,
    getReadingLinePosition,
    handleReadingLineDrag,
    
    // Diagnostics
    isSimulationRunning: simulatorState === STATES.PLAYING_SIM,
    lastKeyframeAge: performance.now() - lastKeyframeTime.current
  }
}
