# 🎯 ATS Resume Builder

A powerful system that transforms your resume to match any job description, creating ATS-friendly PDF outputs.

## ✨ Features

- **Smart Job Description Analysis**: Extracts key skills and requirements
- **Resume Enhancement**: Tailors your experience to match job requirements  
- **ATS-friendly PDF Generation**: Creates scanner-friendly resume formats
- **Professional UI**: Clean, intuitive interface with progress indicators
- **Real-time Processing**: Fast analysis and PDF generation

## 🚀 Quick Start

### Backend (FastAPI)
```bash
cd backend
pip install --break-system-packages fastapi uvicorn python-multipart jinja2 reportlab python-docx pdfplumber yake
python3 start_server.py
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

### Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://127.0.0.1:8000

## 🔧 Tech Stack

### Backend
- **FastAPI**: Modern Python web framework  
- **ReportLab**: PDF generation
- **pdfplumber**: PDF text extraction
- **python-docx**: Word document processing
- **YAKE**: Keyword extraction

### Frontend
- **React**: UI framework
- **Vite**: Fast build tool
- **Modern CSS**: Professional styling

## 📋 How to Use

1. **Paste Job Description**: Copy and paste the target job description
2. **Upload Resume**: Select your resume file (PDF or DOCX) 
3. **Click "Enhance My Resume"**: Let the system do the magic
4. **Download Enhanced PDF**: Get your ATS-optimized resume

## 🎯 ATS-Friendly Features

- ✅ Clean fonts (Helvetica/Arial)
- ✅ Standard section headers  
- ✅ Bullet point formatting
- ✅ No tables or complex layouts
- ✅ Keyword optimization
- ✅ Consistent spacing and formatting

---

**Built for the modern job market** 🌟

This scaffold contains a minimal backend and a small frontend stub to start the resume tailoring project.

Next steps:
- Implement JD parsing and resume parsing endpoints in `backend/main.py`.
- Wire LLM integration using environment variable `OPENAI_API_KEY` (optional).
- Implement PDF generation from `backend/templates/resume_template.html`.
