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
      // Test the connection first
      const isConnectable = await this.testConnection(
        connection.host,
        connection.port,
        connection.username,
        connection.password,
        connection.privateKey
      );

      if (!isConnectable) {
        sshConnection.status = 'error';
        throw new Error('SSH connection test failed');
      }

      // Connection test passed, mark as connected
      sshConnection.status = 'connected';
      this.emit('connected', { connectionId: id });
      return id;
    } catch (error) {
      sshConnection.status = 'error';
      const message = error instanceof Error ? error.message : String(error);
      this.emit('error', { connectionId: id, error: message });
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

    // Use a simpler approach: spawn a new SSH process for each command
    return new Promise((resolve, reject) => {
      try {
        const sshArgs = [
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'UserKnownHostsFile=/dev/null',
          '-o', 'ConnectTimeout=10',
          '-p', connection.port.toString(),
          `${connection.username}@${connection.host}`,
          command
        ];

        // Add private key if available
        if (connection.privateKey) {
          sshArgs.unshift('-i', connection.privateKey);
        }

        const process = spawn('ssh', sshArgs, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        process.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        process.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        process.on('close', (code) => {
          sshCommand.exitCode = code || 0;
          sshCommand.output = stdout;
          
          // Store command
          const connectionCommands = this.commands.get(connectionId) || [];
          connectionCommands.push(sshCommand);
          this.commands.set(connectionId, connectionCommands);
          
          this.emit('command-executed', { connectionId, command: sshCommand });
          resolve(sshCommand);
        });

        process.on('error', (error) => {
          sshCommand.exitCode = 1;
          const message = error instanceof Error ? error.message : String(error);
          sshCommand.output = `SSH Error: ${message}\nConnection: ${connection.username}@${connection.host}:${connection.port}\nCommand: ${command}`;
          reject(error);
        });

        // Send password if needed
        if (connection.password) {
          setTimeout(() => {
            process.stdin?.write(connection.password + '\n');
          }, 100);
        }

        // Timeout after 30 seconds
        setTimeout(() => {
          process.kill('SIGTERM');
          if (sshCommand.exitCode === 0) {
            sshCommand.exitCode = 124; // timeout exit code
            sshCommand.output = stdout || 'Command timed out';
            resolve(sshCommand);
          }
        }, 30000);
        
      } catch (error) {
        sshCommand.exitCode = 1;
        const message = error instanceof Error ? error.message : String(error);
        sshCommand.output = message;
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
        '-o', 'BatchMode=no',
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
          if (code === 0 && output.includes('Connection test successful')) {
            resolve(true);
          } else {
            console.error(`SSH test failed for ${username}@${host}:${port}`);
            console.error(`Exit code: ${code}`);
            console.error(`Output: ${output}`);
            console.error(`Error: ${errorOutput}`);
            resolve(false);
          }
        });

        process.on('error', (error) => {
          console.error(`SSH test process error: ${error.message}`);
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
      const message = error instanceof Error ? error.message : String(error);
      console.error(`SSH test connection error: ${message}`);
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
sshService.on('error', (payload: any) => {
  console.error('SSHService error event:', payload);
});