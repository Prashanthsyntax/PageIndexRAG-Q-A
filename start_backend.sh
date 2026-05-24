#!/bin/bash
# start_backend.sh — Set up and launch the FastAPI backend

set -e

echo "========================================"
echo "  PageIndexRAG — Backend Setup & Start"
echo "========================================"

cd "$(dirname "$0")/backend"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "[1/4] Creating Python virtual environment..."
  python3 -m venv venv
fi

# Activate venv
source venv/bin/activate
echo "[2/4] Virtual environment activated."

# Install dependencies
echo "[3/4] Installing Python dependencies (this may take a few minutes on first run)..."
pip install --upgrade pip -q
pip install -r requirements.txt -q

# Check for .env file
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  IMPORTANT: No .env file found!"
  echo "    A template has been created at backend/.env"
  echo "    Please edit it and add your GROQ_API_KEY before continuing."
  echo ""
  echo "    Get a free Groq API key at: https://console.groq.com"
  echo ""
  read -p "Press Enter after adding your GROQ_API_KEY to .env..."
fi

echo "[4/4] Starting FastAPI server on http://localhost:8000 ..."
echo "      API docs available at: http://localhost:8000/docs"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
