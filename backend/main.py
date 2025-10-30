from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from parsers import parse_resume_file
from gpt_latex_generator import generate_latex_resume, refine_latex_resume, get_resume_suggestions, save_latex_file
from latex_compiler import compile_with_fallback, check_latex_installation
from pathlib import Path
import uuid
import shutil
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
TEMPLATE_DIR = BASE_DIR / "templates"
UPLOAD_DIR.mkdir(exist_ok=True)
TEMPLATE_DIR.mkdir(exist_ok=True)

app = FastAPI(title="ATS-Builder Backend")

# Allow CORS from Vite dev server during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response validation
class ResumeRefinementRequest(BaseModel):
    latex_code: str
    feedback: str
    job_description: str = ""

class SuggestionsRequest(BaseModel):
    latex_code: str
    job_description: str = ""


@app.get("/")
def root():
    html = "<html><body><h2>ATS-Builder Backend</h2><p>The backend is running. Run the frontend (Vite) and open <a href='http://localhost:5173'>http://localhost:5173</a> to use the UI.</p><p>API status: <a href='/api/status'>/api/status</a></p></body></html>"
    return HTMLResponse(content=html)


@app.get("/api/status")
def status():
    return {"status": "ok"}


@app.post("/api/enhance-resume")
async def enhance_resume(jd_text: str = Form(...), resume_file: UploadFile = File(...)):
    """GPT-powered LaTeX resume generation pipeline."""
    print(f"Received request: JD length={len(jd_text)}, file={resume_file.filename}")
    try:
        # Check if OpenAI API key is available
        if not os.getenv("OPENAI_API_KEY"):
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "OpenAI API key not configured",
                    "message": "Please set OPENAI_API_KEY environment variable"
                }
            )

        # Check if LaTeX is installed
        latex_installed, latex_info = check_latex_installation()
        if not latex_installed:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "LaTeX not installed", 
                    "message": latex_info,
                    "install_help": "Please install LaTeX (brew install --cask basictex)"
                }
            )

        # Validate and save uploaded resume
        if resume_file.content_type not in ("application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"):
            print(f"Warning: Unexpected file type {resume_file.content_type}")

        uid = uuid.uuid4().hex
        dest = UPLOAD_DIR / f"{uid}_{resume_file.filename}"
        with dest.open("wb") as f:
            content = await resume_file.read()
            f.write(content)

        # Parse resume
        print("Parsing resume...")
        parsed_resume = parse_resume_file(str(dest))
        
        if "error" in parsed_resume:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Failed to parse resume",
                    "details": parsed_resume.get("error")
                }
            )
        
        print(f"Resume parsed: work_experience={len(parsed_resume.get('work_experience', []))}")
        
        # Extract applicant name
        applicant_name = parsed_resume.get('contact', {}).get('name', 'Professional Candidate')
        print(f"Applicant name: {applicant_name}")
        
        # Generate LaTeX using GPT
        print("Generating LaTeX with GPT...")
        latex_code = generate_latex_resume(parsed_resume, jd_text, applicant_name)
        print("LaTeX generated successfully")
        
        # Save initial LaTeX file for debugging
        latex_path = save_latex_file(latex_code, f"resume_{uid}_initial")
        print(f"📄 Initial LaTeX saved to: {latex_path}")
        
        # Compile LaTeX to PDF with feedback loop
        MAX_ATTEMPTS = 5
        attempt = 0
        compilation_success = False
        
        while attempt <= MAX_ATTEMPTS and not compilation_success:
            print(f"🔨 Compilation attempt {attempt}/{MAX_ATTEMPTS}...")
            compilation_result = compile_with_fallback(latex_code, f"resume_{uid}_attempt{attempt}")
            
            if compilation_result["success"]:
                compilation_success = True
                pdf_filename = os.path.basename(compilation_result["pdf_path"])
                
                # Save successful LaTeX version
                final_latex_path = save_latex_file(latex_code, f"resume_{uid}_final")
                print(f"✅ Compilation succeeded on attempt {attempt}")
                print(f"📄 Final LaTeX saved to: {final_latex_path}")
                
                # Generate suggestions for improvements
                print("Generating improvement suggestions...")
                suggestions = get_resume_suggestions(latex_code, jd_text)
                
                return JSONResponse(
                    status_code=200,
                    content={
                        "success": True,
                        "message": f"Resume generated successfully (compiled on attempt {attempt}/{MAX_ATTEMPTS})",
                        "pdf_filename": pdf_filename,
                        "latex_path": final_latex_path,
                        "applicant_name": applicant_name,
                        "download_url": f"/api/download-pdf/{pdf_filename}",
                        "suggestions": suggestions,
                        "compilation_attempts": attempt,
                        "latex_code": latex_code[:500] + "..." if len(latex_code) > 500 else latex_code  # Preview
                    }
                )
            else:
                # Compilation failed
                error_log = compilation_result.get("latex_log", "No log available")
                print(f"❌ Compilation failed on attempt {attempt}")
                
                if attempt < MAX_ATTEMPTS:
                    # Send error back to GPT for fixing
                    from gpt_latex_generator import fix_latex_compilation_errors
                    latex_code = fix_latex_compilation_errors(latex_code, error_log, attempt)
                    
                    # Save the fixed attempt
                    attempt_latex_path = save_latex_file(latex_code, f"resume_{uid}_fixed_attempt{attempt}")
                    print(f"📄 Fixed LaTeX (attempt {attempt}) saved to: {attempt_latex_path}")
                    
                    attempt += 1
                else:
                    # Max attempts reached - return error
                    print(f"💥 All {MAX_ATTEMPTS} compilation attempts failed")
                    
                    # Extract key error lines from log
                    error_lines = []
                    if error_log:
                        for line in error_log.split('\n'):
                            if line.startswith('!') or 'error' in line.lower():
                                error_lines.append(line)
                    
                    return JSONResponse(
                        status_code=400,
                        content={
                            "success": False,
                            "error": f"LaTeX compilation failed after {MAX_ATTEMPTS} attempts",
                            "details": compilation_result.get("error"),
                            "error_analysis": compilation_result.get("error_analysis", {}),
                            "suggestions": compilation_result.get("suggestions", []),
                            "latex_path": latex_path,
                            "latex_preview": latex_code[:1000] + "..." if len(latex_code) > 1000 else latex_code,
                            "error_lines": error_lines[:10],  # First 10 error lines
                            "compilation_attempts": attempt - 1
                        }
                    )
        
    except Exception as e:
        print(f"Error in enhance_resume: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Resume generation failed",
                "details": str(e)
            }
        )




@app.get("/api/download-pdf/{filename}")
async def download_pdf(filename: str):
    """Download generated PDF resume."""
    pdf_path = UPLOAD_DIR / filename
    if not pdf_path.exists():
        return JSONResponse(
            status_code=404,
            content={"error": "PDF not found", "filename": filename}
        )
    
    return FileResponse(
        path=str(pdf_path),
        media_type='application/pdf',
        filename=f"enhanced_resume_{filename}"
    )


@app.post("/api/refine-resume")
async def refine_resume(latex_code: str = Form(...), feedback: str = Form(...), job_description: str = Form(...)):
    """Refine existing LaTeX resume based on user feedback."""
    try:
        if not os.getenv("OPENAI_API_KEY"):
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "OpenAI API key not configured"
                }
            )

        print(f"Refining resume with feedback: {feedback[:100]}...")
        
        # Refine LaTeX using GPT
        refined_latex = refine_latex_resume(latex_code, feedback, job_description)
        
        # Compile refined LaTeX
        uid = uuid.uuid4().hex
        compilation_result = compile_with_fallback(refined_latex, f"refined_{uid}")
        
        if compilation_result["success"]:
            pdf_filename = os.path.basename(compilation_result["pdf_path"])
            latex_path = save_latex_file(refined_latex, f"refined_{uid}")
            
            # Generate new suggestions
            new_suggestions = get_resume_suggestions(refined_latex, job_description)
            
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": "Resume refined successfully",
                    "pdf_filename": pdf_filename,
                    "latex_path": latex_path,
                    "download_url": f"/api/download-pdf/{pdf_filename}",
                    "suggestions": new_suggestions,
                    "latex_code": refined_latex[:500] + "..." if len(refined_latex) > 500 else refined_latex
                }
            )
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "LaTeX compilation failed after refinement",
                    "details": compilation_result,
                    "latex_code": refined_latex
                }
            )
            
    except Exception as e:
        print(f"Error in refine_resume: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Resume refinement failed",
                "details": str(e)
            }
        )


@app.post("/api/get-suggestions")
async def get_suggestions(latex_code: str = Form(...), job_description: str = Form(...)):
    """Get improvement suggestions for current resume."""
    try:
        if not os.getenv("OPENAI_API_KEY"):
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "OpenAI API key not configured"
                }
            )

        suggestions = get_resume_suggestions(latex_code, job_description)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "suggestions": suggestions
            }
        )
        
    except Exception as e:
        print(f"Error getting suggestions: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to get suggestions",
                "details": str(e)
            }
        )


@app.get("/api/latex-status")
async def latex_status():
    """Check LaTeX installation status."""
    latex_installed, latex_info = check_latex_installation()
    
    return JSONResponse({
        "latex_installed": latex_installed,
        "latex_info": latex_info,
        "openai_configured": bool(os.getenv("OPENAI_API_KEY"))
    })
