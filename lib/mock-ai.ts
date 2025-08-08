import { AIMessage, AIResponse, AIProvider } from './ai-providers';

export class MockAIProvider implements AIProvider {
  name = 'Mock AI (Fallback)';

  private getResponseForPrompt(message: string): string {
    const lowerMsg = message.toLowerCase();
    
    // Poem requests
    if (lowerMsg.includes('poem') || lowerMsg.includes('poetry')) {
      return `Here's a poem for you:

**Code and Dreams**

In the realm where logic meets creativity,
Where bits and bytes dance in harmony,
We craft with care each line of code,
Building bridges on the digital road.

Your request has been heard and understood,
Though Ollama sleeps, creativity's still good,
For in every developer's heart there lies,
A poet waiting beneath the tries and whys.

*Note: This is a fallback response. For full AI capabilities, please start Ollama with: \`ollama serve\`*`;
    }
    
    // Code generation requests
    if (lowerMsg.includes('code') || lowerMsg.includes('function') || lowerMsg.includes('class')) {
      return `I'd love to help you with code generation! However, I'm currently running in fallback mode since Ollama isn't available.

**To get full AI-powered code generation:**
1. Install Ollama: \`curl -fsSL https://ollama.ai/install.sh | sh\`
2. Start Ollama: \`ollama serve\`
3. Pull a coding model: \`ollama pull deepseek-coder:6.7b\`

**For now, here's a basic template:**
\`\`\`javascript
// Your code structure might look like this
function yourFunction() {
  // Implementation goes here
  return "Hello from fallback AI!";
}
\`\`\`

*This is a mock response. Connect Ollama for intelligent code assistance.*`;
    }
    
    // File operations
    if (lowerMsg.includes('file') || lowerMsg.includes('create') || lowerMsg.includes('write')) {
      return `I can help with file operations! However, I'm running in fallback mode.

**What I understand you want to do:**
- Create/modify files
- Organize project structure
- Generate content

**To enable full file operation AI assistance:**
1. Start Ollama: \`ollama serve\`
2. Use the terminal to create files manually, or
3. Use the file explorer in the app

**Quick tip:** You can use the terminal with commands like:
- \`touch filename.txt\` - Create a file
- \`echo "content" > file.txt\` - Write to a file
- \`ls\` - List files

*Connect Ollama for intelligent file operation assistance.*`;
    }
    
    // Terminal/command requests
    if (lowerMsg.includes('terminal') || lowerMsg.includes('command') || lowerMsg.includes('run')) {
      return `I'd help you with terminal commands, but I'm in fallback mode.

**Common terminal commands you might need:**
- \`ls\` or \`la\` - List files
- \`pwd\` - Show current directory
- \`cd <directory>\` - Change directory
- \`cat <file>\` - View file contents
- \`mkdir <name>\` - Create directory
- \`cp <source> <dest>\` - Copy files
- \`mv <source> <dest>\` - Move/rename files

**To get AI-powered terminal assistance:**
1. Start Ollama: \`ollama serve\`
2. Try your request again

*This is a basic response. Connect Ollama for intelligent command suggestions.*`;
    }
    
    // Analysis requests
    if (lowerMsg.includes('analyze') || lowerMsg.includes('review') || lowerMsg.includes('check')) {
      return `I'd love to analyze your code/project! Currently running in fallback mode.

**For comprehensive code analysis, you'll need:**
1. Ollama running: \`ollama serve\`
2. A coding model: \`ollama pull deepseek-coder:6.7b\`

**Manual analysis tips:**
- Check for consistent formatting
- Look for unused variables
- Verify error handling
- Ensure proper documentation
- Test edge cases

**Meanwhile, you can use:**
- ESLint for JavaScript/TypeScript linting
- Your IDE's built-in analysis tools
- Code review checklists

*Connect Ollama for AI-powered code analysis.*`;
    }
    
    // General programming questions
    if (lowerMsg.includes('how') || lowerMsg.includes('what') || lowerMsg.includes('why')) {
      return `Great question! I'm in fallback mode, so I can only provide basic responses.

**Your question:** "${message}"

**Basic guidance:**
- For coding questions: Check documentation, Stack Overflow, or GitHub
- For terminal issues: Try \`man <command>\` for help
- For debugging: Use console.log, debugger tools, or error messages

**For detailed AI assistance:**
1. Install Ollama: \`curl -fsSL https://ollama.ai/install.sh | sh\`
2. Start it: \`ollama serve\`
3. Pull a model: \`ollama pull deepseek-coder:6.7b\`
 
 *This is a fallback response. Connect Ollama for intelligent answers.*`;
    }
    
    // Default response
    return `Hello! I'm running in fallback mode since Ollama isn't available.

**Your message:** "${message}"

**To enable full AI capabilities:**
1. Install Ollama: \`curl -fsSL https://ollama.ai/install.sh | sh\`
2. Start Ollama: \`ollama serve\`
3. Pull a model: \`ollama pull deepseek-coder:6.7b\`

**What I can help with when Ollama is running:**
- Code generation and refactoring
- File operations and project organization
- Terminal command assistance
- Code analysis and debugging
- Technical explanations and tutorials

**For now, you can:**
- Use the terminal directly for file operations
- Browse and edit files in the file explorer
- Create files manually

*This is a mock AI response. Connect Ollama for full functionality.*`;
  }

  async generateResponse(messages: AIMessage[], options: any = {}): Promise<AIResponse> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate thinking time
    
    const lastMessage = messages[messages.length - 1];
    const response = this.getResponseForPrompt(lastMessage.content);
    
    return {
      content: response,
      model: 'mock-fallback',
      finish_reason: 'stop'
    };
  }

  async streamResponse(messages: AIMessage[], onChunk: (chunk: string) => void, options: any = {}): Promise<void> {
    const lastMessage = messages[messages.length - 1];
    const response = this.getResponseForPrompt(lastMessage.content);
    
    // Simulate streaming by sending chunks
    const words = response.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      onChunk(words[i] + ' ');
    }
  }

  async checkConnection(): Promise<boolean> {
    return true; // Mock AI is always "available"
  }

  async listModels(): Promise<string[]> {
    return ['mock-fallback'];
  }
}

export const mockAIProvider = new MockAIProvider();