# 🎯 ATS Resume Builder

A powerful system that transforms your resume to match any job description, creating ATS-friendly PDF outputs.

## ✨ Features

- **Smart Job Description Analysis**: Extracts key skills and requirements
- **Resume Enhancement**: Tailors your experience to match job requirements  
- **ATS-friendly PDF Generation**: Creates scanner-friendly resume formats
- **Professional UI**: Clean, intuitive interface with progress indicators
- **Real-time Processing**: Fast analysis and PDF generation

## � System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
│                                                                      │
│   ┌─────────────┐         ┌─────────────┐        ┌─────────────┐    │
│   │   Resume    │         │    Job      │        │   Chat      │    │
│   │   Upload    │         │Description  │        │ Interface   │    │
│   └─────┬───────┘         └─────┬───────┘        └─────┬───────┘    │
│         │                       │                      │            │
└─────────┼───────────────────────┼──────────────────────┼────────────┘
          │                       │                      │
          ▼                       ▼                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                       │
│                              Port: 5174                              │
│                                                                      │
│   ┌─────────────┐         ┌─────────────┐        ┌─────────────┐    │
│   │ File Upload │         │  PDF View   │        │ Chat UI     │    │
│   │  Handler    │         │ Component   │        │ Component   │    │
│   └─────┬───────┘         └─────┬───────┘        └─────┬───────┘    │
│         │                       │                      │            │
└─────────┼───────────────────────┼──────────────────────┼────────────┘
          │                       │                      │
          └─────────────┬─────────┴──────────┬──────────┘
                       │                     │
                       ▼                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI)                            │
│                             Port: 8000                               │
│                                                                      │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐       │
│   │   Resume    │     │   GPT-4     │     │    LaTeX        │       │
│   │   Parser    │ --> │  Generator  │ --> │   Compiler      │       │
│   └─────────────┘     └─────────────┘     └─────────────────┘       │
│          │                   │                     │                 │
│          │                   │                     │                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐       │
│   │  Template   │     │ Refinement  │     │    Error        │       │
│   │  Storage    │     │   Engine    │ <-- │    Handler      │       │
│   └─────────────┘     └─────────────┘     └─────────────────┘       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

Data Flow:
1. User uploads resume + job description
2. Frontend sends files to backend (/api/enhance-resume)
3. Backend processes:
   - Parses resume (PDF/DOCX/TXT)
   - Generates LaTeX using GPT-4
   - Compiles LaTeX to PDF
4. If compilation fails:
   - Error handler activates
   - GPT-4 refines LaTeX
   - Retries compilation (3-5 attempts)
5. Success:
   - PDF saved and URL returned
   - Frontend displays result
6. User can request refinements via chat
   - Sent to /api/refine-resume
   - Processed with lower temperature
   - Updates reflected in real-time
```

## �🚀 Quick Start

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

graph TD
    %% User Interface
    User([User]) --> Frontend[Frontend React/Vite<br/>Port: 5174]
    
    %% Frontend to Backend Communication
    Frontend -->|POST /api/enhance-resume<br/>Upload Resume + Job Description| Backend[Backend FastAPI<br/>Port: 8000]
    
    %% Backend Processing
    Backend --> Parser[Resume Parser<br/>PDF/DOCX/TXT]
    Parser -->|Structured Data| GPT[GPT-4 Processing<br/>temp: 0.3]
    GPT -->|LaTeX Code| LatexCompiler[LaTeX Compiler<br/>pdflatex]
    
    %% Compilation Results
    LatexCompiler -->|Success| SavePDF[Save PDF]
    LatexCompiler -->|Error| FeedbackLoop[Feedback Loop<br/>3-5 attempts]
    
    %% Feedback Loop
    FeedbackLoop -->|Error + LaTeX| GPTFix[GPT-4 Fix<br/>temp: 0.1]
    GPTFix --> LatexCompiler
    
    %% PDF Return
    SavePDF --> Frontend
    
    %% Refinement Flow
    Frontend -->|POST /api/refine-resume<br/>Chat Request| RefinementGPT[GPT-4 Refinement<br/>temp: 0.05]
    RefinementGPT --> Validation[Validation<br/>Length + Structure]
    Validation --> LatexCompiler
    
    %% Styling
    classDef frontend fill:#42b883,stroke:#333,stroke-width:2px,color:white
    classDef backend fill:#306998,stroke:#333,stroke-width:2px,color:white
    classDef process fill:#666,stroke:#333,stroke-width:2px,color:white
    classDef gpt fill:#10a37f,stroke:#333,stroke-width:2px,color:white
    
    %% Apply styles
    class Frontend frontend
    class Backend,Parser,LatexCompiler backend
    class SavePDF,Validation,FeedbackLoop process
    class GPT,GPTFix,RefinementGPT gpt


