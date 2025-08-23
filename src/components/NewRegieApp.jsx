/**
 * New Regie App v2.0 - Ghost Simulation + Super Light Mode
 * Laptop controls iPad via messages, simulates position locally
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTeleprompterClient } from '../hooks/useTeleprompterClient.js'
import { useLaptopSimulator } from '../hooks/useLaptopSimulator.js'
import { MESSAGE_TYPES, STATES } from '../types/teleprompterProtocol.js'
import { calculateTextHash } from '../utils/lineCalculator.js'

const NewRegieApp = () => {
  const navigate = useNavigate()
  
  // Initialize teleprompter client (laptop mode)
  const teleprompterClient = useTeleprompterClient(false)
  
  // Initialize laptop simulator
  const simulator = useLaptopSimulator(teleprompterClient)
  
  // UI State
  const [rawContent, setRawContent] = useState('Dies ist ein Test-Text für die neue Teleprompter-Architektur.\n\nDas iPad ist jetzt die einzige Quelle der Wahrheit für Scroll-Positionen.\n\nDie Regie simuliert nur lokal basierend auf Keyframes.')
  const [files, setFiles] = useState([])
  const [activeFileId, setActiveFileId] = useState(null)
  const [currentParams, setCurrentParams] = useState({
    speed: 60, // lines per minute
    fontSize: 48,
    lineHeight: 1.4,
    mirror: { horizontal: false, vertical: false },
    margins: 20,
    superLightMode: false
  })
  
  // Control state
  const [isPlaying, setIsPlaying] = useState(false)
  const [lastCommand, setLastCommand] = useState('')
  
  // Load files from localStorage
  useEffect(() => {
    const savedFiles = localStorage.getItem('teleprompter-files')
    if (savedFiles) {
      try {
        const parsedFiles = JSON.parse(savedFiles)
        setFiles(parsedFiles)
        if (parsedFiles.length > 0) {
          setActiveFileId(parsedFiles[0].id)
          setRawContent(parsedFiles[0].content)
        }
      } catch (error) {
        console.error('Error loading files:', error)
      }
    }
  }, [])
  
  // Save files to localStorage
  useEffect(() => {
    if (files.length > 0) {
      localStorage.setItem('teleprompter-files', JSON.stringify(files))
    }
  }, [files])
  
  // Set up keyframe handler
  useEffect(() => {
    const cleanup = teleprompterClient.onMessage(MESSAGE_TYPES.KEYFRAME, (data) => {
      simulator.handleKeyframe(data)
    })
    return cleanup
  }, [teleprompterClient, simulator])
  
  // File management
  const handleFileUpload = (event) => {
    const uploadedFiles = Array.from(event.target.files)
    uploadedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          content: e.target.result,
          uploadedAt: new Date().toISOString()
        }
        setFiles(prev => [...prev, newFile])
        setActiveFileId(newFile.id)
        setRawContent(newFile.content)
      }
      reader.readAsText(file)
    })
    event.target.value = ''
  }
  
  const handleFileSelect = (fileId) => {
    const file = files.find(f => f.id === fileId)
    if (file) {
      setActiveFileId(fileId)
      setRawContent(file.content)
    }
  }
  
  const handleDeleteFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    if (activeFileId === fileId) {
      const remainingFiles = files.filter(f => f.id !== fileId)
      if (remainingFiles.length > 0) {
        setActiveFileId(remainingFiles[0].id)
        setRawContent(remainingFiles[0].content)
      } else {
        setActiveFileId(null)
        setRawContent('')
      }
    }
  }
  
  // Send script to iPad
  const sendScript = useCallback(() => {
    if (!rawContent.trim()) return
    
    const hash = calculateTextHash(rawContent)
    const version = Date.now()
    
    console.log('📤 Sending script to iPad')
    const success = teleprompterClient.loadScript(version, hash, rawContent)
    if (success) {
      simulator.loadScript(rawContent, version, hash)
      setLastCommand('LOAD_SCRIPT sent')
    }
  }, [rawContent, teleprompterClient, simulator])
  
  // Send parameters to iPad
  const sendParams = useCallback(() => {
    console.log('📤 Sending params to iPad')
    const params = {
      speed: currentParams.speed,
      fontSize: currentParams.fontSize,
      lineHeight: currentParams.lineHeight,
      mirror: currentParams.mirror,
      margins: currentParams.margins
    }
    
    const success = teleprompterClient.setParams(params)
    if (success) {
      simulator.updateParams(params)
      setLastCommand('SET_PARAMS sent')
    }
  }, [currentParams, teleprompterClient, simulator])
  
  // Control commands
  const handlePlay = useCallback(() => {
    console.log('📤 Sending PLAY command')
    const success = teleprompterClient.play()
    if (success) {
      setIsPlaying(true)
      simulator.startSimulation()
      setLastCommand('PLAY sent')
    }
  }, [teleprompterClient, simulator])
  
  const handlePause = useCallback(() => {
    console.log('📤 Sending PAUSE command')
    const success = teleprompterClient.pause()
    if (success) {
      setIsPlaying(false)
      simulator.stopSimulation()
      setLastCommand('PAUSE sent')
    }
  }, [teleprompterClient, simulator])
  
  const handleSeek = useCallback((lineIndex) => {
    console.log('📤 Sending SEEK to line:', lineIndex)
    const success = teleprompterClient.seekAbsolute(lineIndex)
    if (success) {
      setLastCommand(`SEEK_ABS ${lineIndex}`)
    }
  }, [teleprompterClient])
  
  const handleNudge = useCallback((delta) => {
    console.log('📤 Sending NUDGE:', delta)
    const success = teleprompterClient.seekRelative(delta)
    if (success) {
      setLastCommand(`SEEK_REL ${delta}`)
    }
  }, [teleprompterClient])
  
  // Update parameter
  const updateParam = useCallback((key, value) => {
    setCurrentParams(prev => {
      const newParams = { ...prev, [key]: value }
      
      // Auto-send params when they change (debounced)
      setTimeout(() => {
        const success = teleprompterClient.setParams({
          speed: newParams.speed,
          fontSize: newParams.fontSize,
          lineHeight: newParams.lineHeight,
          mirror: newParams.mirror,
          margins: newParams.margins
        })
        if (success) {
          simulator.updateParams(newParams)
        }
      }, 300)
      
      return newParams
    })
  }, [teleprompterClient, simulator])
  
  // Reading line drag handler for super light mode
  const handleReadingLineDrag = useCallback((percentage) => {
    if (currentParams.superLightMode) {
      simulator.handleReadingLineDrag(percentage)
    }
  }, [currentParams.superLightMode, simulator])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
      
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          isPlaying ? handlePause() : handlePlay()
          break
        case 'ArrowUp':
          e.preventDefault()
          handleNudge(e.shiftKey ? -5 : -1)
          break
        case 'ArrowDown':
          e.preventDefault()
          handleNudge(e.shiftKey ? 5 : 1)
          break
        case 'Home':
          e.preventDefault()
          handleSeek(0)
          break
        case 'End':
          e.preventDefault()
          handleSeek(simulator.lines.length - 1)
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, handlePlay, handlePause, handleNudge, handleSeek, simulator.lines.length])
  
  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
          >
            🏠 Startseite
          </button>
          <h1 className="text-lg font-medium text-white">🎛️ Regie v2.0 (Ghost Simulation)</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`text-xs px-2 py-1 rounded font-medium ${
            teleprompterClient.connectionStatus === 'connected' 
              ? 'bg-green-600 text-white' 
              : teleprompterClient.connectionStatus === 'connecting'
              ? 'bg-yellow-600 text-white'
              : 'bg-red-600 text-white'
          }`}>
            {teleprompterClient.connectionStatus === 'connected' ? '🟢 Connected' :
             teleprompterClient.connectionStatus === 'connecting' ? '🟡 Connecting...' : '🔴 Disconnected'}
          </div>
          
          <div className="text-xs px-2 py-1 rounded bg-blue-600 text-white font-medium">
            RTT: {teleprompterClient.rtt.toFixed(0)}ms
          </div>
          
          <div className="text-xs text-gray-400">
            {lastCommand}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 flex-1 overflow-y-auto">
            
            {/* Connection & Script Management */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-300 mb-3">📡 Script Management</h3>
              <div className="space-y-2">
                <button
                  onClick={sendScript}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  disabled={!rawContent.trim() || !teleprompterClient.isConnected}
                >
                  📤 Send Script to iPad
                </button>
                
                <button
                  onClick={sendParams}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                  disabled={!teleprompterClient.isConnected}
                >
                  ⚙️ Send Parameters
                </button>
              </div>
            </div>
            
            {/* Playback Controls */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-300 mb-3">🎮 Playback Control</h3>
              <div className="space-y-2">
                <button
                  onClick={isPlaying ? handlePause : handlePlay}
                  className={`w-full px-4 py-2 text-white rounded transition-colors ${
                    isPlaying 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  disabled={!teleprompterClient.isConnected}
                >
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleNudge(-5)}
                    className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                  >
                    ⏮️ -5
                  </button>
                  <button
                    onClick={() => handleNudge(-1)}
                    className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                  >
                    ⬆️ -1
                  </button>
                  <button
                    onClick={() => handleNudge(1)}
                    className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                  >
                    ⬇️ +1
                  </button>
                  <button
                    onClick={() => handleNudge(5)}
                    className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                  >
                    ⏭️ +5
                  </button>
                </div>
              </div>
            </div>
            
            {/* Parameters */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-300 mb-3">⚙️ Parameters</h3>
              <div className="space-y-3">
                {/* Speed */}
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Speed: {currentParams.speed} lines/min
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    value={currentParams.speed}
                    onChange={(e) => updateParam('speed', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                {/* Font Size */}
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Font Size: {currentParams.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="120"
                    value={currentParams.fontSize}
                    onChange={(e) => updateParam('fontSize', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                {/* Line Height */}
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Line Height: {currentParams.lineHeight}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={currentParams.lineHeight}
                    onChange={(e) => updateParam('lineHeight', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                {/* Margins */}
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Margins: {currentParams.margins}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentParams.margins}
                    onChange={(e) => updateParam('margins', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                {/* Mirror Controls */}
                <div className="space-y-2">
                  <label className="flex items-center text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={currentParams.mirror.horizontal}
                      onChange={(e) => updateParam('mirror', { 
                        ...currentParams.mirror, 
                        horizontal: e.target.checked 
                      })}
                      className="mr-2"
                    />
                    Horizontal Mirror
                  </label>
                  <label className="flex items-center text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={currentParams.mirror.vertical}
                      onChange={(e) => updateParam('mirror', { 
                        ...currentParams.mirror, 
                        vertical: e.target.checked 
                      })}
                      className="mr-2"
                    />
                    Vertical Mirror
                  </label>
                </div>
              </div>
            </div>
            
            {/* Super Light Mode */}
            <div className="border-t border-gray-700 pt-4">
              <label className="flex items-center text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={currentParams.superLightMode}
                  onChange={(e) => updateParam('superLightMode', e.target.checked)}
                  className="mr-2"
                />
                <span className="flex items-center gap-1">
                  ⚡ Super Light Mode
                  <span className="text-orange-400 text-xs">(Free Tier)</span>
                </span>
              </label>
              <div className="text-xs text-gray-500 mt-1">
                Optimized for Render.com Free Tier
              </div>
            </div>
            
            {/* Performance Metrics */}
            <div className="mt-4 p-3 bg-gray-900 rounded text-xs">
              <div>Simulator State: {simulator.simulatorState}</div>
              <div>Ghost Position: Line {simulator.ghostPosition.lineIndex}</div>
              <div>Drift: {simulator.driftMetrics.estimatedDrift.toFixed(2)}</div>
              <div>KF Age: {simulator.driftMetrics.lastKeyframeAge}ms</div>
              <div>Connection: {simulator.driftMetrics.connectionQuality}</div>
            </div>
            
          </div>
        </div>
        
        {/* Right Panel - Content */}
        {currentParams.superLightMode ? (
          /* Super Light Mode: 50/50 Split */
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Text Editor with Reading Line */}
            <div className="flex-1 bg-gray-900 border-r border-gray-700 flex flex-col">
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                <h3 className="text-sm font-medium text-gray-300">✏️ Text Editor (Super Light)</h3>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-orange-400">
                    ⚡ Performance Mode
                  </div>
                  <div className="text-xs text-gray-500">
                    Lines: {simulator.lines.length}
                  </div>
                </div>
              </div>
              <div className="flex-1 relative overflow-hidden">
                <textarea
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  className="w-full h-full p-4 bg-gray-900 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed"
                  placeholder="Enter your teleprompter text here..."
                  spellCheck={false}
                />
                {/* Reading Line in Text Editor */}
                <div 
                  style={{
                    position: 'absolute',
                    top: `${simulator.getReadingLinePosition()}%`,
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: 'red',
                    zIndex: 10,
                    opacity: 0.8,
                    cursor: 'ns-resize'
                  }}
                  onMouseDown={(e) => {
                    const startY = e.clientY
                    const startPosition = simulator.getReadingLinePosition()
                    
                    const handleMouseMove = (e) => {
                      const deltaY = e.clientY - startY
                      const containerHeight = e.currentTarget.parentElement.clientHeight
                      const newPercentage = startPosition + (deltaY / containerHeight) * 100
                      handleReadingLineDrag(Math.max(0, Math.min(100, newPercentage)))
                    }
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove)
                      document.removeEventListener('mouseup', handleMouseUp)
                    }
                    
                    document.addEventListener('mousemove', handleMouseMove)
                    document.addEventListener('mouseup', handleMouseUp)
                  }}
                >
                  {/* Drag Handle */}
                  <div
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '-8px',
                      width: '16px',
                      height: '16px',
                      backgroundColor: 'red',
                      borderRadius: '50%',
                      opacity: 0.8
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Right: Small Static Preview */}
            <div className="w-80 bg-gray-950 flex flex-col">
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                <h3 className="text-sm font-medium text-gray-300">📺 Static Preview</h3>
                <div className="text-xs text-gray-500">
                  Font Preview Only
                </div>
              </div>
              <div className="flex-1 bg-black p-4 overflow-hidden">
                <div style={{
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: `${currentParams.fontSize * 0.3}px`,
                  lineHeight: currentParams.lineHeight,
                  color: 'white',
                  transform: `scaleX(${currentParams.mirror.horizontal ? -1 : 1}) scaleY(${currentParams.mirror.vertical ? -1 : 1})`,
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}>
                  {rawContent.split('\n').slice(0, 10).join('\n')}
                  {rawContent.split('\n').length > 10 && '\n...'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Mode: Ghost Preview + Editor */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Ghost Preview */}
            <div className="flex-1 bg-gray-950 min-h-0 border-b border-gray-700">
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-300">👻 Ghost Preview (Simulation)</h3>
                <div className="text-xs text-blue-400">
                  Based on iPad Keyframes
                </div>
              </div>
              <div className="h-full bg-black p-4 overflow-hidden relative">
                <div style={{
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: `${currentParams.fontSize * 0.4}px`,
                  lineHeight: currentParams.lineHeight,
                  color: 'white',
                  transform: `translate3d(0, ${-simulator.ghostPosition.scrollY * 0.4}px, 0) scaleX(${currentParams.mirror.horizontal ? -1 : 1}) scaleY(${currentParams.mirror.vertical ? -1 : 1})`,
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  transition: 'none'
                }}>
                  {rawContent}
                </div>
                
                {/* Ghost Reading Line */}
                <div style={{
                  position: 'absolute',
                  top: '25%',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: 'rgba(0, 255, 255, 0.8)',
                  zIndex: 10
                }} />
              </div>
            </div>
            
            {/* Text Editor */}
            <div className="h-64 bg-gray-900 flex flex-col">
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-300">✏️ Text Editor</h3>
                <div className="flex items-center gap-3">
                  {/* File Management */}
                  <input
                    type="file"
                    multiple
                    accept=".txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded cursor-pointer transition-colors"
                  >
                    📄 Upload
                  </label>
                  {files.length > 0 && (
                    <select
                      value={activeFileId || ''}
                      onChange={(e) => handleFileSelect(e.target.value)}
                      className="px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600"
                    >
                      <option value="">Select file...</option>
                      {files.map(file => (
                        <option key={file.id} value={file.id}>
                          {file.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {activeFileId && (
                    <button
                      onClick={() => handleDeleteFile(activeFileId)}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                className="flex-1 w-full p-4 bg-gray-900 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your teleprompter text here..."
                spellCheck={false}
              />
            </div>
          </div>
        )}
        
      </div>
    </div>
  )
}

export default NewRegieApp
