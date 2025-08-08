import { aiProviderManager, AIMessage } from './ai-providers';
import { FileSystemService } from './file-system';
import { TerminalService, CommandResult } from './terminal';
import { EventEmitter } from 'events';

export interface AgentTask {
  id: string;
  type: 'code' | 'command' | 'file' | 'analysis';
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: number;
}

export interface AgentState {
  isRunning: boolean;
  currentTask?: AgentTask;
  taskHistory: AgentTask[];
  workspaceInfo: any;
  systemInfo: any;
}

export class DevAIAgent extends EventEmitter {
  private fileSystemService: FileSystemService;
  private terminalService: TerminalService;
  private state: AgentState;
  private autoMode: boolean = false;
  private taskQueue: AgentTask[] = [];

  constructor() {
    super();
    this.fileSystemService = new FileSystemService();
    this.terminalService = new TerminalService();
    
    this.state = {
      isRunning: false,
      taskHistory: [],
      workspaceInfo: {},
      systemInfo: {},
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.terminalService.on('output', ({ processId, output }) => {
      this.emit('terminal-output', { processId, output });
    });
  }

  async initialize(): Promise<void> {
    try {
      // Check AI provider connection
      const isConnected = await aiProviderManager.checkConnection();
      if (!isConnected) {
        throw new Error('AI provider is not connected. Please check your configuration.');
      }

      // Get system information
      this.state.systemInfo = await this.terminalService.getSystemInfo();
      
      // Get workspace information
      this.state.workspaceInfo = await this.fileSystemService.getWorkspaceInfo();

      this.emit('initialized', this.state);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async startAutoMode(): Promise<void> {
    this.autoMode = true;
    this.state.isRunning = true;
    this.emit('auto-mode-started');
    
    while (this.autoMode && this.state.isRunning) {
      try {
        await this.processNextTask();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
      } catch (error) {
        console.error('Error in auto mode:', error);
        this.emit('error', error);
      }
    }
  }

  stopAutoMode(): void {
    this.autoMode = false;
    this.state.isRunning = false;
    this.emit('auto-mode-stopped');
  }

  async addTask(task: Omit<AgentTask, 'id' | 'status' | 'timestamp'>): Promise<string> {
    const newTask: AgentTask = {
      ...task,
      id: Date.now().toString(),
      status: 'pending',
      timestamp: Date.now(),
    };

    this.taskQueue.push(newTask);
    this.state.taskHistory.push(newTask);
    this.emit('task-added', newTask);

    if (this.autoMode) {
      // Auto mode will pick up the task
    } else {
      // Execute immediately
      await this.executeTask(newTask);
    }

    return newTask.id;
  }

  private async processNextTask(): Promise<void> {
    if (this.taskQueue.length === 0) {
      // Generate a new task based on current state
      await this.generateNextTask();
      return;
    }

    const task = this.taskQueue.shift();
    if (task) {
      await this.executeTask(task);
    }
  }

  private async generateNextTask(): Promise<void> {
    try {
      const context = await this.buildContext();
      
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: `You are DevAI, an autonomous coding agent. Analyze the current workspace and suggest the next action to take. You can:
1. Write or modify code files
2. Run commands to build, test, or deploy
3. Analyze code for improvements
4. Create new files or directories
5. Fix errors or issues

Current workspace: ${JSON.stringify(context.workspaceInfo)}
Recent tasks: ${JSON.stringify(context.recentTasks)}
Available commands: ${JSON.stringify(context.availableCommands)}

Respond with a JSON object containing:
{
  "action": "code|command|file|analysis",
  "description": "What you want to do",
  "details": {
    // Action-specific details
  }
}`
        }
      ];

      const response = await aiProviderManager.generateResponse(messages);
      
      try {
        const action = JSON.parse(response.content);
        await this.addTask({
          type: action.action as any,
          description: action.description,
        });
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
      }
    } catch (error) {
      console.error('Error generating next task:', error);
    }
  }

  private async buildContext(): Promise<any> {
    const recentTasks = this.state.taskHistory.slice(-5);
    const availableCommands = await this.terminalService.getAvailableCommands();
    
    return {
      workspaceInfo: this.state.workspaceInfo,
      systemInfo: this.state.systemInfo,
      recentTasks,
      availableCommands,
    };
  }

  private async executeTask(task: AgentTask): Promise<void> {
    this.state.currentTask = task;
    task.status = 'running';
    this.emit('task-started', task);

    try {
      switch (task.type) {
        case 'code':
          task.result = await this.executeCodeTask(task);
          break;
        case 'command':
          task.result = await this.executeCommandTask(task);
          break;
        case 'file':
          task.result = await this.executeFileTask(task);
          break;
        case 'analysis':
          task.result = await this.executeAnalysisTask(task);
          break;
      }

      task.status = 'completed';
      this.emit('task-completed', task);
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      this.emit('task-failed', task);
    }

    this.state.currentTask = undefined;
  }

  private async executeCodeTask(task: AgentTask): Promise<any> {
    const context = await this.buildContext();

    const wantsCommandOnly = /first command|one command|single command|heredoc|touch app\.py/i.test(task.description);

    const systemPrompt = wantsCommandOnly
      ? `You are a command-only assistant. Output exactly ONE bash command, and nothing else. No markdown. Assume Linux bash at project root. Prefer idempotent commands. For writing multi-line files, use a single heredoc like: cat > file << 'EOF' ... EOF`
      : `You are a coding assistant. Generate code based on the task description. Consider the current workspace structure and available tools.

Workspace info: ${JSON.stringify(context.workspaceInfo)}
Available commands: ${JSON.stringify(context.availableCommands)}

Generate code that is:
1. Functional and correct
2. Well-documented
3. Follows best practices
4. Compatible with the current environment

Respond with the code directly, no explanations unless specifically requested.`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: task.description }
    ];

    const response = await aiProviderManager.generateResponse(messages, wantsCommandOnly ? { max_tokens: 256 } : {});
    return wantsCommandOnly ? { command: response.content.trim() } : { generatedCode: response.content };
  }

  private async executeCommandTask(task: AgentTask): Promise<CommandResult> {
    // Extract command from task description or use the description as command
    const command = task.description;
    
    const result = await this.terminalService.executeCommand(command, {
      timeout: 30000, // 30 seconds timeout
    });

    return result;
  }

  private async executeFileTask(task: AgentTask): Promise<any> {
    const context = await this.buildContext();
    
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a file management assistant. Perform file operations based on the task description.

Current workspace: ${JSON.stringify(context.workspaceInfo)}

Available operations:
- Read files
- Write new files
- Modify existing files
- Create directories
- List files

Respond with a JSON object containing the file operation details.`
      },
      {
        role: 'user',
        content: task.description
      }
    ];

    const response = await aiProviderManager.generateResponse(messages);
    
    try {
      const operation = JSON.parse(response.content);
      
      switch (operation.action) {
        case 'read':
          return await this.fileSystemService.readFile(operation.path);
        case 'write':
          await this.fileSystemService.writeFile(operation.path, operation.content);
          return { success: true, path: operation.path };
        case 'list':
          return await this.fileSystemService.listFiles(operation.path);
        default:
          throw new Error(`Unknown file operation: ${operation.action}`);
      }
    } catch (parseError) {
      throw new Error(`Failed to parse file operation: ${parseError}`);
    }
  }

  private async executeAnalysisTask(task: AgentTask): Promise<any> {
    const context = await this.buildContext();
    
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a code analysis assistant. Analyze the current workspace and provide insights, suggestions, or identify issues.

Workspace info: ${JSON.stringify(context.workspaceInfo)}
Recent tasks: ${JSON.stringify(context.recentTasks)}

Provide a comprehensive analysis including:
1. Code quality assessment
2. Potential improvements
3. Security considerations
4. Performance optimizations
5. Best practices recommendations`
      },
      {
        role: 'user',
        content: task.description
      }
    ];

    const response = await aiProviderManager.generateResponse(messages);
    return { analysis: response.content };
  }

  getState(): AgentState {
    return { ...this.state };
  }

  async getTaskHistory(): Promise<AgentTask[]> {
    return [...this.state.taskHistory];
  }

  async getCurrentTask(): Promise<AgentTask | undefined> {
    return this.state.currentTask;
  }

  isAutoMode(): boolean {
    return this.autoMode;
  }
}

export const devAIAgent = new DevAIAgent();