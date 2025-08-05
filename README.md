# DevAI - Autonomous Coding Agent

DevAI is a Cursor-like coding agent that connects to Ollama with DeepSeek Coder for autonomous development. It can run commands, read/write files, and operate autonomously across Linux, Windows, and Termux environments.

## Features

- 🤖 **AI-Powered Coding**: Connects to Ollama with DeepSeek Coder for intelligent code generation
- 🔄 **Auto Mode**: Autonomous operation that continuously analyzes and improves code
- 💻 **Terminal Integration**: Execute commands directly in the environment
- 📁 **File Management**: Browse, read, write, and manage files
- 🎨 **Modern UI**: Beautiful, responsive interface with dark/light themes
- 🌐 **Cross-Platform**: Works on Linux, Windows, and Termux
- ⚡ **Real-time Updates**: Live terminal output and file system monitoring

## Prerequisites

- Node.js 18+ 
- Ollama installed and running
- DeepSeek Coder model pulled

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd devai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install and setup Ollama**
   ```bash
   # Install Ollama (follow instructions at https://ollama.ai)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Start Ollama
   ollama serve
   
   # Pull DeepSeek Coder model
   ollama pull deepseek-coder
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Basic Setup

1. **Initialize the Agent**
   - The agent will automatically try to connect to Ollama
   - Check the status bar for connection status

2. **Start Auto Mode**
   - Click "Start Auto" to enable autonomous operation
   - The agent will continuously analyze and improve your code

3. **Manual Tasks**
   - Use the Agent panel to add specific tasks
   - Choose from: Code Generation, Command Execution, File Operations, or Code Analysis

### Features Overview

#### Editor
- Monaco Editor with syntax highlighting
- Multiple language support
- Auto-save functionality
- File management integration

#### Terminal
- Execute commands in real-time
- Command history with arrow key navigation
- Process management (kill running processes)
- Output streaming

#### File Explorer
- Browse workspace files and directories
- Search functionality
- File operations (create, delete, copy, move)
- Drag and drop support

#### Agent Panel
- Monitor AI agent activities
- Add manual tasks
- View task history and results
- Auto mode controls

### Auto Mode

When Auto Mode is enabled, the agent will:

1. **Analyze the workspace** for potential improvements
2. **Generate tasks** based on current state
3. **Execute commands** to build, test, or deploy
4. **Write or modify code** files as needed
5. **Continue the cycle** until objectives are met

### Task Types

- **Code Generation**: AI generates code based on descriptions
- **Command Execution**: Run terminal commands
- **File Operations**: Read, write, or manage files
- **Code Analysis**: Analyze code for improvements

## Configuration

### Environment Variables

Create a `.env.local` file:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-coder

# Development Settings
NODE_ENV=development
```

### Customizing the Agent

Edit `lib/agent.ts` to modify:
- Task generation logic
- Auto mode behavior
- AI prompts and instructions

## Troubleshooting

### Ollama Connection Issues

1. **Check if Ollama is running**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Restart Ollama**
   ```bash
   ollama serve
   ```

3. **Verify model is installed**
   ```bash
   ollama list
   ```

### Permission Issues

On Linux/macOS, you might need to grant permissions:

```bash
# For file operations
chmod +x /path/to/workspace

# For terminal operations
sudo usermod -a -G docker $USER
```

### Port Conflicts

If port 3000 is in use:

```bash
# Use a different port
npm run dev -- -p 3001
```

## Development

### Project Structure

```
devai/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/             # React components
│   ├── Editor.tsx         # Code editor
│   ├── TerminalPanel.tsx  # Terminal interface
│   ├── FileExplorer.tsx   # File browser
│   ├── AgentPanel.tsx     # AI agent interface
│   └── StatusBar.tsx      # Status bar
├── lib/                   # Core services
│   ├── agent.ts           # AI agent logic
│   ├── ollama.ts          # Ollama integration
│   ├── file-system.ts     # File operations
│   └── terminal.ts        # Terminal operations
├── package.json           # Dependencies
└── README.md             # This file
```

### Adding New Features

1. **New API Endpoints**: Add to `app/api/`
2. **New Components**: Add to `components/`
3. **New Services**: Add to `lib/`
4. **Styling**: Use Tailwind CSS classes

### Building for Production

```bash
npm run build
npm start
```

## Security Considerations

- The agent has full access to your file system
- Commands are executed with your user permissions
- Keep sensitive files outside the workspace
- Review generated code before deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions
- **Documentation**: Check the wiki

## Roadmap

- [ ] WebSocket support for real-time updates
- [ ] Plugin system for custom integrations
- [ ] Multi-language support
- [ ] Cloud deployment options
- [ ] Team collaboration features
- [ ] Advanced AI model support
- [ ] Mobile app version

---

**DevAI** - Your autonomous coding companion 🤖