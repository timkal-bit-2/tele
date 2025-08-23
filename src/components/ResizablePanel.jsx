import { useState, useCallback } from 'react'

const ResizablePanel = ({ 
  children, 
  direction = 'horizontal', // 'horizontal' or 'vertical'
  initialSize = '50%',
  minSize = '20%',
  maxSize = '80%',
  className = ''
}) => {
  const [size, setSize] = useState(initialSize)
  const [isDragging, setIsDragging] = useState(false)

  // Helper function to parse size values (px or %)
  const parseSize = (sizeValue) => {
    if (typeof sizeValue === 'string') {
      if (sizeValue.endsWith('px')) {
        return { value: parseFloat(sizeValue), unit: 'px' }
      } else if (sizeValue.endsWith('%')) {
        return { value: parseFloat(sizeValue), unit: '%' }
      }
    }
    return { value: parseFloat(sizeValue), unit: '%' }
  }

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)

    const startPos = direction === 'horizontal' ? e.clientX : e.clientY
    const startSizeObj = parseSize(size)

    const handleMouseMove = (e) => {
      const container = e.target.closest('.resizable-container')
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY
      const containerSize = direction === 'horizontal' ? containerRect.width : containerRect.height
      
      const deltaPos = currentPos - startPos
      
      let newSize
      if (startSizeObj.unit === 'px') {
        newSize = Math.max(
          parseSize(minSize).value, 
          Math.min(parseSize(maxSize).value, startSizeObj.value + deltaPos)
        )
        setSize(`${newSize}px`)
      } else {
        const deltaPercent = (deltaPos / containerSize) * 100
        newSize = Math.max(
          parseSize(minSize).value, 
          Math.min(parseSize(maxSize).value, startSizeObj.value + deltaPercent)
        )
        setSize(`${newSize}%`)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [direction, size, minSize, maxSize])

  const resizeHandleStyle = {
    [direction === 'horizontal' ? 'width' : 'height']: '4px',
    [direction === 'horizontal' ? 'height' : 'width']: '100%',
    backgroundColor: isDragging ? '#3b82f6' : '#374151',
    cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
    position: 'relative',
    transition: isDragging ? 'none' : 'background-color 0.2s ease',
    borderRadius: '2px'
  }

  const hoverLineStyle = {
    position: 'absolute',
    [direction === 'horizontal' ? 'left' : 'top']: '50%',
    [direction === 'horizontal' ? 'top' : 'left']: '50%',
    transform: 'translate(-50%, -50%)',
    [direction === 'horizontal' ? 'width' : 'height']: '2px',
    [direction === 'horizontal' ? 'height' : 'width']: '20px',
    backgroundColor: '#6b7280',
    borderRadius: '1px'
  }

  return (
    <>
      <div 
        className={className}
        style={{ 
          [direction === 'horizontal' ? 'width' : 'height']: size,
          flexShrink: 0 
        }}
      >
        {children}
      </div>
      <div 
        style={resizeHandleStyle}
        onMouseDown={handleMouseDown}
        className="hover:bg-blue-500 flex items-center justify-center"
      >
        <div style={hoverLineStyle} />
      </div>
    </>
  )
}

export default ResizablePanel
