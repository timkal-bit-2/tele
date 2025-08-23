import { useState, useEffect } from 'react'

function App() {
  console.log('App rendering...') // Debug log
  
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: 'red', 
      color: 'white', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      fontSize: '24px'
    }}>
      <h1>TEST - SIEHST DU MICH?</h1>
    </div>
  )
}

export default App
