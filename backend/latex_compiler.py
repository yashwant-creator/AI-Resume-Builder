"""
LaTeX to PDF compilation service
Converts LaTeX resume code to professional PDF using pdflatex
"""

import os
import subprocess
import tempfile
import uuid
from pathlib import Path
from typing import Dict, Optional, Tuple, List

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"


def find_pdflatex() -> Optional[str]:
    """Find pdflatex binary in common locations."""
    pdflatex_paths = [
        "/usr/local/texlive/2025basic/bin/universal-darwin/pdflatex",
        "/usr/local/texlive/2024basic/bin/universal-darwin/pdflatex",
        "/usr/local/bin/pdflatex",
        "/opt/local/bin/pdflatex",
    ]
    
    # Check explicit paths
    for path in pdflatex_paths:
        if Path(path).exists():
            return path
    
    # Try using which
    try:
        result = subprocess.run(["which", "pdflatex"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            return result.stdout.strip()
    except:
        pass
    
    return None


PDFLATEX_PATH = find_pdflatex()


def compile_latex_to_pdf(latex_content: str, filename_prefix: str = "resume") -> Tuple[bool, str, Optional[str]]:
    """
    Compile LaTeX content to PDF using pdflatex.
    
    Args:
        latex_content: Complete LaTeX code
        filename_prefix: Prefix for output filename
        
    Returns:
        Tuple[bool, str, Optional[str]]: (success, pdf_path_or_error, log_output)
    """
    
    if not PDFLATEX_PATH:
        return False, "pdflatex not found", None
    
    # Create unique filename
    file_id = uuid.uuid4().hex[:8]
    tex_filename = f"{filename_prefix}_{file_id}.tex"
    pdf_filename = f"{filename_prefix}_{file_id}.pdf"
    log_filename = f"{filename_prefix}_{file_id}.log"
    
    try:
        # Write directly to uploads directory instead of temp directory
        # This allows us to inspect the .tex and .log files for debugging
        tex_file = UPLOADS_DIR / tex_filename
        
        # Write LaTeX content to file
        with open(tex_file, 'w', encoding='utf-8') as f:
            f.write(latex_content)
        
        # Run pdflatex compilation (run twice for references)
        print(f"📝 Compiling {tex_filename}...")
        for attempt in range(2):
            cmd = [PDFLATEX_PATH, '-interaction=nonstopmode', '-output-directory', str(UPLOADS_DIR), str(tex_file)]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60,
                cwd=UPLOADS_DIR
            )
        
        # Check if PDF was generated
        pdf_file = UPLOADS_DIR / pdf_filename
        log_file = UPLOADS_DIR / log_filename
        
        # Read log file if it exists
        log_output = ""
        if log_file.exists():
            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                log_output = f.read()
        else:
            log_output = result.stdout
        
        if pdf_file.exists() and pdf_file.stat().st_size > 0:
            print(f"✅ PDF generated: {pdf_filename}")
            return True, str(pdf_file), log_output
        else:
            error_msg = f"PDF not generated (return code: {result.returncode})"
            # Save error log for debugging
            error_log_file = UPLOADS_DIR / f"{filename_prefix}_ERROR.log"
            with open(error_log_file, 'w', encoding='utf-8') as f:
                f.write(f"=== COMPILATION ERROR ===\n")
                f.write(f"Return code: {result.returncode}\n\n")
                f.write(f"=== STDOUT ===\n{result.stdout}\n\n")
                f.write(f"=== STDERR ===\n{result.stderr}\n\n")
                f.write(f"=== LOG FILE ===\n{log_output}\n")
            print(f"❌ Error log saved to: {error_log_file}")
            
            return False, error_msg, log_output
                
    except subprocess.TimeoutExpired:
        return False, "Compilation timeout (60s exceeded)", None
    except Exception as e:
        return False, f"Compilation error: {str(e)}", None


def check_latex_installation() -> Tuple[bool, str]:
    """
    Check if LaTeX (pdflatex) is installed and available.
    
    Returns:
        Tuple[bool, str]: (is_installed, version_or_error)
    """
    if not PDFLATEX_PATH:
        return False, "pdflatex not found - LaTeX not installed"
    
    try:
        result = subprocess.run([PDFLATEX_PATH, '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            return True, version_line
        else:
            return False, "pdflatex command failed"
    except subprocess.TimeoutExpired:
        return False, "pdflatex version check timed out"
    except Exception as e:
        return False, f"Error checking LaTeX: {str(e)}"


def get_install_instructions() -> str:
    """Get LaTeX installation instructions for macOS."""
    return """
To enable PDF generation, install LaTeX on macOS:

**Option 1: BasicTeX (Lightweight, ~100MB)**:
```
brew install --cask basictex
sudo tlmgr update --self
sudo tlmgr install collection-fontsrecommended
```

**Option 2: MacTeX (Full, ~4GB)**:
Download from: https://www.tug.org/mactex/

After installation, restart the backend server.
"""


def compile_with_fallback(latex_content: str, filename_prefix: str = "resume") -> Dict:
    """
    Compile LaTeX to PDF with helpful error messages.
    
    Args:
        latex_content: LaTeX code to compile
        filename_prefix: Filename prefix
        
    Returns:
        Dict: Compilation result with status, path/error, and suggestions
    """
    
    latex_installed, latex_info = check_latex_installation()
    
    if not latex_installed:
        return {
            "success": False,
            "error": "LaTeX not installed",
            "message": latex_info,
            "install_instructions": get_install_instructions(),
            "fallback_available": False
        }
    
    print(f"📦 Compiling LaTeX with {PDFLATEX_PATH}...")
    success, result, log = compile_latex_to_pdf(latex_content, filename_prefix)
    
    if success:
        print(f"✓ LaTeX compilation successful")
        return {
            "success": True,
            "pdf_path": result,
            "message": "PDF compiled successfully",
            "compiler": "pdflatex",
            "latex_log": log
        }
    else:
        print(f"✗ LaTeX compilation failed: {result}")
        error_analysis = analyze_latex_error(log or "")
        
        return {
            "success": False,
            "error": result,
            "compiler": "pdflatex",
            "latex_log": log,
            "error_analysis": error_analysis,
            "suggestions": get_error_suggestions(result, log)
        }


def analyze_latex_error(log_output: str) -> Dict:
    """Analyze LaTeX compilation errors."""
    
    if not log_output:
        return {"type": "unknown", "description": "No log output available"}
    
    log_lower = log_output.lower()
    
    if "! undefined control sequence" in log_lower:
        return {"type": "undefined_command", "description": "LaTeX command not recognized"}
    elif "! missing" in log_lower:
        return {"type": "syntax_error", "description": "LaTeX syntax error (missing delimiters)"}
    elif "! package" in log_lower:
        return {"type": "package_error", "description": "LaTeX package error"}
    elif "font" in log_lower and ("not found" in log_lower or "error" in log_lower):
        return {"type": "font_error", "description": "Font not found"}
    else:
        return {"type": "general_error", "description": "LaTeX compilation error"}


def get_error_suggestions(error_msg: str, log_output: str) -> List[str]:
    """Generate suggestions for fixing LaTeX errors."""
    
    suggestions = []
    
    if "latex not installed" in error_msg.lower():
        suggestions.append("Install BasicTeX: brew install --cask basictex")
        suggestions.append("Then restart the backend server")
    elif "! undefined control sequence" in (log_output or "").lower():
        suggestions.append("Check LaTeX command syntax")
        suggestions.append("Verify all packages are included in template")
    else:
        suggestions.append("Check LaTeX syntax and spacing")
        suggestions.append("Verify template is valid")
        suggestions.append("Try a simpler LaTeX template first")
    
    return suggestions
