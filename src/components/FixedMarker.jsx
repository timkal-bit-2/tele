/**
 * FixedMarker - Static position marker for teleprompter
 * 
 * Shows current reading position as a fixed horizontal bar.
 * Text scrolls underneath, marker stays in place.
 * 
 * - Output: 30% from top
 * - Input: 40% from top (look ahead)
 */
const FixedMarker = ({
  position = 'output', // 'output' or 'input'
  className = '',
  style = {},
  children = null
}) => {
  
  // Position percentages from your specification
  const positionPercent = position === 'output' ? 30 : 40

  const markerStyle = {
    position: 'absolute',
    top: `${positionPercent}%`,
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: '#ff6b35', // Orange marker color
    zIndex: 100,
    pointerEvents: 'none',
    
    // Visual enhancements
    boxShadow: '0 0 8px rgba(255, 107, 53, 0.6)',
    
    // Make output marker transparent
    opacity: position === 'output' ? 0 : 1,
    
    ...style
  }

  const containerStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden'
  }

  return (
    <div style={containerStyle} className={className}>
      {/* Fixed marker line */}
      <div 
        style={markerStyle}
        data-marker-position={position}
        data-marker-percent={positionPercent}
      />
      
      {/* Optional marker label */}
      {children && (
        <div
          style={{
            position: 'absolute',
            top: `${positionPercent}%`,
            right: '10px',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            color: '#ff6b35',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '2px 6px',
            borderRadius: '3px',
            zIndex: 101,
            pointerEvents: 'none',
            fontFamily: 'monospace'
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default FixedMarker
