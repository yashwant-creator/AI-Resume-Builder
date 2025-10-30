import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up PDF.js worker using local version
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export default function PDFViewer() {
  const location = useLocation()
  const navigate = useNavigate()
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Chat/Suggestions state
  const [chatMessages, setChatMessages] = useState([])
  const [userMessage, setUserMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showChat, setShowChat] = useState(false)

  // Get resume data from navigation state
  const resumeData = location.state?.resumeData
  // Keep track of current latex code (updates when refined)
  const [currentLatexCode, setCurrentLatexCode] = useState(resumeData?.latex_code || '')
  const [currentPdfUrl, setCurrentPdfUrl] = useState(
    resumeData?.download_url ? `http://localhost:8000${resumeData.download_url}` : null
  )
  
  // Job description for context
  const jobDescription = resumeData?.job_description || ''

  useEffect(() => {
    if (!resumeData || !currentPdfUrl) {
      navigate('/')
    }
  }, [resumeData, currentPdfUrl, navigate])

  async function sendSuggestion(e) {
    e.preventDefault()
    if (!userMessage.trim() || isSending) return

    const newUserMessage = { role: 'user', content: userMessage }
    setChatMessages(prev => [...prev, newUserMessage])
    
    // Append instruction to ensure complete LaTeX code is returned
    const enhancedFeedback = `${userMessage}\n\nIMPORTANT: Make ONLY the changes mentioned above and return the ENTIRE resume LaTeX code with the refined changes. Do not return partial code or snippets.`
    
    setUserMessage('')
    setIsSending(true)

    try {
      const form = new FormData()
      form.append('latex_code', currentLatexCode)
      form.append('feedback', enhancedFeedback)
      form.append('job_description', jobDescription || '')  // Send empty string if not available

      console.log('Sending refinement request:', {
        latex_length: currentLatexCode.length,
        feedback: userMessage,
        jd_length: (jobDescription || '').length
      })

      const res = await fetch('http://localhost:8000/api/refine-resume', {
        method: 'POST',
        body: form
      })

      console.log('Refinement response status:', res.status)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server error (${res.status})` }))
        console.error('Refinement error:', errorData)
        throw new Error(errorData.error || errorData.detail || 'Failed to refine resume')
      }

      const data = await res.json()
      console.log('Refinement success:', data)

      if (data.success) {
        // Update the current LaTeX code and PDF URL
        setCurrentLatexCode(data.latex_code)
        setCurrentPdfUrl(`http://localhost:8000${data.download_url}`)
        
        // Add AI response to chat
        const aiMessage = {
          role: 'assistant',
          content: `✅ Resume updated successfully! ${data.message || ''}`,
          suggestions: data.suggestions || []
        }
        setChatMessages(prev => [...prev, aiMessage])
        
        // Reset PDF viewer
        setLoading(true)
        setPageNumber(1)
      } else {
        throw new Error(data.error || 'Refinement failed')
      }
    } catch (err) {
      console.error('Chat error:', err)
      const errorMessage = {
        role: 'assistant',
        content: `❌ Error: ${err.message}`,
        isError: true
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsSending(false)
    }
  }

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages)
    setLoading(false)
  }

  function onDocumentLoadError(error) {
    console.error('Error loading PDF:', error)
    console.error('PDF URL:', currentPdfUrl)
    console.error('Resume Data:', resumeData)
    setError(`Failed to load PDF document: ${error.message || 'Unknown error'}`)
    setLoading(false)
  }

  function downloadPdf() {
    if (currentPdfUrl) {
      const link = document.createElement('a')
      link.href = currentPdfUrl
      link.download = `enhanced_resume_${resumeData.applicant_name || 'resume'}.pdf`
      link.click()
    }
  }

  function downloadLatex() {
    if (currentLatexCode) {
      const blob = new Blob([currentLatexCode], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `resume_${resumeData.applicant_name || 'professional'}.tex`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  if (!resumeData) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>No resume data found. Redirecting...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', fontFamily: 'Arial, sans-serif', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#2563eb', marginBottom: '0.5rem' }}>📄 Enhanced Resume Preview</h1>
        <p style={{ color: '#6b7280', fontSize: '18px' }}>
          Enhanced resume for {resumeData.applicant_name || 'Professional'}
        </p>
      </div>

      {/* Navigation and Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem',
        backgroundColor: '#f8fafc',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            backgroundColor: '#6b7280',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ← Back to Form
        </button>

        {numPages && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Page Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: pageNumber <= 1 ? '#f3f4f6' : 'white',
                  cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ←
              </button>
              <span style={{ fontSize: '14px', color: '#374151' }}>
                Page {pageNumber} of {numPages}
              </span>
              <button 
                onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                disabled={pageNumber >= numPages}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: pageNumber >= numPages ? '#f3f4f6' : 'white',
                  cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer'
                }}
              >
                →
              </button>
            </div>

            {/* Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                −
              </button>
              <span style={{ fontSize: '14px', color: '#374151', minWidth: '60px', textAlign: 'center' }}>
                {Math.round(scale * 100)}%
              </span>
              <button 
                onClick={() => setScale(Math.min(2.0, scale + 0.1))}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Download Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={downloadPdf}
            style={{
              backgroundColor: '#059669',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📥 Download PDF
          </button>
          <button 
            onClick={downloadLatex}
            style={{
              backgroundColor: '#7c3aed',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📝 Download LaTeX
          </button>
        </div>
      </div>

      {/* AI Suggestions */}
      {resumeData.suggestions && resumeData.suggestions.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          border: '1px solid #bbf7d0'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#059669' }}>💡 AI Suggestions for Future Improvements:</h3>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#374151' }}>
            {resumeData.suggestions.map((suggestion, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Chat Interface for Suggestions */}
      <div style={{
        marginBottom: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setShowChat(!showChat)}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#f8fafc',
            border: 'none',
            borderBottom: showChat ? '1px solid #e2e8f0' : 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#374151'
          }}
        >
          <span>💬 Ask AI to Improve Your Resume</span>
          <span>{showChat ? '▼' : '▶'}</span>
        </button>

        {showChat && (
          <div style={{ padding: '16px' }}>
            {/* Chat Messages */}
            {chatMessages.length > 0 && (
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px'
              }}>
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: '12px',
                      padding: '12px',
                      backgroundColor: msg.role === 'user' ? '#dbeafe' : msg.isError ? '#fee2e2' : '#f0fdf4',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${msg.role === 'user' ? '#2563eb' : msg.isError ? '#dc2626' : '#059669'}`
                    }}
                  >
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                      color: msg.role === 'user' ? '#1e40af' : msg.isError ? '#991b1b' : '#047857'
                    }}>
                      {msg.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </div>
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '13px' }}>
                        {msg.suggestions.map((s, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={sendSuggestion} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="e.g., 'Add more quantifiable achievements' or 'Make the summary more concise'"
                disabled={isSending}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="submit"
                disabled={isSending || !userMessage.trim()}
                style={{
                  backgroundColor: isSending || !userMessage.trim() ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: isSending || !userMessage.trim() ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {isSending ? '⏳ Sending...' : '✨ Improve'}
              </button>
            </form>

            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '8px',
              marginBottom: '0'
            }}>
              💡 Tip: Be specific with your requests for best results!
            </p>
          </div>
        )}
      </div>

      {/* PDF Viewer */}
      <div style={{ 
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        minHeight: '500px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: loading || error ? 'center' : 'flex-start'
      }}>
        {loading && (
          <div style={{ color: '#6b7280' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔄</div>
            <p>Loading PDF...</p>
          </div>
        )}

        {error && (
          <div style={{ color: '#dc2626' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
            <p>{error}</p>
            <button 
              onClick={downloadPdf}
              style={{
                marginTop: '12px',
                backgroundColor: '#059669',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Try Direct Download
            </button>
          </div>
        )}

        {currentPdfUrl && (
          <Document
            key={currentPdfUrl}
            file={{
              url: currentPdfUrl,
              httpHeaders: {
                'Accept': 'application/pdf',
              },
              withCredentials: false
            }}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
            error=""
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        )}
      </div>

      {/* LaTeX Code Section */}
      {currentLatexCode && (
        <div style={{ marginTop: '24px' }}>
          <details style={{ cursor: 'pointer' }}>
            <summary style={{
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#374151'
            }}>
              📝 View Generated LaTeX Code (Click to expand)
            </summary>
            <pre style={{
              backgroundColor: '#f1f5f9',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '400px',
              marginTop: '8px',
              border: '1px solid #e2e8f0',
              fontFamily: 'Monaco, Consolas, monospace'
            }}>
              {currentLatexCode}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}