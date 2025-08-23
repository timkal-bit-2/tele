import { createContext, useContext, useEffect, useState, useRef } from 'react'

const WebSocketContext = createContext()

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

export const WebSocketProvider = ({ children }) => {
  const [ws, setWs] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [latency, setLatency] = useState(null)
  const [connectedClients, setConnectedClients] = useState(0)
  
  const reconnectTimeoutRef = useRef(null)
  const heartbeatIntervalRef = useRef(null)
  const lastPingRef = useRef(null)

  const connect = () => {
    try {
      console.log('Attempting to connect to WebSocket...')
      const host = window.location.hostname
      const defaultPort = 3002
      const envUrl = import.meta.env.VITE_WS_URL
      let url
      if (envUrl) {
        url = envUrl
      } else {
        const port = defaultPort
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        url = `${protocol}://${host}:${port}/ws`
      }
      const websocket = new WebSocket(url)
      
      websocket.onopen = () => {
        console.log('WebSocket connected successfully!')
        setConnectionStatus('connected')
        setWs(websocket)
        startHeartbeat(websocket)
      }

      websocket.onclose = () => {
        console.log('WebSocket disconnected')
        setConnectionStatus('disconnected')
        setWs(null)
        setLatency(null)
        stopHeartbeat()
        
        // Attempt reconnection after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (connectionStatus !== 'connected') {
            connect()
          }
        }, 3000)
      }

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('WebSocket message received:', data)
          
          if (data.type === 'pong') {
            const now = Date.now()
            const ping = now - lastPingRef.current
            setLatency(ping)
          } else if (data.type === 'client-count') {
            setConnectedClients(data.count)
          }
          
          // Dispatch custom event for other components to listen to
          window.dispatchEvent(new CustomEvent('websocket-message', {
            detail: data
          }))
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionStatus('error')
    }
  }

  const startHeartbeat = (websocket) => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (websocket.readyState === WebSocket.OPEN) {
        lastPingRef.current = Date.now()
        websocket.send(JSON.stringify({ type: 'ping' }))
      }
    }, 5000) // Ping every 5 seconds
  }

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }

  const sendMessage = (message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message)
      ws.send(JSON.stringify(message))
      return true
    } else {
      console.warn('WebSocket not connected, cannot send message:', message)
      return false
    }
  }

  const disconnect = () => {
    if (ws) {
      ws.close()
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    stopHeartbeat()
  }

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [])

  const value = {
    ws,
    connectionStatus,
    latency,
    connectedClients,
    sendMessage,
    connect,
    disconnect
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}
