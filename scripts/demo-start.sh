#!/bin/bash
# scripts/demo-start.sh — Launch SabiWork demo environment

echo "Starting SabiWork Market Day Demo..."
echo ""

# Check services
echo "Checking PostgreSQL..."
pg_isready -q || { echo "PostgreSQL not running"; exit 1; }

echo "Checking Redis..."
redis-cli ping > /dev/null 2>&1 || { echo "Redis not running"; exit 1; }

echo "Dependencies OK"
echo ""

# Start backend
echo "Starting backend..."
cd "$(dirname "$0")/../backend" && npm run dev &
BACKEND_PID=$!
sleep 3

# Start dashboard
echo "Starting dashboard..."
cd "$(dirname "$0")/../dashboard" && npm run dev &
DASHBOARD_PID=$!
sleep 3

# Start WhatsApp bot
echo "Starting WhatsApp bot..."
cd "$(dirname "$0")/../whatsapp-bot" && npm run dev &
BOT_PID=$!
sleep 2

echo ""
echo "========================================"
echo "  DEMO READY"
echo "========================================"
echo ""
echo "  Split-screen: http://localhost:3001/demo"
echo "  Dashboard:    http://localhost:3001"
echo "  API:          http://localhost:3000"
echo ""
echo "  Demo commands:"
echo "    curl -X POST http://localhost:3000/api/demo/run -H 'Content-Type: application/json' -d '{\"scenario\":\"buyer-worker\"}'"
echo "    curl -X POST http://localhost:3000/api/demo/run -H 'Content-Type: application/json' -d '{\"scenario\":\"market-day\"}'"
echo "    curl -X POST http://localhost:3000/api/demo/ghost -H 'Content-Type: application/json'"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "========================================"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $DASHBOARD_PID $BOT_PID 2>/dev/null; echo ''; echo 'Demo stopped.'; exit 0" SIGINT
wait
