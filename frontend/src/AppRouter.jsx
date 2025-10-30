import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import App from './App'
import PDFViewer from './PDFViewer'

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/pdf-viewer" element={<PDFViewer />} />
      </Routes>
    </Router>
  )
}