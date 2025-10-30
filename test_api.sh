#!/bin/bash

# Quick API testing script for ATS Resume Builder

BASE_URL="http://localhost:8000"

echo "🧪 ATS Resume Builder - API Test Suite"
echo "======================================="
echo ""

# Test 1: Status endpoint
echo "1️⃣  Testing /api/status endpoint..."
STATUS=$(curl -s "${BASE_URL}/api/status")
echo "   Response: $STATUS"
if [[ $STATUS == *"ok"* ]]; then
    echo "   ✅ PASS"
else
    echo "   ❌ FAIL"
fi
echo ""

# Test 2: LaTeX status
echo "2️⃣  Testing /api/latex-status endpoint..."
LATEX_STATUS=$(curl -s "${BASE_URL}/api/latex-status")
echo "   Response: $LATEX_STATUS"
if [[ $LATEX_STATUS == *"latex_installed"* ]]; then
    echo "   ✅ PASS"
else
    echo "   ❌ FAIL"
fi
echo ""

# Test 3: Check if OpenAI is configured
echo "3️⃣  Checking OpenAI Configuration..."
if [ -z "$OPENAI_API_KEY" ] && ! grep -q "OPENAI_API_KEY" /Users/yashponnaganti/Documents/dev/ATS-Builder/backend/.env; then
    echo "   ⚠️  WARNING: OPENAI_API_KEY not set in .env"
    echo "   Set it with: echo 'OPENAI_API_KEY=sk-...' >> backend/.env"
else
    echo "   ✅ OPENAI_API_KEY appears to be configured"
fi
echo ""

# Test 4: Check LaTeX installation
echo "4️⃣  Checking LaTeX Installation..."
if command -v pdflatex &> /dev/null; then
    LATEX_VERSION=$(pdflatex --version | head -1)
    echo "   ✅ Found: $LATEX_VERSION"
else
    echo "   ❌ LaTeX not found in PATH"
    echo "   Install with: brew install --cask basictex"
fi
echo ""

# Test 5: Check backend dependencies
echo "5️⃣  Checking Backend Dependencies..."
cd /Users/yashponnaganti/Documents/dev/ATS-Builder/backend
python3 -c "
import fastapi, uvicorn, pdfplumber, openai
print('   ✅ All core dependencies installed')
" 2>&1 || echo "   ❌ Missing dependencies"
echo ""

# Test 6: Check frontend dev server
echo "6️⃣  Testing Frontend Dev Server..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "   ✅ Frontend running on port 5173"
else
    echo "   ❌ Frontend not responding (got HTTP $FRONTEND_RESPONSE)"
fi
echo ""

echo "======================================="
echo "🚀 Server Details:"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo "   API Base: http://localhost:5173/api (proxied to backend)"
echo ""
echo "📋 To test the full workflow:"
echo "   1. Open http://localhost:5173 in browser"
echo "   2. Paste a job description"
echo "   3. Upload a PDF or DOCX resume"
echo "   4. Click 'Enhance My Resume'"
echo ""
