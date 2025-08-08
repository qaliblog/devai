#!/bin/bash

# Clean installation script for DevAI
# This script removes all dependencies and reinstalls them cleanly

echo "🧹 Cleaning DevAI installation..."

# Remove node_modules and package-lock.json
echo "Removing existing dependencies..."
rm -rf node_modules
rm -f package-lock.json

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Install dependencies with legacy peer deps
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Fix permissions for Termux
echo "Fixing permissions..."
chmod +x node_modules/.bin/*

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local..."
    cat > .env.local << EOF
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-coder:6.7b

# Development Settings
NODE_ENV=development
EOF
fi

echo "✅ Clean installation complete!"
echo ""
echo "Now try running:"
echo "  npm run dev:termux"
echo ""
echo "Or use npx directly:"
echo "  npx next dev --hostname 0.0.0.0 --port 3000"