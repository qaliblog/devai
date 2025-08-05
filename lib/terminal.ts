import { spawn, exec } from 'child_process';
import { EventEmitter } from 'events';

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
}

export class TerminalService extends EventEmitter {
  private processes: Map<string, any> = new Map();
  private outputHistory: Map<string, TerminalOutput[]> = new Map();

  async executeCommand(
    command: string,
    options: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
      shell?: boolean;
    } = {}
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let killed = false;

      const process = spawn(command, [], {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
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
        
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code || 0,
          duration,
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
  }> {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cwd: process.cwd(),
      env: process.env,
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
      'rsync', 'vim', 'nano', 'emacs', 'code', 'subl'
    ];

    const available: string[] = [];
    
    for (const command of commonCommands) {
      if (await this.checkCommandExists(command)) {
        available.push(command);
      }
    }
    
    return available;
  }
}

export const terminalService = new TerminalService();