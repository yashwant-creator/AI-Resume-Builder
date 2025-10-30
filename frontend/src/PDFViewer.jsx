import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

export default function PDFViewer() {
  const location = useLocation()
  const navigate = useNavigate()
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get resume data from navigation state
  const resumeData = location.state?.resumeData
  const pdfUrl = resumeData?.download_url

  useEffect(() => {
    if (!resumeData || !pdfUrl) {
      navigate('/')
    }
  }, [resumeData, pdfUrl, navigate])

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages)
    setLoading(false)
  }

  function onDocumentLoadError(error) {
    console.error('Error loading PDF:', error)
    setError('Failed to load PDF document')
    setLoading(false)
  }

  function downloadPdf() {
    if (resumeData?.pdf_filename) {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = `enhanced_resume_${resumeData.applicant_name || 'resume'}.pdf`
      link.click()
    }
  }

  function downloadLatex() {
    if (resumeData?.latex_code) {
      const blob = new Blob([resumeData.latex_code], { type: 'text/plain' })
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

        {pdfUrl && (
          <Document
            file={pdfUrl}
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
      {resumeData.latex_code && (
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
              {resumeData.latex_code}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}