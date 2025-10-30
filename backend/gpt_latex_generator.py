"""
GPT-powered LaTeX resume generator using OpenAI API
Generates professional resumes using Jake's template
"""

import os
import json
import uuid
from pathlib import Path
from typing import Dict, List, Optional
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI client lazily
def get_openai_client():
    """Get OpenAI client with proper error handling."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    return OpenAI(api_key=api_key)

BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = BASE_DIR / "templates"
UPLOADS_DIR = BASE_DIR / "uploads"


def read_jakes_template() -> str:
    """Read Jake's LaTeX resume template."""
    template_path = TEMPLATE_DIR / "jakes_resume_template_original.tex"
    with open(template_path, 'r', encoding='utf-8') as f:
        return f.read()


def generate_latex_resume(resume_data: Dict, job_description: str, user_name: str = "Professional Candidate") -> str:
    """
    Generate LaTeX code for a resume using GPT-4, based on Jake's template.
    
    Args:
        resume_data: Parsed resume information
        job_description: Target job description
        user_name: Applicant's name
        
    Returns:
        str: Complete LaTeX code for the resume
    """
    
    # Read the template
    template = read_jakes_template()
    
    # Extract resume text
    raw_text = resume_data.get('raw_text', '')
    contact = resume_data.get('contact', {})
    
    # Create the GPT prompt with structured instructions
    prompt = f"""
You are a professional resume writer and LaTeX specialist. Your task is to generate a complete, professional LaTeX resume that:

1. Uses the EXACT LaTeX template structure provided
2. Tailors the content to match the job description
3. Keeps all LaTeX formatting and commands intact
4. Creates compelling, ATS-friendly bullet points
5. Optimizes keywords for the target role

LATEX TEMPLATE TO USE (do not modify structure):
{template}

APPLICANT INFORMATION:
Name: {user_name}
Email: {contact.get('email', 'email@example.com')}
Phone: {contact.get('phone', '(555) 123-4567')}

CURRENT RESUME CONTENT:
{raw_text[:2000]}

TARGET JOB DESCRIPTION:
{job_description[:1500]}

REQUIREMENTS:
- Replace ALL placeholder variables ({{{{VARIABLE}}}}) with actual content from the resume
- Create 3-4 compelling bullet points per work experience using strong action verbs
- Include relevant projects if applicable
- Optimize technical skills section for the target role
- Ensure content is ATS-friendly and keyword-optimized
- Maintain professional tone and quantify achievements where possible
- Return ONLY complete LaTeX code - no explanations, no markdown
- The code must start with \\documentclass and end with \\end{{document}}
- Do NOT wrap in triple backticks or add any additional text
"""

    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert resume writer and LaTeX specialist. Generate professional, ATS-optimized resumes in LaTeX format. Return ONLY valid LaTeX code."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4000,
            temperature=0.3,  # Low temperature for consistent output
            timeout=60
        )
        
        latex_code = response.choices[0].message.content.strip()
        
        # Clean up common issues: remove markdown code fences if present
        if latex_code.startswith("```"):
            latex_code = latex_code.split("```")[1]
            if latex_code.startswith("latex"):
                latex_code = latex_code[5:]
        if latex_code.endswith("```"):
            latex_code = latex_code[:-3]
        
        latex_code = latex_code.strip()
        
        # Validation: ensure it looks like LaTeX
        if not latex_code.startswith('\\documentclass'):
            print(f"⚠️  Warning: Generated LaTeX doesn't start with \\documentclass")
            print(f"First 100 chars: {latex_code[:100]}")
            return create_fallback_latex(resume_data, user_name)
            
        if '\\end{document}' not in latex_code:
            print(f"⚠️  Warning: Generated LaTeX missing \\end{{document}}")
            latex_code += '\n\\end{document}\n'
            
        return latex_code
        
    except Exception as e:
        print(f"❌ Error generating LaTeX with GPT: {e}")
        import traceback
        traceback.print_exc()
        # Fallback: return template with basic substitutions
        return create_fallback_latex(resume_data, user_name)


def refine_latex_resume(current_latex: str, user_feedback: str, job_description: str) -> str:
    """
    Refine existing LaTeX resume based on user suggestions.
    
    Args:
        current_latex: Current LaTeX resume code
        user_feedback: User's suggestions/feedback
        job_description: Original job description for context
        
    Returns:
        str: Refined LaTeX code
    """
    
    prompt = f"""
You are helping refine a LaTeX resume based on user feedback. Your task is to modify the LaTeX code to incorporate the feedback while:
1. Maintaining the exact LaTeX structure and formatting
2. Keeping it ATS-friendly and professional
3. Ensuring changes align with the target job requirements
4. Preserving all working LaTeX commands and syntax

CURRENT LATEX RESUME:
{current_latex}

USER FEEDBACK/SUGGESTIONS:
{user_feedback}

JOB DESCRIPTION (for context):
{job_description[:1000]}

Return ONLY the complete updated LaTeX code with no explanations. The code must start with \\documentclass and end with \\end{{document}}.
"""

    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert resume editor. Modify LaTeX resumes based on user feedback while maintaining professional quality and ATS compatibility. Return ONLY valid LaTeX code."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4000,
            temperature=0.2,
            timeout=60
        )
        
        refined_latex = response.choices[0].message.content.strip()
        
        # Clean up markdown fences if present
        if refined_latex.startswith("```"):
            refined_latex = refined_latex.split("```")[1]
            if refined_latex.startswith("latex"):
                refined_latex = refined_latex[5:]
        if refined_latex.endswith("```"):
            refined_latex = refined_latex[:-3]
        
        refined_latex = refined_latex.strip()
        
        # Basic validation
        if not refined_latex.startswith('\\documentclass'):
            print(f"⚠️  Warning: Refined LaTeX doesn't start with \\documentclass")
            return current_latex  # Return original if refinement fails
        
        # Ensure document ends properly
        if not refined_latex.strip().endswith('\\end{document}'):
            refined_latex += '\n\\end{document}\n'
            
        return refined_latex
        
    except Exception as e:
        print(f"❌ Error refining LaTeX with GPT: {e}")
        import traceback
        traceback.print_exc()
        return current_latex  # Return original if refinement fails


def get_resume_suggestions(latex_code: str, job_description: str) -> List[str]:
    """
    Generate improvement suggestions for the current resume.
    
    Args:
        latex_code: Current LaTeX resume
        job_description: Target job description
        
    Returns:
        List[str]: List of specific suggestions
    """
    
    # Provide default suggestions if something fails
    default_suggestions = [
        "Add metrics and quantifiable achievements (e.g., '↑ 25% improvement')",
        "Incorporate top 5 keywords from the job description",
        "Use strong action verbs (e.g., 'Developed', 'Implemented', 'Architected')",
        "Highlight technical skills matching the role requirements"
    ]
    
    prompt = f"""
Analyze this LaTeX resume against the job description and provide 4 specific, actionable improvement suggestions.

LATEX RESUME:
{latex_code[:2000]}

JOB DESCRIPTION:
{job_description[:1500]}

Format your response as a numbered list with concise suggestions (one per line):
1. [Specific suggestion]
2. [Specific suggestion]
3. [Specific suggestion]
4. [Specific suggestion]

Be direct and actionable. Return only the numbered list.
"""

    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a professional resume coach. Provide specific, actionable feedback to improve resumes for target positions. Be concise."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.4,
            timeout=30
        )
        
        suggestions_text = response.choices[0].message.content.strip()
        
        # Parse suggestions into a list
        suggestions = []
        for line in suggestions_text.split('\n'):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith('•') or line.startswith('-')):
                # Clean up the suggestion text
                suggestion = line
                if suggestion[0].isdigit() and '. ' in suggestion:
                    suggestion = suggestion.split('. ', 1)[1]
                elif suggestion.startswith(('• ', '- ')):
                    suggestion = suggestion[2:]
                
                if suggestion.strip():
                    suggestions.append(suggestion.strip())
        
        return suggestions[:4] if suggestions else default_suggestions
        
    except Exception as e:
        print(f"⚠️  Error generating suggestions with GPT: {e}")
        return default_suggestions


def create_fallback_latex(resume_data: Dict, user_name: str) -> str:
    """Create a basic LaTeX resume if GPT fails."""
    template = read_jakes_template()
    
    # Extract contact info
    contact = resume_data.get('contact', {})
    email = contact.get('email', 'email@example.com')
    phone = contact.get('phone', '(555) 123-4567')
    
    # Get raw text and extract sections
    raw_text = resume_data.get('raw_text', '')
    
    # Create a minimal fallback by replacing template variables
    fallback_latex = template
    
    # Replace common placeholder patterns
    replacements = {
        '{{FULL_NAME}}': user_name,
        '{{NAME}}': user_name,
        '{{EMAIL}}': email,
        '{{PHONE}}': phone,
        '{FULL_NAME}': user_name,
        '{NAME}': user_name,
        '{EMAIL}': email,
        '{PHONE}': phone,
    }
    
    for placeholder, value in replacements.items():
        fallback_latex = fallback_latex.replace(placeholder, value)
    
    # Ensure document is properly closed
    if not fallback_latex.strip().endswith('\\end{document}'):
        fallback_latex = fallback_latex.rstrip() + '\n\\end{document}\n'
    
    return fallback_latex


def fix_latex_compilation_errors(latex_code: str, error_log: str, attempt: int = 1) -> str:
    """
    Fix LaTeX compilation errors by sending the broken code and errors back to GPT.
    
    Args:
        latex_code: The LaTeX code that failed to compile
        error_log: Compilation error messages
        attempt: Current attempt number (for logging)
        
    Returns:
        str: Fixed LaTeX code
    """
    
    prompt = f"""
This LaTeX code doesn't compile properly. Fix it.

ERROR LOG:
{error_log[:2000]}

BROKEN LATEX CODE:
{latex_code}

INSTRUCTIONS:
1. Analyze the error messages carefully
2. Fix all syntax errors, undefined commands, and formatting issues
3. Ensure all LaTeX packages are properly used
4. Maintain the same content structure
5. Return ONLY the complete fixed LaTeX code
6. Do NOT wrap in triple backticks or add explanations
7. The code must start with \\documentclass and end with \\end{{document}}

Return the corrected LaTeX code now:
"""

    try:
        client = get_openai_client()
        print(f"🔧 Attempt {attempt}: Sending LaTeX back to GPT for error fixing...")
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert LaTeX debugger. Fix compilation errors in LaTeX code. Return ONLY valid, compilable LaTeX code without any explanations or markdown formatting."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4000,
            temperature=0.1,  # Very low temperature for precise fixes
            timeout=60
        )
        
        fixed_latex = response.choices[0].message.content.strip()
        
        # Clean up markdown fences if present
        if fixed_latex.startswith("```"):
            fixed_latex = fixed_latex.split("```")[1]
            if fixed_latex.startswith("latex"):
                fixed_latex = fixed_latex[5:]
        if fixed_latex.endswith("```"):
            fixed_latex = fixed_latex[:-3]
        
        fixed_latex = fixed_latex.strip()
        
        # Basic validation
        if not fixed_latex.startswith('\\documentclass'):
            print(f"⚠️  Warning: Fixed LaTeX doesn't start with \\documentclass")
            return latex_code  # Return original if fix fails
            
        if '\\end{document}' not in fixed_latex:
            print(f"⚠️  Warning: Fixed LaTeX missing \\end{{document}}")
            fixed_latex += '\n\\end{document}\n'
        
        print(f"✅ GPT returned fixed LaTeX code")
        return fixed_latex
        
    except Exception as e:
        print(f"❌ Error fixing LaTeX with GPT: {e}")
        import traceback
        traceback.print_exc()
        return latex_code  # Return original if fixing fails


def save_latex_file(latex_content: str, filename_prefix: str = "resume") -> str:
    """Save LaTeX content to file and return path."""
    filename = f"{filename_prefix}_{uuid.uuid4().hex[:8]}.tex"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(latex_content)
    
    return str(file_path)