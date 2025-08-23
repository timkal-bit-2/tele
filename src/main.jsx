import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StartPage from './components/StartPage.jsx'
import App from './App.jsx' // Legacy App
import NewRegieApp from './components/NewRegieApp.jsx' // New v2.0 App
import AusspielungPage from './components/AusspielungPage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/regie" element={<App />} />
        <Route path="/regie-v2" element={<NewRegieApp />} />
        <Route path="/ausspielung" element={<AusspielungPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
