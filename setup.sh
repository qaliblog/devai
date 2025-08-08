#!/bin/bash

# DevAI Setup Script
# This script helps set up the DevAI application

set -e

echo "🚀 Setting up DevAI..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm is available"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama is not installed. Installing Ollama..."
    
    # Detect OS and install Ollama
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://ollama.ai/install.sh | sh
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        curl -fsSL https://ollama.ai/install.sh | sh
    else
        echo "❌ Unsupported OS. Please install Ollama manually from https://ollama.ai"
        exit 1
    fi
fi

echo "✅ Ollama is available"

# Start Ollama if not running
if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "🔄 Starting Ollama..."
    ollama serve &
    sleep 5
fi

# Check if DeepSeek Coder model is available
if ! ollama list | grep -q "deepseek-coder"; then
    echo "📥 Pulling DeepSeek Coder model..."
    ollama pull deepseek-coder
else
    echo "✅ DeepSeek Coder model is already installed"
fi

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-coder:6.7b

# Development Settings
NODE_ENV=development
EOF
    echo "✅ Created .env.local"
fi

# Build the application
echo "🔨 Building the application..."
npm run build

echo ""
echo "🎉 DevAI setup complete!"
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "Then open your browser to: http://localhost:3000"
echo ""
echo "Make sure Ollama is running:"
echo "  ollama serve"
echo ""
echo "Happy coding! 🤖"