#!/bin/bash
# Start the backend server
cd "$(dirname "$0")"

# Activate venv if it exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
