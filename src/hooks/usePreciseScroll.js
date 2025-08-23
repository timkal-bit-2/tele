import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Precise Scroll Control Hook
 * 
 * Maps line indices to exact Y positions using real DOM measurements.
 * No 50% offset, no synthetic positioning - just clean translate3d.
 * 
 * Scroll target: targetY = lines[lineIndex].top - markerY
 * Animation: translate3d(0, -round(targetY), 0)
 */
export const usePreciseScroll = (lines, markerPercent = 30) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  
  const animationRef = useRef(null)
  const containerRef = useRef(null)
  const targetScrollY = useRef(0)
  const animationSpeed = useRef(1) // pixels per frame

  // Calculate marker Y position within container
  const getMarkerY = useCallback(() => {
    if (!containerRef.current) return 0
    
    const containerHeight = containerRef.current.clientHeight
    return containerHeight * (markerPercent / 100)
  }, [markerPercent])

  // Calculate target scroll Y for a given line index
  const getTargetScrollY = useCallback((lineIndex) => {
    if (!lines.length || lineIndex < 0) return 0
    if (lineIndex >= lines.length) lineIndex = lines.length - 1
    
    const markerY = getMarkerY()
    const lineTop = lines[lineIndex]?.top || 0
    
    // Simple formula: line top minus marker position
    return Math.round(lineTop - markerY)
  }, [lines, getMarkerY])

  // Get current line index based on scroll position
  const getCurrentLineIndex = useCallback(() => {
    if (!lines.length) return 0
    
    const markerY = getMarkerY()
    const currentMarkerWorldY = scrollY + markerY
    
    // Find line whose center is closest to current marker position
    let closestIndex = 0
    let closestDistance = Infinity
    
    lines.forEach((line, index) => {
      const lineCenter = line.top + line.height / 2
      const distance = Math.abs(lineCenter - currentMarkerWorldY)
      
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    })
    
    return closestIndex
  }, [lines, scrollY, getMarkerY])

  // Smooth animation to target scroll position
  const animateToTarget = useCallback(() => {
    if (!containerRef.current) return
    
    const currentY = scrollY
    const targetY = targetScrollY.current
    const distance = targetY - currentY
    
    if (Math.abs(distance) < 1) {
      // Animation complete
      setScrollY(targetY)
      setIsScrolling(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }
    
    // Smooth easing
    const speed = Math.max(1, Math.abs(distance) * 0.1)
    const step = distance > 0 ? speed : -speed
    const newY = currentY + step
    
    setScrollY(Math.round(newY))
    
    // Continue animation
    animationRef.current = requestAnimationFrame(animateToTarget)
  }, [scrollY])

  // Scroll to specific line index
  const scrollToLine = useCallback((lineIndex, immediate = false) => {
    if (!lines.length) return
    
    const targetY = getTargetScrollY(lineIndex)
    targetScrollY.current = targetY
    
    if (immediate) {
      setScrollY(targetY)
      setCurrentLineIndex(lineIndex)
      setIsScrolling(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    } else {
      setIsScrolling(true)
      setCurrentLineIndex(lineIndex)
      animateToTarget()
    }
  }, [lines, getTargetScrollY, animateToTarget])

  // Auto-scroll functionality
  const startAutoScroll = useCallback((speed = 1) => {
    animationSpeed.current = speed
    setIsScrolling(true)
    
    const autoScrollStep = () => {
      if (!isScrolling) return
      
      const newY = scrollY + animationSpeed.current
      const maxScrollY = lines.length > 0 ? lines[lines.length - 1].bottom - getMarkerY() : 0
      
      if (newY >= maxScrollY) {
        // Reached end
        setScrollY(maxScrollY)
        setIsScrolling(false)
        return
      }
      
      setScrollY(newY)
      
      // Update current line index
      const newLineIndex = getCurrentLineIndex()
      setCurrentLineIndex(newLineIndex)
      
      // Continue auto-scroll
      if (isScrolling) {
        animationRef.current = requestAnimationFrame(autoScrollStep)
      }
    }
    
    animationRef.current = requestAnimationFrame(autoScrollStep)
  }, [scrollY, lines, getMarkerY, getCurrentLineIndex, isScrolling])

  const stopAutoScroll = useCallback(() => {
    setIsScrolling(false)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  // Update current line when scroll position changes
  useEffect(() => {
    const newLineIndex = getCurrentLineIndex()
    if (newLineIndex !== currentLineIndex) {
      setCurrentLineIndex(newLineIndex)
    }
  }, [scrollY, getCurrentLineIndex])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // CSS transform for scroll positioning
  const scrollTransform = `translate3d(0, ${-scrollY}px, 0)`

  return {
    // State
    currentLineIndex,
    isScrolling,
    scrollY,
    
    // Refs
    containerRef,
    
    // Actions
    scrollToLine,
    startAutoScroll,
    stopAutoScroll,
    
    // Computed values
    scrollTransform,
    markerY: getMarkerY(),
    totalLines: lines.length,
    
    // Utilities
    getTargetScrollY,
    getCurrentLineIndex
  }
}
