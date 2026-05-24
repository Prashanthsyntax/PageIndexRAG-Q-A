@echo off
echo ========================================
echo   PageIndexRAG ^— Backend Setup ^& Start
echo ========================================

cd /d "%~dp0backend"

if not exist venv (
    echo [1/4] Creating Python virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
echo [2/4] Virtual environment activated.

echo [3/4] Installing dependencies...
pip install --upgrade pip -q
pip install -r requirements.txt -q

if not exist .env (
    copy .env.example .env
    echo.
    echo WARNING: Please edit backend\.env and add your GROQ_API_KEY
    echo Get a free key at: https://console.groq.com
    echo.
    pause
)

echo [4/4] Starting FastAPI on http://localhost:8000
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
