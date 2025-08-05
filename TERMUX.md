# DevAI on Termux - Setup Guide

This guide helps you run DevAI on Termux (Android terminal emulator).

## Prerequisites

- Termux installed from F-Droid (not Google Play)
- At least 4GB free storage
- Android 7+ (API level 24+)

## Quick Fix for Permission Issues

If you're getting "Permission denied" errors:

```bash
# Run the quick fix script
./fix-termux.sh

# Then try starting the app
npm run dev:termux
```

## Complete Setup

### 1. Update Termux

```bash
pkg update -y
pkg upgrade -y
```

### 2. Install Required Packages

```bash
pkg install -y nodejs npm git curl wget
```

### 3. Run the Termux Setup Script

```bash
./setup-termux.sh
```

### 4. Start DevAI

```bash
# Option 1: Use the start script
./start-devai.sh

# Option 2: Manual start
npm run dev:termux
```

## Troubleshooting

### Permission Denied Error

**Problem:** `sh: 1: next: Permission denied`

**Solution:**
```bash
# Fix permissions
chmod +x node_modules/.bin/*
chmod +x node_modules/.bin/next

# Or use npx
npx next dev --hostname 0.0.0.0 --port 3000
```

### Ollama Installation Issues

**Problem:** Ollama not installing or running

**Solution:**
```bash
# Manual Ollama installation for Termux
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then
    OLLAMA_ARCH="arm64"
elif [ "$ARCH" = "armv7l" ]; then
    OLLAMA_ARCH="arm"
else
    OLLAMA_ARCH="amd64"
fi

wget -O ollama https://github.com/ollama/ollama/releases/latest/download/ollama-linux-$OLLAMA_ARCH
chmod +x ollama
mv ollama $PREFIX/bin/
```

### Memory Issues

**Problem:** App crashes due to low memory

**Solution:**
```bash
# Monitor memory usage
top

# Close other apps
pkill -f termux

# Use a smaller model
ollama pull codellama:7b
```

### Port Issues

**Problem:** Port 3000 already in use

**Solution:**
```bash
# Check what's using the port
netstat -tulpn | grep :3000

# Kill the process
pkill -f "next"

# Or use a different port
npx next dev --hostname 0.0.0.0 --port 3001
```

### Network Issues

**Problem:** Can't access the app from browser

**Solution:**
```bash
# Check if the server is running
curl http://localhost:3000

# Use the correct hostname
npx next dev --hostname 0.0.0.0 --port 3000
```

## Performance Optimization

### 1. Use Smaller Models

For better performance on Termux, use smaller models:

```bash
# Instead of deepseek-coder, try:
ollama pull codellama:7b
ollama pull llama2:7b
ollama pull mistral:7b
```

### 2. Monitor Resources

```bash
# Check memory usage
free -h

# Check CPU usage
top

# Check storage
df -h
```

### 3. Optimize Termux

```bash
# Increase swap if needed
pkg install -y termux-tools
termux-setup-storage
```

## Alternative Setup Methods

### Method 1: Using npx directly

```bash
# Install dependencies
npm install

# Start with npx
npx next dev --hostname 0.0.0.0 --port 3000
```

### Method 2: Using yarn

```bash
# Install yarn
npm install -g yarn

# Install dependencies
yarn install

# Start the app
yarn dev
```

### Method 3: Manual Ollama setup

```bash
# Install Ollama manually
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama
ollama serve

# Pull model
ollama pull deepseek-coder
```

## Common Commands

```bash
# Start DevAI
npm run dev:termux

# Start Ollama
ollama serve

# Check Ollama status
curl http://localhost:11434/api/tags

# List installed models
ollama list

# Pull a model
ollama pull deepseek-coder

# Stop all processes
pkill -f "next"
pkill -f "ollama"
```

## Browser Access

After starting the app, you can access it from:

- **Local:** http://localhost:3000
- **Network:** http://YOUR_IP:3000

To find your IP:
```bash
ip addr show wlan0
```

## Troubleshooting Checklist

- [ ] Termux is updated (`pkg update`)
- [ ] Node.js 18+ is installed (`node --version`)
- [ ] npm is available (`npm --version`)
- [ ] Dependencies are installed (`npm install`)
- [ ] Permissions are fixed (`chmod +x node_modules/.bin/*`)
- [ ] Ollama is installed (`ollama --version`)
- [ ] Ollama is running (`curl http://localhost:11434/api/tags`)
- [ ] Model is pulled (`ollama list`)
- [ ] Port 3000 is free (`netstat -tulpn | grep :3000`)
- [ ] App is started (`npm run dev:termux`)

## Support

If you're still having issues:

1. Check the logs: `npm run dev:termux 2>&1 | tee devai.log`
2. Share the error message
3. Include your device info: `uname -a`
4. Include Node.js version: `node --version`

## Tips for Termux

- Keep Termux updated
- Close other apps when using DevAI
- Use a smaller model if performance is slow
- Monitor memory usage with `top`
- Use `Ctrl+C` to stop the server
- Use `Ctrl+Z` to background the process
- Use `fg` to bring it back to foreground