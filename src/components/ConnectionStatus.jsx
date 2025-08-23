import { useWebSocket } from '../hooks/useWebSocket'

const ConnectionStatus = () => {
  const { connectionStatus, latency, connectedClients } = useWebSocket()

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-400'
      case 'disconnected':
        return 'text-red-400'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-yellow-400'
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '✅'
      case 'disconnected':
        return '❌'
      case 'error':
        return '⚠️'
      default:
        return '🔄'
    }
  }

  const getLatencyColor = () => {
    if (!latency) return 'text-gray-400'
    if (latency < 50) return 'text-green-400'
    if (latency < 150) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getLatencyQuality = () => {
    if (!latency) return 'Unbekannt'
    if (latency < 50) return 'Ausgezeichnet'
    if (latency < 150) return 'Gut'
    if (latency < 300) return 'Akzeptabel'
    return 'Schlecht'
  }

  return (
    <div className="flex items-center space-x-4 text-sm">
      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        <span className={`${getStatusColor()}`}>
          {getStatusIcon()}
        </span>
        <span className={`${getStatusColor()} font-medium`}>
          {connectionStatus === 'connected' ? 'Verbunden' : 
           connectionStatus === 'disconnected' ? 'Getrennt' : 
           connectionStatus === 'error' ? 'Fehler' : 'Verbinde...'}
        </span>
      </div>

      {/* Client Count */}
      {connectionStatus === 'connected' && (
        <div className="flex items-center space-x-1 text-gray-300">
          <span>📱</span>
          <span>{connectedClients} Clients</span>
        </div>
      )}

      {/* Latency */}
      {connectionStatus === 'connected' && latency !== null && (
        <div className="flex items-center space-x-1">
          <span className={`${getLatencyColor()}`}>
            🏓 {latency}ms
          </span>
          <span className="text-gray-400 text-xs">
            ({getLatencyQuality()})
          </span>
        </div>
      )}

      {/* Reconnecting indicator */}
      {connectionStatus === 'disconnected' && (
        <div className="text-yellow-400 text-xs animate-pulse">
          Wiederverbindung in 3s...
        </div>
      )}
    </div>
  )
}

export default ConnectionStatus
