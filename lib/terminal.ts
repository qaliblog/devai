import { spawn, exec } from 'child_process';
import { EventEmitter } from 'events';
import { workspaceManager } from './workspace';
import { sshService } from './ssh';

export interface TerminalOutput {
  type: 'stdout' | 'stderr' | 'exit';
  data: string;
  timestamp: number;
}

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  workspaceId?: string;
}

export class TerminalService extends EventEmitter {
  private processes: Map<string, any> = new Map();
  private outputHistory: Map<string, TerminalOutput[]> = new Map();
  private activeWorkspaceId: string | null = null;

  async executeCommand(
    command: string,
    options: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
      shell?: boolean;
      workspaceId?: string;
    } = {}
  ): Promise<CommandResult> {
    const workspace = options.workspaceId ? 
      workspaceManager.getWorkspace(options.workspaceId) : 
      workspaceManager.getActiveWorkspace();

    if (workspace && workspace.type === 'ssh') {
      return this.executeSSHCommand(workspace, command, options);
    } else {
      return this.executeLocalCommand(command, options);
    }
  }

  private async executeLocalCommand(
    command: string,
    options: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
      shell?: boolean;
      workspaceId?: string;
    } = {}
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let killed = false;

      const workspace = options.workspaceId ? 
        workspaceManager.getWorkspace(options.workspaceId) : 
        workspaceManager.getActiveWorkspace();

      const cwd = options.cwd || (workspace ? workspace.path : process.cwd());

      // Handle common aliases
      let actualCommand = command;
      if (command === 'la') {
        actualCommand = 'ls -la';
      } else if (command === 'll') {
        actualCommand = 'ls -l';
      }

      // Termux-specific environment
      const isTermux = process.env.PREFIX?.includes('/data/data/com.termux') || false;
      const termuxEnv = isTermux ? {
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        PATH: `${process.env.PREFIX}/bin:${process.env.PATH}`,
        ...process.env
      } : process.env;

      const process = spawn(actualCommand, [], {
        cwd,
        env: { ...termuxEnv, ...options.env },
        shell: options.shell !== false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const processId = process.pid?.toString() || Date.now().toString();
      this.processes.set(processId, process);
      this.outputHistory.set(processId, []);

      const addOutput = (type: 'stdout' | 'stderr', data: string) => {
        const output: TerminalOutput = {
          type,
          data,
          timestamp: Date.now(),
        };
        
        this.outputHistory.get(processId)?.push(output);
        this.emit('output', { processId, output });
        
        if (type === 'stdout') {
          stdout += data;
        } else {
          stderr += data;
        }
      };

      process.stdout?.on('data', (data) => {
        addOutput('stdout', data.toString());
      });

      process.stderr?.on('data', (data) => {
        addOutput('stderr', data.toString());
      });

      process.on('close', (code) => {
        const duration = Date.now() - startTime;
        const exitOutput: TerminalOutput = {
          type: 'exit',
          data: `Process exited with code ${code}`,
          timestamp: Date.now(),
        };
        
        this.outputHistory.get(processId)?.push(exitOutput);
        this.emit('output', { processId, output: exitOutput });
        
        this.processes.delete(processId);
        
        const workspace = options.workspaceId ? 
          workspaceManager.getWorkspace(options.workspaceId) : 
          workspaceManager.getActiveWorkspace();
        
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code || 0,
          duration,
          workspaceId: workspace?.id,
        });
      });

      process.on('error', (error) => {
        const duration = Date.now() - startTime;
        this.processes.delete(processId);
        reject({
          success: false,
          stdout,
          stderr: error.message,
          exitCode: -1,
          duration,
        });
      });

      if (options.timeout) {
        setTimeout(() => {
          if (!killed && process.pid) {
            killed = true;
            process.kill('SIGTERM');
            setTimeout(() => {
              if (process.pid) {
                process.kill('SIGKILL');
              }
            }, 5000);
          }
        }, options.timeout);
      }
    });
  }

  async executeCommandSimple(command: string, cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}\nStderr: ${stderr}`));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  killProcess(processId: string): boolean {
    const process = this.processes.get(processId);
    if (process) {
      process.kill('SIGTERM');
      this.processes.delete(processId);
      return true;
    }
    return false;
  }

  killAllProcesses(): void {
    for (const [processId, process] of this.processes) {
      process.kill('SIGTERM');
    }
    this.processes.clear();
  }

  getProcessOutput(processId: string): TerminalOutput[] {
    return this.outputHistory.get(processId) || [];
  }

  getAllProcesses(): string[] {
    return Array.from(this.processes.keys());
  }

  async getSystemInfo(): Promise<{
    platform: string;
    arch: string;
    nodeVersion: string;
    cwd: string;
    env: Record<string, string>;
    isTermux?: boolean;
  }> {
    const isTermux = process.env.PREFIX?.includes('/data/data/com.termux') || false;
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cwd: process.cwd(),
      env: process.env,
      isTermux,
    };
  }

  async checkCommandExists(command: string): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        await this.executeCommandSimple(`where ${command}`);
      } else {
        await this.executeCommandSimple(`which ${command}`);
      }
      return true;
    } catch {
      return false;
    }
  }

  async getAvailableCommands(): Promise<string[]> {
    const commonCommands = [
      'git', 'npm', 'node', 'python', 'python3', 'pip', 'pip3',
      'gcc', 'g++', 'make', 'cmake', 'docker', 'docker-compose',
      'kubectl', 'helm', 'terraform', 'aws', 'az', 'gcloud',
      'curl', 'wget', 'tar', 'zip', 'unzip', 'ssh', 'scp',
      'rsync', 'vim', 'nano', 'emacs', 'code', 'subl',
      'ls', 'la', 'll', 'cat', 'grep', 'find', 'touch', 'mkdir',
      'rm', 'cp', 'mv', 'pwd', 'cd', 'echo', 'head', 'tail'
    ];

    const available: string[] = [];
    
    for (const command of commonCommands) {
      // For aliases, we just add them directly since they're handled in executeCommand
      if (command === 'la' || command === 'll') {
        available.push(command);
      } else if (await this.checkCommandExists(command)) {
        available.push(command);
      }
    }
    
    return available;
  }

  private async executeSSHCommand(
    workspace: any,
    command: string,
    options: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
      shell?: boolean;
      workspaceId?: string;
    } = {}
  ): Promise<CommandResult> {
    if (!workspace.sshConnection) {
      throw new Error('SSH connection not available');
    }

    const startTime = Date.now();
    
    try {
      const sshCommand = await sshService.executeCommand(workspace.sshConnection.id, command);
      
      const duration = Date.now() - startTime;
      
      return {
        success: sshCommand.exitCode === 0,
        stdout: sshCommand.output,
        stderr: '',
        exitCode: sshCommand.exitCode,
        duration,
        workspaceId: workspace.id,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        stdout: '',
        stderr: error.message,
        exitCode: -1,
        duration,
        workspaceId: workspace.id,
      };
    }
  }

  setActiveWorkspace(workspaceId: string): void {
    this.activeWorkspaceId = workspaceId;
  }

  getActiveWorkspaceId(): string | null {
    return this.activeWorkspaceId;
  }

  async getCurrentDirectory(workspaceId?: string): Promise<string> {
    const workspace = workspaceId ? 
      workspaceManager.getWorkspace(workspaceId) : 
      workspaceManager.getActiveWorkspace();

    if (!workspace) {
      return process.cwd();
    }

    if (workspace.type === 'ssh') {
      if (!workspace.sshConnection) {
        throw new Error('SSH connection not available');
      }
      
      const result = await sshService.executeCommand(workspace.sshConnection.id, 'pwd');
      return result.output.trim();
    } else {
      return workspace.path;
    }
  }

  async changeDirectory(path: string, workspaceId?: string): Promise<void> {
    const workspace = workspaceId ? 
      workspaceManager.getWorkspace(workspaceId) : 
      workspaceManager.getActiveWorkspace();

    if (!workspace) {
      throw new Error('No active workspace available');
    }

    if (workspace.type === 'ssh') {
      if (!workspace.sshConnection) {
        throw new Error('SSH connection not available');
      }
      
      await sshService.executeCommand(workspace.sshConnection.id, `cd "${path}" && pwd`);
    } else {
      // For local workspace, we can't change the working directory of the process
      // but we can update the workspace path
      workspace.path = path;
    }
  }
}

export const terminalService = new TerminalService();