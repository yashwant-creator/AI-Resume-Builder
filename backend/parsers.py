"""Simplified parsing utilities for resume files.

This module handles basic resume parsing for the GPT+LaTeX workflow.
GPT handles all the intelligent content extraction, so we only need basic text extraction.
"""
import re
from pathlib import Path


def extract_text_from_pdf(path: str) -> str:
    """Extract text from PDF using pdfplumber."""
    try:
        import pdfplumber
        
        with pdfplumber.open(path) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
            return text.strip()
    except Exception as e:
        return f"Error extracting PDF text: {str(e)}"


def extract_text_from_docx(path: str) -> str:
    """Extract text from DOCX file."""
    try:
        # Try mammoth first (better formatting preservation)
        import mammoth
        
        with open(path, "rb") as docx_file:
            result = mammoth.extract_raw_text(docx_file)
            return result.value
    except Exception:
        # Fallback to python-docx if available
        try:
            from docx import Document
            
            doc = Document(path)
            text = []
            for paragraph in doc.paragraphs:
                text.append(paragraph.text)
            return "\n".join(text)
        except Exception as e:
            return f"Error extracting DOCX text: {str(e)}"


def extract_contact_info(text: str):
    """Extract basic contact information from text."""
    contact = {}
    
    # Extract email
    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    if email_match:
        contact['email'] = email_match.group()
    
    # Extract phone (simple patterns)
    phone_patterns = [
        r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        r'\(\d{3}\)\s*\d{3}[-.]?\d{4}',
        r'\+1[-.]?\d{3}[-.]?\d{3}[-.]?\d{4}'
    ]
    
    for pattern in phone_patterns:
        phone_match = re.search(pattern, text)
        if phone_match:
            contact['phone'] = phone_match.group()
            break
    
    # Extract name (first non-empty line, cleaned up)
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if lines:
        first_line = lines[0]
        # Clean up common resume header artifacts
        cleaned_name = re.sub(r'[^\w\s]', ' ', first_line).strip()
        if len(cleaned_name.split()) <= 4:  # Reasonable name length
            contact['name'] = cleaned_name
    
    return contact


def parse_resume_file(path: str):
    """Parse a resume file and extract basic information for GPT processing."""
    file_path = Path(path)
    
    if not file_path.exists():
        return {"error": "File not found"}
    
    # Extract text based on file extension
    text = ""
    if file_path.suffix.lower() == '.pdf':
        text = extract_text_from_pdf(path)
    elif file_path.suffix.lower() in ['.docx', '.doc']:
        text = extract_text_from_docx(path)
    else:
        return {"error": f"Unsupported file type: {file_path.suffix}"}
    
    # Check if extraction succeeded
    if not text:
        return {"error": f"Failed to extract text from {file_path.name}"}
    
    if isinstance(text, str) and text.startswith("Error"):
        return {"error": f"Failed to extract text: {text}"}
    
    # Extract basic contact info
    contact = extract_contact_info(text)
    
    # For GPT workflow, we provide raw text and basic contact info
    # GPT will handle all the intelligent parsing
    return {
        "raw_text": text,
        "contact": contact,
        "file_type": file_path.suffix.lower(),
        "filename": file_path.name,
        "text_length": len(text)
    }