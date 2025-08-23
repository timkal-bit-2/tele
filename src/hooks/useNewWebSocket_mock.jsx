import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'

const NewWebSocketContext = createContext()

export const useNewWebSocket = () => {
  const context = useContext(NewWebSocketContext)
  if (!context) {
    // Return mock values if no provider
    return {
      connectionStatus: 'disconnected',
      isConnected: false,
      sendContentUpdate: () => console.log('Mock: sendContentUpdate'),
      sendPlaybackState: () => console.log('Mock: sendPlaybackState'),
      sendSeekLine: () => console.log('Mock: sendSeekLine'),
      sendLayoutSettings: () => console.log('Mock: sendLayoutSettings'),
      onMessage: () => () => console.log('Mock: onMessage cleanup'),
      MESSAGE_TYPES: {
        CONTENT_UPDATE: 'CONTENT_UPDATE',
        PLAYBACK_STATE: 'PLAYBACK_STATE',
        SEEK_LINE: 'SEEK_LINE',
        LAYOUT_SETTINGS: 'LAYOUT_SETTINGS',
        OUTPUT_LINE_UPDATE: 'OUTPUT_LINE_UPDATE',
        PING: 'PING',
        PONG: 'PONG'
      }
    }
  }
  return context
}

export const MESSAGE_TYPES = {
  CONTENT_UPDATE: 'CONTENT_UPDATE',
  PLAYBACK_STATE: 'PLAYBACK_STATE',
  SEEK_LINE: 'SEEK_LINE',
  LAYOUT_SETTINGS: 'LAYOUT_SETTINGS',
  OUTPUT_LINE_UPDATE: 'OUTPUT_LINE_UPDATE',
  PING: 'PING',
  PONG: 'PONG'
}

export const NewWebSocketProvider = ({ children }) => {
  console.log('Mock WebSocket Provider active')
  
  const mockValue = {
    connectionStatus: 'disconnected',
    isConnected: false,
    sendContentUpdate: () => console.log('Mock: sendContentUpdate'),
    sendPlaybackState: () => console.log('Mock: sendPlaybackState'),
    sendSeekLine: () => console.log('Mock: sendSeekLine'),
    sendLayoutSettings: () => console.log('Mock: sendLayoutSettings'),
    onMessage: () => () => console.log('Mock: onMessage cleanup'),
    MESSAGE_TYPES
  }

  return (
    <NewWebSocketContext.Provider value={mockValue}>
      {children}
    </NewWebSocketContext.Provider>
  )
}
