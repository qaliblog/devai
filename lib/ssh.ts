import { EventEmitter } from 'events';
import { spawn } from 'child_process';

export interface SSHConnection {
  id: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  process?: any;
  output: string[];
}

export interface SSHCommand {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  timestamp: number;
}

export class SSHService extends EventEmitter {
  private connections: Map<string, SSHConnection> = new Map();
  private commands: Map<string, SSHCommand[]> = new Map();

  async connect(connection: Omit<SSHConnection, 'id' | 'status' | 'output'>): Promise<string> {
    const id = Date.now().toString();
    const sshConnection: SSHConnection = {
      ...connection,
      id,
      status: 'connecting',
      output: [],
    };

    this.connections.set(id, sshConnection);
    this.commands.set(id, []);

    try {
      // Build SSH command
      const sshArgs = [
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'UserKnownHostsFile=/dev/null',
        '-p', connection.port.toString(),
        `${connection.username}@${connection.host}`,
      ];

      // Add private key if provided
      if (connection.privateKey) {
        sshArgs.unshift('-i', connection.privateKey);
      }

      // Start SSH process
      const process = spawn('ssh', sshArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      sshConnection.process = process;
      sshConnection.status = 'connected';

      // Handle process events
      process.stdout?.on('data', (data) => {
        const output = data.toString();
        sshConnection.output.push(output);
        this.emit('output', { connectionId: id, output, type: 'stdout' });
      });

      process.stderr?.on('data', (data) => {
        const output = data.toString();
        sshConnection.output.push(output);
        this.emit('output', { connectionId: id, output, type: 'stderr' });
      });

      process.on('close', (code) => {
        sshConnection.status = 'disconnected';
        this.emit('disconnected', { connectionId: id, code });
      });

      process.on('error', (error) => {
        sshConnection.status = 'error';
        this.emit('error', { connectionId: id, error: (error as Error).message });
      });

      // Handle password input if needed
      if (connection.password) {
        process.stdin?.write(connection.password + '\n');
      }

      this.emit('connected', { connectionId: id });
      return id;
    } catch (error) {
      sshConnection.status = 'error';
      this.emit('error', { connectionId: id, error: (error as Error).message });
      throw error;
    }
  }

  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.process) {
      connection.process.kill('SIGTERM');
    }

    connection.status = 'disconnected';
    this.connections.delete(connectionId);
    this.commands.delete(connectionId);

    this.emit('disconnected', { connectionId });
  }

  async executeCommand(connectionId: string, command: string): Promise<SSHCommand> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('Connection not available');
    }

    const commandId = Date.now().toString();
    const sshCommand: SSHCommand = {
      id: commandId,
      command,
      output: '',
      exitCode: 0,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      try {
        // Use a simpler approach - execute command and capture output
        // We'll use a unique separator to identify the end of output
        const separator = `___END_OF_COMMAND_${commandId}___`;
        const fullCommand = `(${command}); echo "${separator}$?"`;
        
        let output = '';
        let commandStarted = false;
        let commandFinished = false;
        
        // Set up temporary data handler for this command
        const dataHandler = (data: Buffer) => {
          if (commandFinished) return;
          
          const text = data.toString();
          
          // Look for our separator followed by exit code
          const separatorMatch = text.match(new RegExp(`${separator}(\\d+)`));
          if (separatorMatch) {
            commandFinished = true;
            
            // Extract exit code
            const exitCode = parseInt(separatorMatch[1], 10);
            sshCommand.exitCode = exitCode;
            
            // Clean up output - remove everything after and including the separator
            const separatorIndex = output.indexOf(separator);
            if (separatorIndex !== -1) {
              output = output.substring(0, separatorIndex);
            }
            
            // Also clean from current text if separator is there
            const currentSeparatorIndex = text.indexOf(separator);
            if (currentSeparatorIndex !== -1) {
              const beforeSeparator = text.substring(0, currentSeparatorIndex);
              output += beforeSeparator;
            }
            
            sshCommand.output = output.trim();
            
            // Remove this handler
            connection.process?.stdout?.removeListener('data', dataHandler);
            connection.process?.stderr?.removeListener('data', dataHandler);
            
            // Store command
            const connectionCommands = this.commands.get(connectionId) || [];
            connectionCommands.push(sshCommand);
            this.commands.set(connectionId, connectionCommands);
            
            this.emit('command-executed', { connectionId, command: sshCommand });
            resolve(sshCommand);
          } else {
            // Accumulate output
            if (commandStarted || text.includes('$') || output.length > 0) {
              commandStarted = true;
              output += text;
            }
          }
        };
        
        // Add temporary listeners for this command
        connection.process?.stdout?.on('data', dataHandler);
        connection.process?.stderr?.on('data', dataHandler);
        
        // Send command to SSH process
        if (connection.process?.stdin) {
          connection.process.stdin.write(fullCommand + '\n');
        } else {
          throw new Error('SSH connection stdin not available');
        }
        
        // Timeout after 30 seconds
        const timeout = setTimeout(() => {
          if (!commandFinished) {
            commandFinished = true;
            connection.process?.stdout?.removeListener('data', dataHandler);
            connection.process?.stderr?.removeListener('data', dataHandler);
            
            sshCommand.exitCode = 124; // timeout exit code
            sshCommand.output = output.trim() || 'Command timed out';
            
            const connectionCommands = this.commands.get(connectionId) || [];
            connectionCommands.push(sshCommand);
            this.commands.set(connectionId, connectionCommands);
            
            resolve(sshCommand);
          }
        }, 30000);
        
        // Clear timeout if command finishes normally
        const originalResolve = resolve;
        resolve = (result) => {
          clearTimeout(timeout);
          originalResolve(result);
        };
        
      } catch (error) {
        sshCommand.exitCode = 1;
        sshCommand.output = `Command execution failed: ${(error as Error).message}`;
        
        const connectionCommands = this.commands.get(connectionId) || [];
        connectionCommands.push(sshCommand);
        this.commands.set(connectionId, connectionCommands);
        
        reject(error);
      }
    });
  }

  getConnection(connectionId: string): SSHConnection | undefined {
    return this.connections.get(connectionId);
  }

  getAllConnections(): SSHConnection[] {
    return Array.from(this.connections.values());
  }

  getConnectionCommands(connectionId: string): SSHCommand[] {
    return this.commands.get(connectionId) || [];
  }

  async testConnection(host: string, port: number, username: string, password?: string, privateKey?: string): Promise<boolean> {
    try {
      const sshArgs = [
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'UserKnownHostsFile=/dev/null',
        '-o', 'ConnectTimeout=10',
        '-p', port.toString(),
        `${username}@${host}`,
        'echo "Connection test successful"',
      ];

      if (privateKey) {
        sshArgs.unshift('-i', privateKey);
      }

      return new Promise((resolve) => {
        const process = spawn('ssh', sshArgs, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let output = '';
        let errorOutput = '';

        process.stdout?.on('data', (data) => {
          output += data.toString();
        });

        process.stderr?.on('data', (data) => {
          errorOutput += data.toString();
        });

        process.on('close', (code) => {
          resolve(code === 0);
        });

        process.on('error', () => {
          resolve(false);
        });

        // Send password if provided
        if (password) {
          setTimeout(() => {
            process.stdin?.write(password + '\n');
          }, 1000);
        }

        // Timeout after 15 seconds
        setTimeout(() => {
          process.kill('SIGTERM');
          resolve(false);
        }, 15000);
      });
    } catch (error) {
      return false;
    }
  }

  async uploadFile(connectionId: string, localPath: string, remotePath: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const scpArgs = [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-P', connection.port.toString(),
      localPath,
      `${connection.username}@${connection.host}:${remotePath}`,
    ];

    if (connection.privateKey) {
      scpArgs.unshift('-i', connection.privateKey);
    }

    return new Promise((resolve, reject) => {
      const process = spawn('scp', scpArgs);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`SCP failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });

      if (connection.password) {
        process.stdin?.write(connection.password + '\n');
      }
    });
  }

  async downloadFile(connectionId: string, remotePath: string, localPath: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const scpArgs = [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-P', connection.port.toString(),
      `${connection.username}@${connection.host}:${remotePath}`,
      localPath,
    ];

    if (connection.privateKey) {
      scpArgs.unshift('-i', connection.privateKey);
    }

    return new Promise((resolve, reject) => {
      const process = spawn('scp', scpArgs);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`SCP failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });

      if (connection.password) {
        process.stdin?.write(connection.password + '\n');
      }
    });
  }
}

export const sshService = new SSHService();