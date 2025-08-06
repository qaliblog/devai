@echo off
REM DevAI Setup Script for Windows
REM This script helps set up the DevAI application on Windows

echo 🚀 Setting up DevAI...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed.
    pause
    exit /b 1
)

echo ✅ npm is available

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Check if Ollama is installed
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Ollama is not installed. Please install Ollama manually.
    echo Visit: https://ollama.ai/download
    echo.
    echo After installing Ollama, run this script again.
    pause
    exit /b 1
)

echo ✅ Ollama is available

REM Start Ollama if not running
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔄 Starting Ollama...
    start /B ollama serve
    timeout /t 5 /nobreak >nul
)

REM Check if DeepSeek Coder model is available
ollama list | findstr "deepseek-coder" >nul 2>&1
if %errorlevel% neq 0 (
    echo 📥 Pulling DeepSeek Coder model...
    ollama pull deepseek-coder
) else (
    echo ✅ DeepSeek Coder model is already installed
)

REM Create .env.local if it doesn't exist
if not exist .env.local (
    echo 📝 Creating .env.local file...
    (
        echo # Ollama Configuration
        echo OLLAMA_BASE_URL=http://localhost:11434
        echo OLLAMA_MODEL=deepseek-coder
        echo.
        echo # Development Settings
        echo NODE_ENV=development
    ) > .env.local
    echo ✅ Created .env.local
)

REM Build the application
echo 🔨 Building the application...
npm run build

echo.
echo 🎉 DevAI setup complete!
echo.
echo To start the application:
echo   npm run dev
echo.
echo Then open your browser to: http://localhost:3000
echo.
echo Make sure Ollama is running:
echo   ollama serve
echo.
echo Happy coding! 🤖
pause