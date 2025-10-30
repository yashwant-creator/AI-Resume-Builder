import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function App() {
  const navigate = useNavigate()
  const [jd, setJd] = useState('')
  const [file, setFile] = useState(null)
  const [resp, setResp] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!file) return alert('Please select a resume file (PDF or DOCX)')
    if (!jd.trim()) return alert('Please enter a job description')
    
    setLoading(true)
    setError(null)
    setResp(null)

    try {
      const form = new FormData()
      form.append('jd_text', jd)
      form.append('resume_file', file)

      const res = await fetch('/api/enhance-resume', { method: 'POST', body: form })
      
      // Check if response is ok before trying to parse JSON
      if (!res.ok) {
        const contentType = res.headers.get('content-type')
        let errorMsg = `Server error (${res.status})`
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await res.json()
            errorMsg = errorData.error || errorData.detail || errorData.message || errorMsg
          } catch (e) {
            errorMsg = `Server error (${res.status}): ${res.statusText}`
          }
        } else {
          const text = await res.text()
          errorMsg = text || errorMsg
        }
        
        setError(errorMsg)
        setLoading(false)
        return
      }
      
      const data = await res.json()
      
      if (data.success) {
        setResp(data)
      } else {
        setError(data.error || data.detail || data.message || 'Enhancement failed')
      }
    } catch (err) {
      setError(`Network error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  function downloadPdf() {
    if (resp?.pdf_filename) {
      const link = document.createElement('a')
      link.href = resp.download_url
      link.download = `enhanced_resume_${resp.applicant_name || 'resume'}.pdf`
      link.click()
    }
  }

  function downloadLatex() {
    if (resp?.latex_code) {
      const blob = new Blob([resp.latex_code], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `resume_${resp.applicant_name || 'professional'}.tex`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div style={{maxWidth:900, margin:'2rem auto', fontFamily:'Arial, sans-serif', padding:'0 20px'}}>
      <div style={{textAlign:'center', marginBottom:'2rem'}}>
        <h1 style={{color:'#2563eb', marginBottom:'0.5rem'}}>🎯 ATS Resume Builder</h1>
        <p style={{color:'#6b7280', fontSize:'18px'}}>Transform your resume to match any job description</p>
      </div>

      <form onSubmit={submit} style={{backgroundColor:'#f8fafc', padding:'24px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
        <div style={{marginBottom:'20px'}}>
          <label style={{display:'block', fontWeight:'bold', marginBottom:'8px', color:'#374151'}}>
            📋 Job Description
          </label>
          <textarea 
            value={jd} 
            onChange={e=>setJd(e.target.value)} 
            rows={8} 
            placeholder="Paste the job description here..."
            style={{
              width:'100%', 
              padding:'12px', 
              borderRadius:'8px', 
              border:'1px solid #d1d5db',
              fontSize:'14px',
              fontFamily:'inherit'
            }}
          />
        </div>
        
        <div style={{marginBottom:'24px'}}>
          <label style={{display:'block', fontWeight:'bold', marginBottom:'8px', color:'#374151'}}>
            📄 Your Resume (PDF or DOCX)
          </label>
          <input 
            type="file" 
            accept=".pdf,.docx" 
            onChange={e=>setFile(e.target.files[0])}
            style={{
              padding:'8px 12px',
              border:'1px solid #d1d5db',
              borderRadius:'6px',
              backgroundColor:'white'
            }}
          />
          {file && (
            <p style={{fontSize:'12px', color:'#059669', marginTop:'4px'}}>
              ✓ Selected: {file.name}
            </p>
          )}
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          style={{
            backgroundColor: loading ? '#9ca3af' : '#2563eb',
            color: 'white',
            padding: '12px 32px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%',
            transition: 'all 0.2s'
          }}
        >
          {loading ? '🔄 Enhancing Resume...' : '✨ Enhance My Resume'}
        </button>
      </form>

      {error && (
        <div style={{
          marginTop:'20px', 
          padding:'16px', 
          backgroundColor:'#fef2f2', 
          border:'1px solid #fecaca', 
          borderRadius:'8px',
          color:'#dc2626'
        }}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {resp && resp.success && (
        <div style={{
          marginTop:'24px', 
          padding:'24px', 
          backgroundColor:'#f0fdf4', 
          border:'1px solid #bbf7d0', 
          borderRadius:'12px'
        }}>
          <h3 style={{color:'#059669', marginTop:'0', marginBottom:'16px'}}>
            🎉 Resume Enhanced Successfully!
          </h3>
          
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px', marginBottom:'20px'}}>
            <div style={{textAlign:'center', padding:'12px', backgroundColor:'white', borderRadius:'8px'}}>
              <div style={{fontSize:'24px', fontWeight:'bold', color:'#2563eb'}}>GPT-4o</div>
              <div style={{fontSize:'12px', color:'#6b7280'}}>AI Engine</div>
            </div>
            <div style={{textAlign:'center', padding:'12px', backgroundColor:'white', borderRadius:'8px'}}>
              <div style={{fontSize:'24px', fontWeight:'bold', color:'#059669'}}>LaTeX</div>
              <div style={{fontSize:'12px', color:'#6b7280'}}>Professional Format</div>
            </div>
            <div style={{textAlign:'center', padding:'12px', backgroundColor:'white', borderRadius:'8px'}}>
              <div style={{fontSize:'16px', fontWeight:'bold', color:'#7c3aed'}}>{resp.applicant_name || 'Professional'}</div>
              <div style={{fontSize:'12px', color:'#6b7280'}}>Applicant</div>
            </div>
          </div>
          
          {resp.suggestions && resp.suggestions.length > 0 && (
            <div style={{marginBottom:'20px', padding:'16px', backgroundColor:'#f8fafc', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
              <h4 style={{margin:'0 0 12px 0', color:'#374151'}}>💡 AI Suggestions for Improvement:</h4>
              <ul style={{margin:'0', paddingLeft:'20px', fontSize:'14px', color:'#6b7280'}}>
                {resp.suggestions.map((suggestion, idx) => (
                  <li key={idx} style={{marginBottom:'4px'}}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          
          {resp.latex_code && (
            <div style={{marginBottom:'20px'}}>
              <details style={{cursor:'pointer'}}>
                <summary style={{padding:'8px 0', fontSize:'14px', color:'#6b7280', fontWeight:'bold'}}>
                  📝 View Generated LaTeX Code (Click to expand)
                </summary>
                <pre style={{
                  backgroundColor:'#f1f5f9', 
                  padding:'12px', 
                  borderRadius:'6px', 
                  fontSize:'12px', 
                  overflow:'auto',
                  maxHeight:'300px',
                  marginTop:'8px',
                  border:'1px solid #e2e8f0'
                }}>
                  {resp.latex_code}
                </pre>
              </details>
            </div>
          )}

          {/* Primary Action - View PDF */}
          {resp.pdf_filename && (
            <button 
              onClick={() => navigate('/pdf-viewer', { state: { resumeData: resp } })}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '16px 32px',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '100%',
                marginBottom: '16px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
              }}
              onMouseOver={e => {
                e.target.style.backgroundColor = '#1d4ed8'
                e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={e => {
                e.target.style.backgroundColor = '#2563eb'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              👁️ View Enhanced Resume
            </button>
          )}

          <div style={{display:'grid', gridTemplateColumns:resp.pdf_filename ? '1fr 1fr' : '1fr', gap:'12px'}}>
            {resp.pdf_filename ? (
              <button 
                onClick={downloadPdf}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.target.style.backgroundColor = '#047857'}
                onMouseOut={e => e.target.style.backgroundColor = '#059669'}
              >
                📥 Download PDF
              </button>
            ) : (
              <div style={{
                padding: '12px', 
                backgroundColor: '#fef3c7', 
                border: '1px solid #f59e0b', 
                borderRadius: '8px',
                fontSize: '14px',
                color: '#92400e',
                textAlign: 'center'
              }}>
                ⚠️ LaTeX not installed - PDF generation unavailable. Download LaTeX code below.
              </div>
            )}
            
            <button 
              onClick={downloadLatex}
              style={{
                backgroundColor: '#7c3aed',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.target.style.backgroundColor = '#6d28d9'}
              onMouseOut={e => e.target.style.backgroundColor = '#7c3aed'}
            >
              � Download LaTeX Code
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
