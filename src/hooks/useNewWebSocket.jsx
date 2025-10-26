import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { WebSocketFallbackManager } from '../utils/websocketFallback'

/**
 * New WebSocket Hook for Simplified Teleprompter Protocol
 * 
 * Message Types:
 * - CONTENT_UPDATE: {docId, content, layoutSettings}
 * - PLAYBACK_STATE: {isScrolling, speed}
 * - SEEK_LINE: {lineIndex}
 * - OUTPUT_LINE_UPDATE: {lineIndex} (from Output to Input)
 */

const NewWebSocketContext = createContext()

export const useNewWebSocket = () => {
  const context = useContext(NewWebSocketContext)
  if (!context) {
    throw new Error('useNewWebSocket must be used within a NewWebSocketProvider')
  }
  return context
}

export const MESSAGE_TYPES = {
  CONTENT_UPDATE: 'CONTENT_UPDATE',
  PLAYBACK_STATE: 'PLAYBACK_STATE',
  SEEK_LINE: 'SEEK_LINE',
  LAYOUT_SETTINGS: 'LAYOUT_SETTINGS',
  OUTPUT_LINE_UPDATE: 'OUTPUT_LINE_UPDATE',
  SCROLL_POSITION: 'SCROLL_POSITION',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  PING: 'PING',
  PONG: 'PONG'
}

export const NewWebSocketProvider = ({ children }) => {
  const [ws, setWs] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [lastError, setLastError] = useState(null)
  const [messageCount, setMessageCount] = useState(0)
  const [usingFallback, setUsingFallback] = useState(false)
  const [connectionQuality, setConnectionQuality] = useState({ quality: 'unknown', successRate: 0 })
  
  const messageHandlersRef = useRef(new Map())
  const reconnectTimeoutRef = useRef(null)
  const heartbeatIntervalRef = useRef(null)
  const fallbackManagerRef = useRef(new WebSocketFallbackManager())

  // Message handler registration
  const onMessage = useCallback((messageType, handler) => {
    if (!messageHandlersRef.current.has(messageType)) {
      messageHandlersRef.current.set(messageType, new Set())
    }
    messageHandlersRef.current.get(messageType).add(handler)

    // Return cleanup function
    return () => {
      const handlers = messageHandlersRef.current.get(messageType)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          messageHandlersRef.current.delete(messageType)
        }
      }
    }
  }, [])

  // Send message with error handling and fallback
  const sendMessage = useCallback((type, data = {}) => {
    // Try WebSocket first
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        const message = { type, data, timestamp: Date.now() }
        ws.send(JSON.stringify(message))
        console.log('📤 Sent via WebSocket:', message)
        return true
      } catch (error) {
        console.error('Failed to send via WebSocket:', error)
        setLastError(error.message)
      }
    }

    // Fallback to localStorage sync if WebSocket is unavailable
    console.warn('WebSocket not connected, using localStorage fallback')
    setUsingFallback(true)
    const success = fallbackManagerRef.current.sendViaLocalSync(type, data)
    
    if (success) {
      console.log('📤 Sent via localStorage fallback:', { type, data })
    }
    
    return success
  }, [ws])

  // Simplified API methods
  const sendContentUpdate = useCallback((content, layoutSettings = {}) => {
    return sendMessage(MESSAGE_TYPES.CONTENT_UPDATE, {
      docId: 'main', // Simple single document ID
      content,
      layoutSettings
    })
  }, [sendMessage])

  const sendPlaybackState = useCallback((isScrolling, speed = 1) => {
    return sendMessage(MESSAGE_TYPES.PLAYBACK_STATE, {
      isScrolling,
      speed
    })
  }, [sendMessage])

  const sendSeekLine = useCallback((lineIndex) => {
    return sendMessage(MESSAGE_TYPES.SEEK_LINE, {
      lineIndex
    })
  }, [sendMessage])

  const sendLayoutSettings = useCallback((layoutSettings) => {
    return sendMessage(MESSAGE_TYPES.LAYOUT_SETTINGS, layoutSettings)
  }, [sendMessage])

  // Super optimized scroll position with adaptive throttling
  const scrollThrottleRef = useRef(null)
  const lastScrollSent = useRef(0)
  const lastPositionSent = useRef(0)
  const sendScrollPosition = useCallback((scrollPosition, superLightMode = false) => {
    const now = Date.now()
    const timeSinceLastSend = now - lastScrollSent.current
    
    // Super Light Mode: Ultra aggressive throttling
    if (superLightMode) {
      const significantChange = Math.abs(scrollPosition - lastPositionSent.current) > 20
      const enoughTimePassed = timeSinceLastSend > 200 // 5fps for super light
      
      if (significantChange || enoughTimePassed) {
        lastScrollSent.current = now
        lastPositionSent.current = scrollPosition
        return sendMessage(MESSAGE_TYPES.SCROLL_POSITION, {
          scrollPosition: Math.round(scrollPosition / 10) * 10, // Round to 10px increments
          timestamp: now,
          superLight: true
        })
      }
      return false
    }
    
    // Normal throttling for regular mode
    const significantChange = Math.abs(scrollPosition - lastPositionSent.current) > 10
    const enoughTimePassed = timeSinceLastSend > 50 // 20fps max for free tier
    
    if (significantChange || enoughTimePassed) {
      lastScrollSent.current = now
      lastPositionSent.current = scrollPosition
      return sendMessage(MESSAGE_TYPES.SCROLL_POSITION, {
        scrollPosition: Math.round(scrollPosition),
        timestamp: now,
        superLight: false
      })
    }
    
    return false // Skipped for performance
  }, [sendMessage])

  const sendSettingsUpdate = useCallback((settings) => {
    return sendMessage(MESSAGE_TYPES.SETTINGS_UPDATE, settings)
  }, [sendMessage])

  // WebSocket connection management with fallback
  const connect = useCallback(() => {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return // Already connecting or connected
    }

    const fallbackManager = fallbackManagerRef.current

    try {
      console.log('🔗 Connecting to WebSocket...')
      setConnectionStatus('connecting')
      setLastError(null)
      setUsingFallback(false)

      // Get next server URL to try (with rotation)
      const wsUrl = fallbackManager.getNextServerUrl()
      console.log('🔗 Attempting connection to:', wsUrl, `(Attempt ${fallbackManager.reconnectAttempts + 1})`)
      
      const websocket = new WebSocket(wsUrl)
      
      websocket.onopen = () => {
        console.log('✅ WebSocket connected successfully!')
        setConnectionStatus('connected')
        setWs(websocket)
        setLastError(null)
        setUsingFallback(false)
        
        // Record successful connection
        fallbackManager.recordConnectionAttempt(wsUrl, true)
        fallbackManager.reset() // Reset reconnection counter
        
        // Update connection quality
        const quality = fallbackManager.getConnectionQuality()
        setConnectionQuality(quality)
        
        // Aggressive heartbeat for Render.com free tier (prevents sleeping)
        heartbeatIntervalRef.current = setInterval(() => {
          sendMessage(MESSAGE_TYPES.PING)
        }, 5000) // 5 seconds to keep Render server awake
      }

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('📥 Received:', message)
          
          setMessageCount(prev => prev + 1)
          
          // Handle PONG responses
          if (message.type === MESSAGE_TYPES.PONG) {
            return
          }
          
          // Dispatch to registered handlers
          const handlers = messageHandlersRef.current.get(message.type)
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(message.data, message)
              } catch (error) {
                console.error('Message handler error:', error)
              }
            })
          } else {
            console.log('No handlers for message type:', message.type)
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          setLastError('Invalid message format')
        }
      }

      websocket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.reason || 'Unknown reason')
        setConnectionStatus('disconnected')
        setWs(null)
        
        // Record failed connection
        fallbackManager.recordConnectionAttempt(wsUrl, false, event.reason)
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }
        
        // Enable localStorage fallback immediately
        setUsingFallback(true)
        fallbackManager.startLocalSync()
        console.log('📱 Enabled localStorage fallback mode')
        
        // Auto-reconnect with exponential backoff (if not manual disconnect)
        if (event.code !== 1000 && !fallbackManager.isManualDisconnect) {
          fallbackManager.reconnectAttempts++
          const delay = fallbackManager.getReconnectDelay()
          
          console.log(`⏳ Reconnecting in ${(delay / 1000).toFixed(1)}s... (Attempt ${fallbackManager.reconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        }
      }

      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setConnectionStatus('error')
        setLastError('Connection error')
        
        // Record error
        fallbackManager.recordConnectionAttempt(wsUrl, false, 'Connection error')
      }

    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setConnectionStatus('error')
      setLastError(error.message)
      
      // Enable fallback mode on connection failure
      setUsingFallback(true)
      fallbackManager.startLocalSync()
      
      // Retry with next server
      fallbackManager.reconnectAttempts++
      const delay = fallbackManager.getReconnectDelay()
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }
  }, [sendMessage])

  const disconnect = useCallback(() => {
    const fallbackManager = fallbackManagerRef.current
    fallbackManager.isManualDisconnect = true
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    
    // Stop fallback sync
    fallbackManager.stopLocalSync()
    
    if (ws) {
      ws.close(1000, 'Manual disconnect')
      setWs(null)
    }
    
    setConnectionStatus('disconnected')
    setUsingFallback(false)
  }, [ws])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
      // Cleanup fallback manager
      fallbackManagerRef.current.cleanup()
    }
  }, [])

  // Context value
  const contextValue = {
    // Connection state
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    lastError,
    messageCount,
    usingFallback,
    connectionQuality,
    
    // Connection control
    connect,
    disconnect,
    
    // Message handling
    onMessage,
    sendMessage,
    
    // Simplified API
    sendContentUpdate,
    sendPlaybackState,
    sendSeekLine,
    sendLayoutSettings,
    sendScrollPosition,
    sendSettingsUpdate,
    
    // Constants
    MESSAGE_TYPES
  }

  return (
    <NewWebSocketContext.Provider value={contextValue}>
      {children}
    </NewWebSocketContext.Provider>
  )
}

export default NewWebSocketProvider
