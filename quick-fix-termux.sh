#!/bin/bash

# Quick fix for current Termux issues

echo "🔧 Quick fix for Termux dependency issues..."

# Stop any running processes
echo "Stopping any running processes..."
pkill -f "next" 2>/dev/null || true

# Remove problematic files
echo "Cleaning up..."
rm -rf node_modules
rm -f package-lock.json

# Use the simplified package.json
echo "Using simplified package.json..."
cp package-simple.json package.json

# Install with legacy peer deps
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Fix permissions
echo "Fixing permissions..."
chmod +x node_modules/.bin/*

# Create .env.local
echo "Creating .env.local..."
cat > .env.local << EOF
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-coder:6.7b

# Development Settings
NODE_ENV=development
EOF

echo "✅ Quick fix complete!"
echo ""
echo "Now try:"
echo "  npm run dev:termux"
echo ""
echo "Or:"
echo "  npx next dev --hostname 0.0.0.0 --port 3000"