@echo off
echo ========================================
echo   PageIndexRAG ^— Frontend Setup ^& Start
echo ========================================

cd /d "%~dp0frontend"

if not exist node_modules (
    echo [1/2] Installing Node.js dependencies...
    npm install
)

echo [2/2] Starting Vite dev server on http://localhost:5173
echo.
npm run dev
