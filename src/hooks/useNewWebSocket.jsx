import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'

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
  
  const messageHandlersRef = useRef(new Map())
  const reconnectTimeoutRef = useRef(null)
  const heartbeatIntervalRef = useRef(null)

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

  // Send message with error handling
  const sendMessage = useCallback((type, data = {}) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not connected')
      return false
    }

    try {
      const message = { type, data, timestamp: Date.now() }
      ws.send(JSON.stringify(message))
      console.log('📤 Sent:', message)
      return true
    } catch (error) {
      console.error('Failed to send message:', error)
      setLastError(error.message)
      return false
    }
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

  // WebSocket connection management
  const connect = useCallback(() => {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return // Already connecting or connected
    }

    try {
      console.log('🔗 Connecting to WebSocket...')
      setConnectionStatus('connecting')
      setLastError(null)

      // Use environment variable or fallback to localhost
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3002/ws'
      console.log('🔗 Connecting to WebSocket:', wsUrl)
      const websocket = new WebSocket(wsUrl)
      
      websocket.onopen = () => {
        console.log('✅ WebSocket connected')
        setConnectionStatus('connected')
        setWs(websocket)
        setLastError(null)
        
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
        console.log('🔌 WebSocket disconnected:', event.reason)
        setConnectionStatus('disconnected')
        setWs(null)
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }
        
        // Fast auto-reconnect for minimal downtime
        if (event.code !== 1000) { // 1000 = normal closure
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 1000) // Faster reconnect: 1 second instead of 3
        }
      }

      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setConnectionStatus('error')
        setLastError('Connection error')
      }

    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setConnectionStatus('error')
      setLastError(error.message)
    }
  }, [sendMessage])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    
    if (ws) {
      ws.close(1000, 'Manual disconnect')
      setWs(null)
    }
    
    setConnectionStatus('disconnected')
  }, [ws])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [])

  // Context value
  const contextValue = {
    // Connection state
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    lastError,
    messageCount,
    
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
