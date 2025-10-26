import { useState, useEffect, useRef } from 'react'
import { P2PHost, P2PClient, generateQRData, decodeQRData, storeConnectionOffer, retrieveConnectionOffer, storeConnectionAnswer, retrieveConnectionAnswer } from '../utils/webrtcP2P'

/**
 * P2P Connection Component
 * Manages WebRTC peer-to-peer connections
 * 
 * Mode: 'host' (laptop/regie) or 'client' (iPad/ausspielung)
 */
const P2PConnection = ({ mode, onConnectionEstablished, onConnectionLost, onMessage }) => {
  const [connectionState, setConnectionState] = useState('idle')
  const [roomCode, setRoomCode] = useState('')
  const [offerData, setOfferData] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [manualOffer, setManualOffer] = useState('')
  const [manualAnswer, setManualAnswer] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  
  const p2pInstanceRef = useRef(null)
  const pollIntervalRef = useRef(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (p2pInstanceRef.current) {
        p2pInstanceRef.current.close()
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Host: Create room
  const handleCreateRoom = async () => {
    try {
      setErrorMessage('')
      const host = new P2PHost()
      p2pInstanceRef.current = host
      
      host.onStateChange = (state) => {
        setConnectionState(state)
        if (state === 'connected' && onConnectionEstablished) {
          onConnectionEstablished(host)
        } else if (state === 'disconnected' && onConnectionLost) {
          onConnectionLost()
        }
      }
      
      host.onMessage = (message) => {
        if (onMessage) {
          onMessage(message)
        }
      }
      
      const { roomCode: code, offer } = await host.createRoom()
      setRoomCode(code)
      setOfferData(offer)
      
      // Store offer in localStorage for manual retrieval
      storeConnectionOffer(code, offer)
      
      // Poll for answer in localStorage (for manual pairing)
      pollIntervalRef.current = setInterval(() => {
        const answer = retrieveConnectionAnswer(code)
        if (answer && host.peer && host.peer.signalingState !== 'stable') {
          console.log('📥 Found answer in localStorage, accepting...')
          host.acceptAnswer(answer)
          clearInterval(pollIntervalRef.current)
        }
      }, 1000)
      
    } catch (error) {
      setErrorMessage(`Failed to create room: ${error.message}`)
      console.error(error)
    }
  }

  // Host: Accept answer manually
  const handleAcceptAnswer = async () => {
    try {
      if (!manualAnswer.trim()) {
        setErrorMessage('Please paste the answer from iPad')
        return
      }
      
      setErrorMessage('')
      const host = p2pInstanceRef.current
      if (host) {
        await host.acceptAnswer(manualAnswer.trim())
        setManualAnswer('')
      }
    } catch (error) {
      setErrorMessage(`Failed to accept answer: ${error.message}`)
    }
  }

  // Client: Join room via room code (retrieves from localStorage)
  const handleJoinViaRoomCode = async () => {
    try {
      if (!roomCode.trim()) {
        setErrorMessage('Please enter room code')
        return
      }
      
      setErrorMessage('')
      const offer = retrieveConnectionOffer(roomCode.trim().toUpperCase())
      
      if (!offer) {
        setErrorMessage('Room not found. Make sure host created the room first.')
        return
      }
      
      await joinWithOffer(offer)
    } catch (error) {
      setErrorMessage(`Failed to join room: ${error.message}`)
    }
  }

  // Client: Join room with manual offer
  const handleJoinManually = async () => {
    try {
      if (!manualOffer.trim()) {
        setErrorMessage('Please paste the offer from laptop')
        return
      }
      
      setErrorMessage('')
      await joinWithOffer(manualOffer.trim())
    } catch (error) {
      setErrorMessage(`Failed to join: ${error.message}`)
    }
  }

  // Client: Actually join with offer data
  const joinWithOffer = async (offer) => {
    const client = new P2PClient()
    p2pInstanceRef.current = client
    
    client.onStateChange = (state) => {
      setConnectionState(state)
      if (state === 'connected' && onConnectionEstablished) {
        onConnectionEstablished(client)
      } else if (state === 'disconnected' && onConnectionLost) {
        onConnectionLost()
      }
    }
    
    client.onMessage = (message) => {
      if (onMessage) {
        onMessage(message)
      }
    }
    
    const answer = await client.joinRoom(offer)
    setManualAnswer(answer)
    
    // Store answer in localStorage for host to retrieve
    if (roomCode) {
      storeConnectionAnswer(roomCode.trim().toUpperCase(), answer)
    }
  }

  // Disconnect
  const handleDisconnect = () => {
    if (p2pInstanceRef.current) {
      p2pInstanceRef.current.close()
      p2pInstanceRef.current = null
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
    setConnectionState('idle')
    setRoomCode('')
    setOfferData(null)
    setManualOffer('')
    setManualAnswer('')
  }

  // Copy to clipboard helper
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy. Please copy manually.')
    })
  }

  // Render based on mode and state
  return (
    <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          🔗 Direct Connection
          <span className="text-xs font-normal text-gray-400">
            (Same WiFi)
          </span>
        </h3>
        <div className={`text-xs px-2 py-1 rounded font-medium ${
          connectionState === 'connected' ? 'bg-green-600 text-white' :
          connectionState === 'connecting' || connectionState === 'waiting' ? 'bg-yellow-600 text-white' :
          connectionState === 'error' || connectionState === 'failed' ? 'bg-red-600 text-white' :
          'bg-gray-600 text-white'
        }`}>
          {connectionState === 'connected' ? '🟢 Connected' :
           connectionState === 'waiting' ? '⏳ Waiting for iPad...' :
           connectionState === 'connecting' ? '🔄 Connecting...' :
           connectionState === 'error' ? '❌ Error' :
           connectionState === 'failed' ? '❌ Failed' :
           '⭕ Not Connected'}
        </div>
      </div>

      {errorMessage && (
        <div className="mb-3 p-2 bg-red-900 bg-opacity-50 border border-red-700 rounded text-xs text-red-200">
          {errorMessage}
        </div>
      )}

      {connectionState === 'idle' && mode === 'host' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-300">
            Create a room to let iPad connect directly to your laptop browser.
          </p>
          <button
            onClick={handleCreateRoom}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
          >
            📡 Create Room
          </button>
        </div>
      )}

      {connectionState === 'waiting' && mode === 'host' && (
        <div className="space-y-3">
          <div className="p-3 bg-gray-900 rounded border border-gray-600">
            <p className="text-xs text-gray-300 mb-2">Room Code:</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-2xl font-mono font-bold text-green-400 tracking-wider">
                {roomCode}
              </div>
              <button
                onClick={() => copyToClipboard(roomCode)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                📋 Copy
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-400 space-y-1">
            <p><strong>On iPad:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Make sure both devices are on same WiFi</li>
              <li>Click "Join Room"</li>
              <li>Enter code: <span className="font-mono text-green-400">{roomCode}</span></li>
            </ol>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            {showAdvanced ? '▼ Hide' : '▶'} Advanced / Manual Setup
          </button>

          {showAdvanced && (
            <div className="space-y-3 p-3 bg-gray-900 rounded border border-gray-600">
              <div>
                <p className="text-xs text-gray-300 mb-2">Connection Data (for manual pairing):</p>
                <textarea
                  readOnly
                  value={offerData || ''}
                  className="w-full h-24 px-2 py-1 bg-gray-800 text-gray-300 text-xs font-mono rounded border border-gray-600 resize-none"
                />
                <button
                  onClick={() => copyToClipboard(offerData || '')}
                  className="mt-2 w-full px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                >
                  📋 Copy Connection Data
                </button>
              </div>

              <div>
                <p className="text-xs text-gray-300 mb-2">Paste answer from iPad:</p>
                <textarea
                  value={manualAnswer}
                  onChange={(e) => setManualAnswer(e.target.value)}
                  placeholder="Paste answer here..."
                  className="w-full h-24 px-2 py-1 bg-gray-800 text-white text-xs font-mono rounded border border-gray-600 resize-none"
                />
                <button
                  onClick={handleAcceptAnswer}
                  className="mt-2 w-full px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                >
                  ✅ Accept Answer
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {connectionState === 'idle' && mode === 'client' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-300">
            Enter the room code from your laptop to connect.
          </p>
          
          <div>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABC-123"
              className="w-full px-3 py-2 bg-gray-900 text-white text-lg font-mono text-center tracking-wider rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              maxLength={7}
            />
          </div>

          <button
            onClick={handleJoinViaRoomCode}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
          >
            🔌 Join Room
          </button>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            {showAdvanced ? '▼ Hide' : '▶'} Advanced / Manual Setup
          </button>

          {showAdvanced && (
            <div className="space-y-3 p-3 bg-gray-900 rounded border border-gray-600">
              <div>
                <p className="text-xs text-gray-300 mb-2">Or paste connection data from laptop:</p>
                <textarea
                  value={manualOffer}
                  onChange={(e) => setManualOffer(e.target.value)}
                  placeholder="Paste offer here..."
                  className="w-full h-24 px-2 py-1 bg-gray-800 text-white text-xs font-mono rounded border border-gray-600 resize-none"
                />
                <button
                  onClick={handleJoinManually}
                  className="mt-2 w-full px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                >
                  ✅ Connect
                </button>
              </div>

              {manualAnswer && (
                <div>
                  <p className="text-xs text-gray-300 mb-2">Copy this answer and paste on laptop:</p>
                  <textarea
                    readOnly
                    value={manualAnswer}
                    className="w-full h-24 px-2 py-1 bg-gray-800 text-gray-300 text-xs font-mono rounded border border-gray-600 resize-none"
                  />
                  <button
                    onClick={() => copyToClipboard(manualAnswer)}
                    className="mt-2 w-full px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                  >
                    📋 Copy Answer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(connectionState === 'connecting' || connectionState === 'waiting') && mode === 'client' && (
        <div className="space-y-3">
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🔄</div>
            <p className="text-sm text-gray-300">Connecting to laptop...</p>
          </div>
          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {connectionState === 'connected' && (
        <div className="space-y-3">
          <div className="p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <span className="text-xl">✅</span>
              <span className="font-medium">Connected!</span>
            </div>
            <p className="text-xs text-gray-300">
              {mode === 'host' 
                ? 'iPad is connected to your laptop browser.'
                : 'Connected to laptop browser.'}
            </p>
            {roomCode && (
              <p className="text-xs text-gray-400 mt-1">
                Room: <span className="font-mono">{roomCode}</span>
              </p>
            )}
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            🔌 Disconnect
          </button>
        </div>
      )}

      {(connectionState === 'failed' || connectionState === 'error') && (
        <div className="space-y-3">
          <div className="p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded">
            <p className="text-sm text-red-300 font-medium mb-1">Connection Failed</p>
            <p className="text-xs text-gray-300">
              Make sure both devices are on the same WiFi network and try again.
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

export default P2PConnection


