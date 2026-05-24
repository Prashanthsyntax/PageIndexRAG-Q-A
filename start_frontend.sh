#!/bin/bash
# start_frontend.sh — Set up and launch the React frontend

set -e

echo "========================================"
echo "  PageIndexRAG — Frontend Setup & Start"
echo "========================================"

cd "$(dirname "$0")/frontend"

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current version: $(node -v)"
  exit 1
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
  echo "[1/2] Installing Node.js dependencies..."
  npm install
fi

echo "[2/2] Starting Vite dev server on http://localhost:5173 ..."
echo ""

npm run dev
