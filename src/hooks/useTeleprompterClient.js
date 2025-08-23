/**
 * Teleprompter Client Hook - New Architecture
 * Handles WebSocket communication with new protocol
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { MESSAGE_TYPES, STATES, CONFIG, createMessage } from '../types/teleprompterProtocol.js'

export const useTeleprompterClient = (isIpad = false) => {
  const [state, setState] = useState(STATES.IDLE)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [scriptVersion, setScriptVersion] = useState(1)
  const [lastKeyframe, setLastKeyframe] = useState(null)
  const [clockOffset, setClockOffset] = useState(0)
  const [rtt, setRtt] = useState(0)
  
  const wsRef = useRef(null)
  const messageHandlers = useRef(new Map())
  const pendingAcks = useRef(new Map())
  const seqCounter = useRef(1000)
  
  // Generate unique sequence number
  const nextSeq = useCallback(() => {
    return seqCounter.current++
  }, [])
  
  // Register message handler
  const onMessage = useCallback((type, handler) => {
    if (!messageHandlers.current.has(type)) {
      messageHandlers.current.set(type, new Set())
    }
    messageHandlers.current.get(type).add(handler)
    
    return () => {
      const handlers = messageHandlers.current.get(type)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          messageHandlers.current.delete(type)
        }
      }
    }
  }, [])
  
  // Send message with optional ACK expectation
  const sendMessage = useCallback((message, expectAck = false) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not connected')
      return false
    }
    
    try {
      const messageString = JSON.stringify(message)
      wsRef.current.send(messageString)
      console.log('📤 Sent:', message)
      
      if (expectAck) {
        pendingAcks.current.set(message.data.seq, {
          message,
          timestamp: Date.now(),
          retried: false
        })
        
        // Set timeout for ACK
        setTimeout(() => {
          const pending = pendingAcks.current.get(message.data.seq)
          if (pending && !pending.retried) {
            console.warn('⏰ No ACK received, retrying:', message.data.seq)
            pending.retried = true
            wsRef.current?.send(messageString)
          }
        }, CONFIG.ACK_TIMEOUT)
      }
      
      return true
    } catch (error) {
      console.error('Failed to send message:', error)
      return false
    }
  }, [])
  
  // Clock synchronization
  const synchronizeClock = useCallback(async () => {
    const measurements = []
    
    for (let i = 0; i < 7; i++) {
      const t1 = performance.now()
      const pingMessage = createMessage(MESSAGE_TYPES.PING, { clientTime: t1 })
      
      await new Promise((resolve) => {
        const cleanup = onMessage(MESSAGE_TYPES.PONG, (data) => {
          const t4 = performance.now()
          const rtt = t4 - t1
          const offset = data.serverTime - ((t1 + t4) / 2)
          
          measurements.push({ rtt, offset })
          cleanup()
          resolve()
        })
        
        sendMessage(pingMessage)
      })
      
      if (i < 6) await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Calculate median values
    measurements.sort((a, b) => a.rtt - b.rtt)
    const medianIndex = Math.floor(measurements.length / 2)
    const medianRtt = measurements[medianIndex].rtt
    const medianOffset = measurements[medianIndex].offset
    
    setRtt(medianRtt)
    setClockOffset(medianOffset)
    
    console.log(`🕐 Clock sync: offset=${medianOffset.toFixed(2)}ms, RTT=${medianRtt.toFixed(2)}ms`)
    
    return { offset: medianOffset, rtt: medianRtt }
  }, [onMessage, sendMessage])
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3002/ws'
    console.log('🔗 Connecting to:', wsUrl)
    
    setConnectionStatus('connecting')
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = async () => {
      console.log('✅ WebSocket connected')
      setConnectionStatus('connected')
      setState(STATES.CONNECTED)
      wsRef.current = ws
      
      // Perform clock synchronization
      try {
        await synchronizeClock()
      } catch (error) {
        console.error('Clock sync failed:', error)
      }
    }
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('📥 Received:', message)
        
        // Handle ACKs
        if (message.type === MESSAGE_TYPES.ACK) {
          pendingAcks.current.delete(message.data.originalSeq)
          return
        }
        
        // Dispatch to handlers
        const handlers = messageHandlers.current.get(message.type)
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(message.data, message)
            } catch (error) {
              console.error('Message handler error:', error)
            }
          })
        }
      } catch (error) {
        console.error('Failed to parse message:', error)
      }
    }
    
    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected')
      setConnectionStatus('disconnected')
      setState(STATES.IDLE)
      wsRef.current = null
      
      // Auto-reconnect
      setTimeout(() => connect(), 3000)
    }
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
      setConnectionStatus('error')
    }
  }, [synchronizeClock, onMessage])
  
  // High-level API methods
  const loadScript = useCallback((scriptVersion, textHash, content) => {
    const message = createMessage(MESSAGE_TYPES.LOAD_SCRIPT, {
      scriptVersion,
      textHash,
      content,
      seq: nextSeq()
    })
    return sendMessage(message, true)
  }, [sendMessage, nextSeq])
  
  const setParams = useCallback((params) => {
    const message = createMessage(MESSAGE_TYPES.SET_PARAMS, {
      ...params,
      scriptVersion,
      seq: nextSeq()
    })
    return sendMessage(message, true)
  }, [sendMessage, nextSeq, scriptVersion])
  
  const play = useCallback((startTime) => {
    const t0 = startTime || (performance.now() + clockOffset + 100) // 100ms future start
    const message = createMessage(MESSAGE_TYPES.PLAY, {
      t0,
      scriptVersion,
      seq: nextSeq()
    })
    return sendMessage(message, true)
  }, [sendMessage, nextSeq, scriptVersion, clockOffset])
  
  const pause = useCallback(() => {
    const message = createMessage(MESSAGE_TYPES.PAUSE, {
      scriptVersion,
      seq: nextSeq()
    })
    return sendMessage(message, true)
  }, [sendMessage, nextSeq, scriptVersion])
  
  const seekAbsolute = useCallback((lineIndex) => {
    const message = createMessage(MESSAGE_TYPES.SEEK_ABS, {
      lineIndex,
      scriptVersion,
      seq: nextSeq()
    })
    return sendMessage(message, true)
  }, [sendMessage, nextSeq, scriptVersion])
  
  const seekRelative = useCallback((deltaLines) => {
    const message = createMessage(MESSAGE_TYPES.SEEK_REL, {
      deltaLines,
      scriptVersion,
      seq: nextSeq()
    })
    return sendMessage(message, true)
  }, [sendMessage, nextSeq, scriptVersion])
  
  const sendKeyframe = useCallback((lineIndex, fractionalLine, t_anchor, params) => {
    const message = createMessage(MESSAGE_TYPES.KEYFRAME, {
      lineIndex,
      fractionalLine,
      t_anchor,
      speed: params.speed,
      lineHeight: params.lineHeight,
      fontSize: params.fontSize,
      mirror: params.mirror,
      scriptVersion,
      seq: nextSeq()
    })
    setLastKeyframe({ ...message.data, timestamp: Date.now() })
    return sendMessage(message)
  }, [sendMessage, nextSeq, scriptVersion])
  
  const requestKeyframe = useCallback(() => {
    const message = createMessage(MESSAGE_TYPES.REQUEST_KF, {
      scriptVersion,
      seq: nextSeq()
    })
    return sendMessage(message)
  }, [sendMessage, nextSeq, scriptVersion])
  
  // Auto-connect on mount
  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])
  
  return {
    // State
    state,
    setState,
    connectionStatus,
    scriptVersion,
    setScriptVersion,
    lastKeyframe,
    clockOffset,
    rtt,
    
    // Communication
    onMessage,
    sendMessage,
    connect,
    
    // High-level API
    loadScript,
    setParams,
    play,
    pause,
    seekAbsolute,
    seekRelative,
    sendKeyframe,
    requestKeyframe,
    
    // Utils
    nextSeq,
    isConnected: connectionStatus === 'connected'
  }
}
