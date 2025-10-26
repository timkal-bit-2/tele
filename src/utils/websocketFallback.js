/**
 * WebSocket Fallback Manager
 * Provides reliable connectivity with multiple fallback strategies
 */

const FALLBACK_SERVERS = [
  import.meta.env.VITE_WS_URL,
  'wss://teleprompter-ws-backup.onrender.com/ws',
  'ws://localhost:3002/ws'
].filter(Boolean)

const LOCAL_SYNC_KEY = 'teleprompter-local-sync'
const CONNECTION_HISTORY_KEY = 'teleprompter-connection-history'
const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 30000

export class WebSocketFallbackManager {
  constructor() {
    this.currentServerIndex = 0
    this.reconnectAttempts = 0
    this.reconnectTimeout = null
    this.isManualDisconnect = false
    this.localSyncInterval = null
    this.listeners = new Map()
  }

  /**
   * Get next WebSocket server URL to try
   */
  getNextServerUrl() {
    const url = FALLBACK_SERVERS[this.currentServerIndex]
    this.currentServerIndex = (this.currentServerIndex + 1) % FALLBACK_SERVERS.length
    return url
  }

  /**
   * Calculate exponential backoff delay
   */
  getReconnectDelay() {
    const exponentialDelay = BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts)
    const jitter = Math.random() * 1000 // Add jitter to prevent thundering herd
    return Math.min(exponentialDelay + jitter, MAX_RECONNECT_DELAY)
  }

  /**
   * Record connection attempt
   */
  recordConnectionAttempt(url, success, error = null) {
    try {
      const history = JSON.parse(localStorage.getItem(CONNECTION_HISTORY_KEY) || '[]')
      
      history.unshift({
        url,
        success,
        error,
        timestamp: Date.now()
      })
      
      // Keep only last 20 attempts
      if (history.length > 20) {
        history.length = 20
      }
      
      localStorage.setItem(CONNECTION_HISTORY_KEY, JSON.stringify(history))
    } catch (error) {
      console.error('Failed to record connection attempt:', error)
    }
  }

  /**
   * Get connection success rate for a URL
   */
  getSuccessRate(url) {
    try {
      const history = JSON.parse(localStorage.getItem(CONNECTION_HISTORY_KEY) || '[]')
      const urlHistory = history.filter(h => h.url === url)
      
      if (urlHistory.length === 0) return 0
      
      const successes = urlHistory.filter(h => h.success).length
      return successes / urlHistory.length
    } catch (error) {
      return 0
    }
  }

  /**
   * Sort servers by success rate
   */
  sortServersByReliability() {
    FALLBACK_SERVERS.sort((a, b) => {
      const rateA = this.getSuccessRate(a)
      const rateB = this.getSuccessRate(b)
      return rateB - rateA
    })
  }

  /**
   * Start local sync fallback (uses localStorage)
   */
  startLocalSync() {
    if (this.localSyncInterval) return
    
    console.log('📱 Starting local sync fallback...')
    
    this.localSyncInterval = setInterval(() => {
      try {
        // Poll for updates from other tabs/windows
        const syncData = localStorage.getItem(LOCAL_SYNC_KEY)
        if (syncData) {
          const data = JSON.parse(syncData)
          
          // Notify listeners
          this.listeners.forEach((callback, type) => {
            if (data.type === type) {
              callback(data)
            }
          })
        }
      } catch (error) {
        console.error('Local sync error:', error)
      }
    }, 500) // Poll every 500ms
  }

  /**
   * Stop local sync fallback
   */
  stopLocalSync() {
    if (this.localSyncInterval) {
      clearInterval(this.localSyncInterval)
      this.localSyncInterval = null
      console.log('📱 Stopped local sync fallback')
    }
  }

  /**
   * Send message via local sync
   */
  sendViaLocalSync(type, data) {
    try {
      const message = {
        type,
        data,
        timestamp: Date.now(),
        source: 'local-sync'
      }
      
      localStorage.setItem(LOCAL_SYNC_KEY, JSON.stringify(message))
      
      // Trigger storage event for other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: LOCAL_SYNC_KEY,
        newValue: JSON.stringify(message)
      }))
      
      return true
    } catch (error) {
      console.error('Failed to send via local sync:', error)
      return false
    }
  }

  /**
   * Register a listener for messages
   */
  on(type, callback) {
    this.listeners.set(type, callback)
  }

  /**
   * Unregister a listener
   */
  off(type) {
    this.listeners.delete(type)
  }

  /**
   * Check if browser supports WebRTC for peer-to-peer fallback
   */
  supportsWebRTC() {
    return !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection)
  }

  /**
   * Get connection quality metrics
   */
  getConnectionQuality() {
    const history = JSON.parse(localStorage.getItem(CONNECTION_HISTORY_KEY) || '[]')
    const recentHistory = history.slice(0, 10)
    
    if (recentHistory.length === 0) {
      return {
        quality: 'unknown',
        successRate: 0,
        avgResponseTime: 0
      }
    }
    
    const successes = recentHistory.filter(h => h.success).length
    const successRate = successes / recentHistory.length
    
    let quality = 'poor'
    if (successRate >= 0.9) quality = 'excellent'
    else if (successRate >= 0.7) quality = 'good'
    else if (successRate >= 0.5) quality = 'fair'
    
    return {
      quality,
      successRate,
      recentAttempts: recentHistory.length
    }
  }

  /**
   * Reset reconnection state
   */
  reset() {
    this.reconnectAttempts = 0
    this.isManualDisconnect = false
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    this.reset()
    this.stopLocalSync()
    this.listeners.clear()
  }
}

export default WebSocketFallbackManager


