import { useEffect, useRef } from 'react'

// WebSocket message types
export const MESSAGE_TYPES = {
  CONTENT_UPDATE: 'content-update',
  LAYOUT_SETTINGS: 'layout-settings', 
  PLAYBACK_STATE: 'playback-state',
  SEEK_LINE: 'seek-line',
  PING: 'ping',
  PONG: 'pong',
  CLIENT_COUNT: 'client-count'
}

// Enhanced WebSocket hook with teleprompter-specific protocol
export const useTeleprompterWebSocket = (url) => {
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const pingIntervalRef = useRef(null)
  const listenersRef = useRef({})

  useEffect(() => {
    const connect = () => {
      try {
        wsRef.current = new WebSocket(url)
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected')
          
          // Start ping/pong heartbeat
          pingIntervalRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              send(MESSAGE_TYPES.PING, { timestamp: Date.now() })
            }
          }, 30000)
          
          // Notify listeners
          callListeners('open', {})
        }
        
        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            callListeners(message.type, message.payload)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }
        
        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected')
          cleanup()
          
          // Attempt reconnection
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 3000)
          
          callListeners('close', {})
        }
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error)
          callListeners('error', { error })
        }
        
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }
    }

    const cleanup = () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
    }

    const callListeners = (type, payload) => {
      const listeners = listenersRef.current[type] || []
      listeners.forEach(listener => {
        try {
          listener(payload)
        } catch (error) {
          console.error(`Error in ${type} listener:`, error)
        }
      })
    }

    connect()

    return () => {
      cleanup()
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [url])

  // Send message
  const send = (type, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = { type, payload, timestamp: Date.now() }
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    return false
  }

  // Add event listener
  const on = (type, listener) => {
    if (!listenersRef.current[type]) {
      listenersRef.current[type] = []
    }
    listenersRef.current[type].push(listener)
    
    // Return cleanup function
    return () => {
      const listeners = listenersRef.current[type]
      if (listeners) {
        const index = listeners.indexOf(listener)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    }
  }

  // Remove event listener
  const off = (type, listener) => {
    const listeners = listenersRef.current[type]
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  // Get connection state
  const getState = () => {
    return wsRef.current?.readyState || WebSocket.CLOSED
  }

  const isConnected = () => {
    return wsRef.current?.readyState === WebSocket.OPEN
  }

  // Convenience methods for teleprompter protocol
  const broadcastContent = (docId, plainText) => {
    return send(MESSAGE_TYPES.CONTENT_UPDATE, { docId, plainText })
  }

  const broadcastLayoutSettings = (settings) => {
    return send(MESSAGE_TYPES.LAYOUT_SETTINGS, settings)
  }

  const broadcastPlaybackState = (state) => {
    return send(MESSAGE_TYPES.PLAYBACK_STATE, state)
  }

  const seekToLine = (lineIndex) => {
    return send(MESSAGE_TYPES.SEEK_LINE, { lineIndex })
  }

  return {
    send,
    on,
    off,
    getState,
    isConnected,
    
    // Teleprompter-specific methods
    broadcastContent,
    broadcastLayoutSettings, 
    broadcastPlaybackState,
    seekToLine
  }
}
