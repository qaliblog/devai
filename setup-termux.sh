#!/bin/bash

# DevAI Setup Script for Termux
# This script helps set up the DevAI application on Termux

set -e

echo "🚀 Setting up DevAI on Termux..."

# Check if we're running in Termux
if [ ! -d "/data/data/com.termux" ]; then
    echo "⚠️  This script is designed for Termux. You may encounter issues on other platforms."
fi

# Update Termux packages
echo "📦 Updating Termux packages..."
pkg update -y

# Install required packages
echo "📦 Installing required packages..."
pkg install -y nodejs npm git curl wget

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    echo "Installing Node.js 18+..."
    pkg install -y nodejs-lts
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

# Install Ollama for Termux
echo "📥 Installing Ollama for Termux..."

# Check if Ollama is already installed
if ! command -v ollama &> /dev/null; then
    echo "Installing Ollama..."
    
    # Download and install Ollama for ARM64 (most Termux devices)
    ARCH=$(uname -m)
    if [ "$ARCH" = "aarch64" ]; then
        OLLAMA_ARCH="arm64"
    elif [ "$ARCH" = "armv7l" ]; then
        OLLAMA_ARCH="arm"
    else
        OLLAMA_ARCH="amd64"
    fi
    
    # Download Ollama
    wget -O ollama https://github.com/ollama/ollama/releases/latest/download/ollama-linux-$OLLAMA_ARCH
    chmod +x ollama
    mv ollama $PREFIX/bin/
    
    echo "✅ Ollama installed"
else
    echo "✅ Ollama is already installed"
fi

# Start Ollama if not running
if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "🔄 Starting Ollama..."
    nohup ollama serve > /dev/null 2>&1 &
    sleep 5
fi

# Check if DeepSeek Coder model is available
if ! ollama list | grep -q "deepseek-coder"; then
    echo "📥 Pulling DeepSeek Coder model..."
    echo "Note: This may take a while on Termux due to limited resources..."
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

# Termux-specific settings
TERMUX=true
EOF
    echo "✅ Created .env.local"
fi

# Fix permissions for Termux
echo "🔧 Fixing permissions for Termux..."
chmod +x node_modules/.bin/*
chmod +x node_modules/.bin/next

# Create a Termux-specific start script
echo "📝 Creating Termux start script..."
cat > start-devai.sh << 'EOF'
#!/bin/bash

# DevAI Start Script for Termux

echo "🚀 Starting DevAI on Termux..."

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "🔄 Starting Ollama..."
    nohup ollama serve > /dev/null 2>&1 &
    sleep 5
fi

# Start the development server
echo "🌐 Starting development server..."
echo "The app will be available at: http://localhost:3000"
echo "Press Ctrl+C to stop the server"

# Use npx to ensure we're using the local next installation
npx next dev --hostname 0.0.0.0 --port 3000
EOF

chmod +x start-devai.sh

# Build the application
echo "🔨 Building the application..."
npm run build

echo ""
echo "🎉 DevAI setup complete for Termux!"
echo ""
echo "To start the application:"
echo "  ./start-devai.sh"
echo ""
echo "Or manually:"
echo "  npx next dev --hostname 0.0.0.0 --port 3000"
echo ""
echo "Make sure Ollama is running:"
echo "  ollama serve"
echo ""
echo "Happy coding on Termux! 🤖"
echo ""
echo "Note: Termux may have limited resources. Consider:"
echo "- Closing other apps while using DevAI"
echo "- Using a smaller model if DeepSeek Coder is too slow"
echo "- Monitoring memory usage with 'top' command"