/**
 * Performance Optimizer for Free Tier Cloud Hosting (Render.com, Heroku, etc.)
 * 
 * Handles common issues:
 * - Cold start delays
 * - Connection throttling
 * - Memory constraints
 * - CPU limitations
 */

// Detect if we're on a free tier hosting service
export const detectFreeTierHosting = () => {
  const wsUrl = import.meta.env.VITE_WS_URL || ''
  
  return {
    isRender: wsUrl.includes('.render.com'),
    isHeroku: wsUrl.includes('.herokuapp.com'),
    isRailway: wsUrl.includes('.railway.app'),
    isFreeTier: wsUrl.includes('.render.com') || wsUrl.includes('.herokuapp.com')
  }
}

// Get optimized settings based on hosting provider
export const getOptimizedSettings = () => {
  const hosting = detectFreeTierHosting()
  
  if (hosting.isFreeTier) {
    return {
      // Reduced update frequency for free tier limitations
      scrollUpdateInterval: 50, // 20fps instead of 60fps
      heartbeatInterval: 5000,   // 5s to prevent sleeping
      reconnectDelay: 500,       // Faster reconnect for cold starts
      
      // Performance optimizations
      enableHardwareAcceleration: true,
      useRoundedPixels: true,
      throttleWebSocketUpdates: true,
      
      // UI feedback
      showPerformanceWarnings: true,
      coldStartNotification: true
    }
  }
  
  // Premium hosting settings
  return {
    scrollUpdateInterval: 16,   // 60fps
    heartbeatInterval: 10000,   // 10s
    reconnectDelay: 1000,       // 1s
    
    enableHardwareAcceleration: true,
    useRoundedPixels: false,
    throttleWebSocketUpdates: false,
    
    showPerformanceWarnings: false,
    coldStartNotification: false
  }
}

// Optimize scroll animation based on device capabilities
export const optimizeScrollAnimation = (scrollValue, settings) => {
  const optimized = getOptimizedSettings()
  
  // Round pixels for better performance on low-end devices
  const roundedScroll = optimized.useRoundedPixels 
    ? Math.round(scrollValue) 
    : scrollValue
  
  return {
    value: roundedScroll,
    transform: optimized.enableHardwareAcceleration
      ? `translate3d(0, ${-roundedScroll}px, 0)`
      : `translateY(${-roundedScroll}px)`,
    willChange: optimized.enableHardwareAcceleration ? 'transform' : 'auto'
  }
}

// WebSocket message optimizer for free tier
export const optimizeWebSocketMessage = (message, lastSent = {}) => {
  const optimized = getOptimizedSettings()
  
  if (!optimized.throttleWebSocketUpdates) {
    return { shouldSend: true, optimizedMessage: message }
  }
  
  // Skip redundant scroll updates
  if (message.type === 'SCROLL_POSITION') {
    const timeSinceLastScroll = Date.now() - (lastSent.scrollTime || 0)
    const positionDiff = Math.abs(message.data.scrollPosition - (lastSent.scrollPosition || 0))
    
    // Only send if significant change or enough time passed
    if (positionDiff < 5 && timeSinceLastScroll < optimized.scrollUpdateInterval) {
      return { shouldSend: false }
    }
    
    // Update tracking
    lastSent.scrollTime = Date.now()
    lastSent.scrollPosition = message.data.scrollPosition
  }
  
  return { 
    shouldSend: true, 
    optimizedMessage: {
      ...message,
      data: {
        ...message.data,
        // Round numbers to reduce payload size
        scrollPosition: Math.round(message.data.scrollPosition || 0)
      }
    }
  }
}

// Performance monitoring
export const createPerformanceMonitor = () => {
  const metrics = {
    frameDrops: 0,
    averageFPS: 60,
    webSocketLatency: 0,
    coldStartDetected: false
  }
  
  let lastFrameTime = performance.now()
  let frameCount = 0
  let fpsSum = 0
  
  const updateMetrics = () => {
    const now = performance.now()
    const frameDelta = now - lastFrameTime
    lastFrameTime = now
    
    const currentFPS = 1000 / frameDelta
    frameCount++
    fpsSum += currentFPS
    
    metrics.averageFPS = fpsSum / frameCount
    
    if (currentFPS < 30) {
      metrics.frameDrops++
    }
    
    // Reset every 60 frames
    if (frameCount >= 60) {
      frameCount = 0
      fpsSum = 0
    }
  }
  
  const detectColdStart = (connectionTime) => {
    // If connection takes more than 3 seconds, likely a cold start
    if (connectionTime > 3000) {
      metrics.coldStartDetected = true
      console.warn('🚨 Cold start detected - server was sleeping')
    }
  }
  
  return {
    metrics,
    updateMetrics,
    detectColdStart,
    getReport: () => ({ ...metrics })
  }
}

// Export default settings
export default {
  detectFreeTierHosting,
  getOptimizedSettings,
  optimizeScrollAnimation,
  optimizeWebSocketMessage,
  createPerformanceMonitor
}
