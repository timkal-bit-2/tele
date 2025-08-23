/**
 * Teleprompter Protocol v2.0
 * iPad-authoritative architecture with line-based messaging
 */

// Message Types
export const MESSAGE_TYPES = {
  // Setup
  LOAD_SCRIPT: 'LOAD_SCRIPT',
  SET_PARAMS: 'SET_PARAMS',
  
  // Control
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  SEEK_ABS: 'SEEK_ABS',
  SEEK_REL: 'SEEK_REL',
  JUMP_TOP: 'JUMP_TOP',
  JUMP_END: 'JUMP_END',
  
  // Sync
  PING: 'PING',
  PONG: 'PONG',
  KEYFRAME: 'KF',
  REQUEST_KF: 'REQUEST_KF',
  
  // Responses
  ACK: 'ACK',
  ERROR: 'ERROR'
}

// Message Schemas
export const createMessage = (type, data, seq = Date.now()) => ({
  type,
  data: {
    ...data,
    seq,
    timestamp: performance.now()
  }
})

export const createLoadScript = (scriptVersion, textHash, content) => 
  createMessage(MESSAGE_TYPES.LOAD_SCRIPT, {
    scriptVersion,
    textHash,
    content
  })

export const createSetParams = (params, scriptVersion, seq) =>
  createMessage(MESSAGE_TYPES.SET_PARAMS, {
    ...params,
    scriptVersion,
    seq
  })

export const createPlay = (t0, scriptVersion, seq) =>
  createMessage(MESSAGE_TYPES.PLAY, {
    t0,
    scriptVersion,
    seq
  })

export const createPause = (scriptVersion, seq) =>
  createMessage(MESSAGE_TYPES.PAUSE, {
    scriptVersion,
    seq
  })

export const createSeekAbs = (lineIndex, scriptVersion, seq) =>
  createMessage(MESSAGE_TYPES.SEEK_ABS, {
    lineIndex,
    scriptVersion,
    seq
  })

export const createSeekRel = (deltaLines, scriptVersion, seq) =>
  createMessage(MESSAGE_TYPES.SEEK_REL, {
    deltaLines,
    scriptVersion,
    seq
  })

export const createKeyframe = (lineIndex, fractionalLine, t_anchor, params, scriptVersion, seq) =>
  createMessage(MESSAGE_TYPES.KEYFRAME, {
    lineIndex,
    fractionalLine,
    t_anchor,
    speed: params.speed,
    lineHeight: params.lineHeight,
    fontSize: params.fontSize,
    mirror: params.mirror,
    scriptVersion,
    seq
  })

export const createAck = (originalSeq, scriptVersion) =>
  createMessage(MESSAGE_TYPES.ACK, {
    originalSeq,
    scriptVersion
  })

export const createError = (code, message, expectedScriptVersion) =>
  createMessage(MESSAGE_TYPES.ERROR, {
    code,
    message,
    expectedScriptVersion
  })

// State Machine States
export const STATES = {
  // iPad States
  IDLE: 'IDLE',
  LOADED: 'LOADED', 
  READY: 'READY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  
  // Laptop States
  CONNECTED: 'CONNECTED',
  LOADED_SIM: 'LOADED_SIM',
  READY_SIM: 'READY_SIM', 
  PLAYING_SIM: 'PLAYING_SIM',
  PAUSED_SIM: 'PAUSED_SIM'
}

// Error Codes
export const ERROR_CODES = {
  VERSION_MISMATCH: 'VERSION_MISMATCH',
  INVALID_STATE: 'INVALID_STATE',
  INVALID_LINE_INDEX: 'INVALID_LINE_INDEX',
  TIMEOUT: 'TIMEOUT'
}

// Configuration
export const CONFIG = {
  KEYFRAME_INTERVAL_NORMAL: 1200,    // 1.2s in normal mode
  KEYFRAME_INTERVAL_SUPER_LIGHT: 2000, // 2s in super light mode
  MAX_DRIFT_LINES: 0.5,             // Request KF when drift > 0.5 lines
  MAX_KF_AGE: 3000,                 // Request KF when age > 3s
  ACK_TIMEOUT: 500,                 // Retry after 500ms if no ACK
  PING_INTERVAL: 10000,             // Heartbeat every 10s
  THROTTLE_SUPER_LIGHT: 200,        // 5Hz for super light mode
  THROTTLE_NORMAL: 50               // 20Hz for normal mode
}
