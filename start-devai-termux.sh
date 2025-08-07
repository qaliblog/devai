#!/bin/bash

# DevAI Termux Startup Script
# Optimized for Termux environment

echo "🚀 Starting DevAI on Termux..."

# Check if we're in Termux
if [ ! -d "/data/data/com.termux" ]; then
    echo "⚠️  This script is optimized for Termux. You may encounter issues on other platforms."
fi

# Set Termux-specific environment variables
export TERM="xterm-256color"
export COLORTERM="truecolor"
export NEXT_TELEMETRY_DISABLED=1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Fix permissions for Termux
echo "🔧 Fixing Termux permissions..."
if [ -d "node_modules/.bin" ]; then
    chmod +x node_modules/.bin/*
fi

# Check if Ollama is running
echo "🤖 Checking Ollama status..."
if ! pgrep -f "ollama" > /dev/null; then
    echo "⚠️  Ollama is not running. Starting Ollama..."
    ollama serve &
    sleep 3
fi

# Start the DevAI application
echo "🌐 Starting DevAI on http://localhost:3000"
echo "📱 Access from other devices: http://[your-ip]:3000"
echo "🔧 Terminal commands like 'la' and 'll' are now supported!"
echo ""

# Start with Termux-optimized settings
npm run dev:termux