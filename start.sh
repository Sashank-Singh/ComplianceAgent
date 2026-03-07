#!/bin/bash
# ComplianceAgent — Start everything with one command
# Usage: ./start.sh  OR  python main.py start

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo ""
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║           ComplianceAgent — Starting Up              ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo ""

# Check for virtual environment
if [ ! -d "$SCRIPT_DIR/venv" ]; then
  echo "  [!] Python venv not found."
  echo "      Run: python -m venv venv && pip install -r requirements.txt"
  exit 1
fi

# Check for node_modules
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "  [*] Installing frontend dependencies..."
  cd "$FRONTEND_DIR" && npm install
fi

# Start backend in background
echo "  [1/3] Starting FastAPI backend on :8000..."
cd "$SCRIPT_DIR"
source venv/bin/activate
python main.py serve &
BACKEND_PID=$!

# Start frontend in background
echo "  [2/3] Starting Next.js frontend on :3000..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

# Auto-open browser after servers boot
echo "  [3/3] Opening browser in 4 seconds..."
(sleep 4 && open "http://localhost:3000" 2>/dev/null || xdg-open "http://localhost:3000" 2>/dev/null || true) &

echo ""
echo "  ┌──────────────────────────────────────────────────────┐"
echo "  │  Frontend:  http://localhost:3000                    │"
echo "  │  Backend:   http://localhost:8000                    │"
echo "  │  API Docs:  http://localhost:8000/docs               │"
echo "  │                                                      │"
echo "  │  Press Ctrl+C to stop all services                   │"
echo "  └──────────────────────────────────────────────────────┘"
echo ""

# Trap Ctrl+C and kill both processes
cleanup() {
  echo ""
  echo "  [*] Shutting down..."
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID 2>/dev/null
  wait $FRONTEND_PID 2>/dev/null
  echo "  [*] All services stopped."
}

trap cleanup INT TERM

# Wait for both
wait
