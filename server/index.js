import { WebSocketServer } from 'ws'
import { createServer } from 'http'

const PORT = process.env.PORT || 3002

// Create HTTP server
const server = createServer()

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
})

// Track connected clients
const clients = new Set()

// Ultra-fast broadcast with minimal processing
const broadcast = (message, sender = null) => {
  const messageString = JSON.stringify(message)
  
  // Use for...of for faster iteration
  for (const client of clients) {
    if (client !== sender && client.readyState === client.OPEN) {
      try {
        // Send immediately without additional processing
        client.send(messageString)
      } catch (error) {
        console.error('Error sending message to client:', error)
        clients.delete(client)
      }
    }
  }
}

// Send client count to all clients
const broadcastClientCount = () => {
  broadcast({
    type: 'client-count',
    count: clients.size
  })
}

wss.on('connection', (ws, request) => {
  console.log(`New WebSocket connection from ${request.socket.remoteAddress}`)
  
  // Add client to set
  clients.add(ws)
  
  // Optimize WebSocket settings for low latency
  ws.binaryType = 'arraybuffer'
  
  // Send initial client count
  broadcastClientCount()
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to Teleprompter WebSocket server',
    clientId: Date.now()
  }))

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      
      switch (message.type) {
        case 'PING':
          // Respond to ping with pong
          ws.send(JSON.stringify({
            type: 'PONG',
            timestamp: Date.now()
          }))
          break
          
        case 'CONTENT_UPDATE':
        case 'PLAYBACK_STATE':
        case 'SEEK_LINE':
        case 'LAYOUT_SETTINGS':
        case 'OUTPUT_LINE_UPDATE':
        case 'SCROLL_POSITION':
        case 'SETTINGS_UPDATE':
        case 'SIMPLE_TEXT_UPDATE':
        case 'SIMPLE_PLAYBACK_STATE':
        case 'SIMPLE_SCROLL_POSITION':
        case 'SIMPLE_MANUAL_POSITION':
        case 'SIMPLE_POSITION_FEEDBACK':
          // Broadcast to all other clients with priority for scroll messages
          broadcast(message, ws)
          break
          
        case 'ping':
          // Legacy ping support
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }))
          break
          
        case 'content-update':
          // Legacy content update support
          broadcast({
            type: 'content-update',
            content: message.content,
            settings: message.settings,
            isScrolling: message.isScrolling,
            scrollPosition: message.scrollPosition,
            timestamp: Date.now()
          }, ws)
          break
          
        default:
          console.log('Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  })

  // Handle client disconnect
  ws.on('close', (code, reason) => {
    console.log(`WebSocket connection closed: ${code} ${reason}`)
    clients.delete(ws)
    broadcastClientCount()
  })

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
    clients.delete(ws)
    broadcastClientCount()
  })
})

// Handle server errors
wss.on('error', (error) => {
  console.error('WebSocket Server error:', error)
})

// Start server
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`)
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`)
  console.log(`👥 Connected clients: ${clients.size}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...')
  
  // Close all WebSocket connections
  clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.close(1001, 'Server shutting down')
    }
  })
  
  // Close the server
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...')
  
  // Close all WebSocket connections
  clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.close(1001, 'Server shutting down')
    }
  })
  
  // Close the server
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'healthy',
      clients: clients.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }))
  } else {
    res.writeHead(404)
    res.end('Not Found')
  }
})
