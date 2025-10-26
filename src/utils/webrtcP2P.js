/**
 * WebRTC Peer-to-Peer Connection Manager
 * Enables direct browser-to-browser communication on same WiFi
 * 
 * Usage:
 * - Laptop (Host): Creates room, becomes "server"
 * - iPad (Client): Joins room with code
 * - Direct data channel established
 * - No external server needed once connected!
 */

// Simple room code generation
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code.match(/.{1,3}/g).join('-') // Format: ABC-123
}

// Configuration for local network (same WiFi)
const LOCAL_RTC_CONFIG = {
  iceServers: [] // Empty = local network only, no STUN needed!
}

export class P2PHost {
  constructor() {
    this.peer = null
    this.dataChannel = null
    this.roomCode = null
    this.connectionState = 'idle'
    this.onStateChange = null
    this.onMessage = null
    this.localOffer = null
  }

  /**
   * Create a room and wait for client to join
   */
  async createRoom() {
    try {
      this.roomCode = generateRoomCode()
      this.peer = new RTCPeerConnection(LOCAL_RTC_CONFIG)
      
      // Create data channel (host creates it)
      this.dataChannel = this.peer.createDataChannel('teleprompter', {
        ordered: true,
        maxRetransmits: 3
      })
      
      this.setupDataChannelHandlers()
      this.setupPeerHandlers()
      
      // Create offer
      const offer = await this.peer.createOffer()
      await this.peer.setLocalDescription(offer)
      
      // Wait for ICE gathering to complete
      await this.waitForICEGathering()
      
      // Store offer for sharing
      this.localOffer = this.peer.localDescription
      
      this.connectionState = 'waiting'
      this.notifyStateChange()
      
      console.log('🎯 Room created:', this.roomCode)
      console.log('📋 Offer ready for sharing')
      
      return {
        roomCode: this.roomCode,
        offer: JSON.stringify(this.localOffer)
      }
    } catch (error) {
      console.error('Failed to create room:', error)
      this.connectionState = 'error'
      this.notifyStateChange()
      throw error
    }
  }

  /**
   * Accept answer from client
   */
  async acceptAnswer(answerJson) {
    try {
      const answer = JSON.parse(answerJson)
      await this.peer.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('✅ Answer accepted, connection should establish')
    } catch (error) {
      console.error('Failed to accept answer:', error)
      throw error
    }
  }

  /**
   * Wait for ICE candidates to be gathered
   */
  waitForICEGathering() {
    return new Promise((resolve) => {
      if (this.peer.iceGatheringState === 'complete') {
        resolve()
      } else {
        const checkState = () => {
          if (this.peer.iceGatheringState === 'complete') {
            this.peer.removeEventListener('icegatheringstatechange', checkState)
            resolve()
          }
        }
        this.peer.addEventListener('icegatheringstatechange', checkState)
      }
    })
  }

  setupPeerHandlers() {
    this.peer.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', this.peer.iceConnectionState)
      
      if (this.peer.iceConnectionState === 'connected') {
        this.connectionState = 'connected'
        this.notifyStateChange()
      } else if (this.peer.iceConnectionState === 'disconnected') {
        this.connectionState = 'disconnected'
        this.notifyStateChange()
      } else if (this.peer.iceConnectionState === 'failed') {
        this.connectionState = 'failed'
        this.notifyStateChange()
      }
    }

    this.peer.onconnectionstatechange = () => {
      console.log('Connection State:', this.peer.connectionState)
    }
  }

  setupDataChannelHandlers() {
    this.dataChannel.onopen = () => {
      console.log('✅ Data channel opened (Host)')
      this.connectionState = 'connected'
      this.notifyStateChange()
    }

    this.dataChannel.onclose = () => {
      console.log('❌ Data channel closed (Host)')
      this.connectionState = 'disconnected'
      this.notifyStateChange()
    }

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (this.onMessage) {
          this.onMessage(message)
        }
      } catch (error) {
        console.error('Failed to parse P2P message:', error)
      }
    }

    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error)
    }
  }

  /**
   * Send message to client
   */
  send(type, data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const message = { type, data, timestamp: Date.now() }
      this.dataChannel.send(JSON.stringify(message))
      return true
    }
    return false
  }

  /**
   * Close connection
   */
  close() {
    if (this.dataChannel) {
      this.dataChannel.close()
    }
    if (this.peer) {
      this.peer.close()
    }
    this.connectionState = 'closed'
    this.notifyStateChange()
  }

  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.connectionState)
    }
  }

  isConnected() {
    return this.connectionState === 'connected' && 
           this.dataChannel && 
           this.dataChannel.readyState === 'open'
  }
}

export class P2PClient {
  constructor() {
    this.peer = null
    this.dataChannel = null
    this.connectionState = 'idle'
    this.onStateChange = null
    this.onMessage = null
  }

  /**
   * Join a room using host's offer
   */
  async joinRoom(offerJson) {
    try {
      this.connectionState = 'connecting'
      this.notifyStateChange()
      
      this.peer = new RTCPeerConnection(LOCAL_RTC_CONFIG)
      this.setupPeerHandlers()
      
      // Parse and set remote offer
      const offer = JSON.parse(offerJson)
      await this.peer.setRemoteDescription(new RTCSessionDescription(offer))
      
      // Create answer
      const answer = await this.peer.createAnswer()
      await this.peer.setLocalDescription(answer)
      
      // Wait for ICE gathering
      await this.waitForICEGathering()
      
      console.log('✅ Answer created and ready to send back')
      
      return JSON.stringify(this.peer.localDescription)
    } catch (error) {
      console.error('Failed to join room:', error)
      this.connectionState = 'error'
      this.notifyStateChange()
      throw error
    }
  }

  waitForICEGathering() {
    return new Promise((resolve) => {
      if (this.peer.iceGatheringState === 'complete') {
        resolve()
      } else {
        const checkState = () => {
          if (this.peer.iceGatheringState === 'complete') {
            this.peer.removeEventListener('icegatheringstatechange', checkState)
            resolve()
          }
        }
        this.peer.addEventListener('icegatheringstatechange', checkState)
      }
    })
  }

  setupPeerHandlers() {
    // Wait for data channel from host
    this.peer.ondatachannel = (event) => {
      console.log('📡 Data channel received from host')
      this.dataChannel = event.channel
      this.setupDataChannelHandlers()
    }

    this.peer.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', this.peer.iceConnectionState)
      
      if (this.peer.iceConnectionState === 'connected') {
        this.connectionState = 'connected'
        this.notifyStateChange()
      } else if (this.peer.iceConnectionState === 'disconnected') {
        this.connectionState = 'disconnected'
        this.notifyStateChange()
      } else if (this.peer.iceConnectionState === 'failed') {
        this.connectionState = 'failed'
        this.notifyStateChange()
      }
    }

    this.peer.onconnectionstatechange = () => {
      console.log('Connection State:', this.peer.connectionState)
    }
  }

  setupDataChannelHandlers() {
    this.dataChannel.onopen = () => {
      console.log('✅ Data channel opened (Client)')
      this.connectionState = 'connected'
      this.notifyStateChange()
    }

    this.dataChannel.onclose = () => {
      console.log('❌ Data channel closed (Client)')
      this.connectionState = 'disconnected'
      this.notifyStateChange()
    }

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (this.onMessage) {
          this.onMessage(message)
        }
      } catch (error) {
        console.error('Failed to parse P2P message:', error)
      }
    }

    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error)
    }
  }

  /**
   * Send message to host
   */
  send(type, data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const message = { type, data, timestamp: Date.now() }
      this.dataChannel.send(JSON.stringify(message))
      return true
    }
    return false
  }

  /**
   * Close connection
   */
  close() {
    if (this.dataChannel) {
      this.dataChannel.close()
    }
    if (this.peer) {
      this.peer.close()
    }
    this.connectionState = 'closed'
    this.notifyStateChange()
  }

  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.connectionState)
    }
  }

  isConnected() {
    return this.connectionState === 'connected' && 
           this.dataChannel && 
           this.dataChannel.readyState === 'open'
  }
}

/**
 * Helper to generate QR code data
 * Returns URL-safe base64 encoded offer
 */
export function generateQRData(offer) {
  // Compress offer for QR code
  const compressed = btoa(offer)
  return compressed
}

/**
 * Helper to decode QR data
 */
export function decodeQRData(qrData) {
  try {
    return atob(qrData)
  } catch (error) {
    console.error('Failed to decode QR data:', error)
    return null
  }
}

/**
 * Store connection data in localStorage for manual transfer
 */
export function storeConnectionOffer(roomCode, offer) {
  const key = `p2p-offer-${roomCode}`
  localStorage.setItem(key, offer)
  console.log(`📝 Offer stored for room ${roomCode}`)
}

export function retrieveConnectionOffer(roomCode) {
  const key = `p2p-offer-${roomCode}`
  const offer = localStorage.getItem(key)
  if (offer) {
    console.log(`📖 Retrieved offer for room ${roomCode}`)
  }
  return offer
}

export function storeConnectionAnswer(roomCode, answer) {
  const key = `p2p-answer-${roomCode}`
  localStorage.setItem(key, answer)
  console.log(`📝 Answer stored for room ${roomCode}`)
}

export function retrieveConnectionAnswer(roomCode) {
  const key = `p2p-answer-${roomCode}`
  const answer = localStorage.getItem(key)
  if (answer) {
    console.log(`📖 Retrieved answer for room ${roomCode}`)
    // Clean up after retrieval
    localStorage.removeItem(key)
  }
  return answer
}

export default { P2PHost, P2PClient, generateQRData, decodeQRData }


