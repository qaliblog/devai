import fs from 'fs-extra';
import path from 'path';
import { sshService, SSHConnection } from './ssh';

export interface Workspace {
  id: string;
  name: string;
  type: 'local' | 'ssh';
  path: string;
  sshConnection?: SSHConnection;
  isActive: boolean;
  lastAccessed: number;
}

export interface WorkspaceInfo {
  totalFiles: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  gitInfo?: {
    branch: string;
    status: string;
    remote: string;
  };
}

export class WorkspaceManager {
  private workspaces: Map<string, Workspace> = new Map();
  private activeWorkspaceId: string | null = null;
  private defaultWorkspacePath: string;

  constructor(defaultPath: string = process.cwd()) {
    this.defaultWorkspacePath = defaultPath;
    this.initializeDefaultWorkspace();
  }

  private initializeDefaultWorkspace(): void {
    const defaultWorkspace: Workspace = {
      id: 'default',
      name: 'Current Project',
      type: 'local',
      path: this.defaultWorkspacePath,
      isActive: true,
      lastAccessed: Date.now(),
    };

    this.workspaces.set('default', defaultWorkspace);
    this.activeWorkspaceId = 'default';
  }

  async addLocalWorkspace(name: string, workspacePath: string): Promise<string> {
    const id = `local_${Date.now()}`;
    const workspace: Workspace = {
      id,
      name,
      type: 'local',
      path: path.resolve(workspacePath),
      isActive: false,
      lastAccessed: Date.now(),
    };

    // Verify workspace exists and is accessible
    if (!(await fs.pathExists(workspace.path))) {
      throw new Error(`Workspace path does not exist: ${workspace.path}`);
    }

    this.workspaces.set(id, workspace);
    return id;
  }

  async addSSHWorkspace(name: string, sshConnection: SSHConnection): Promise<string> {
    const id = `ssh_${Date.now()}`;
    const workspace: Workspace = {
      id,
      name,
      type: 'ssh',
      path: `/home/${sshConnection.username}`,
      sshConnection,
      isActive: false,
      lastAccessed: Date.now(),
    };

    this.workspaces.set(id, workspace);
    return id;
  }

  async setActiveWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    // Deactivate current workspace
    if (this.activeWorkspaceId) {
      const currentWorkspace = this.workspaces.get(this.activeWorkspaceId);
      if (currentWorkspace) {
        currentWorkspace.isActive = false;
      }
    }

    // Activate new workspace
    workspace.isActive = true;
    workspace.lastAccessed = Date.now();
    this.activeWorkspaceId = workspaceId;
  }

  getActiveWorkspace(): Workspace | null {
    if (!this.activeWorkspaceId) return null;
    return this.workspaces.get(this.activeWorkspaceId) || null;
  }

  getAllWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values()).sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  getWorkspace(workspaceId: string): Workspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  async removeWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    // Don't allow removing the default workspace
    if (workspaceId === 'default') {
      throw new Error('Cannot remove the default workspace');
    }

    // If this is the active workspace, switch to default
    if (workspace.isActive) {
      await this.setActiveWorkspace('default');
    }

    this.workspaces.delete(workspaceId);
  }

  async getWorkspaceInfo(workspaceId: string): Promise<WorkspaceInfo> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    if (workspace.type === 'ssh') {
      return this.getSSHWorkspaceInfo(workspace);
    } else {
      return this.getLocalWorkspaceInfo(workspace);
    }
  }

  private async getLocalWorkspaceInfo(workspace: Workspace): Promise<WorkspaceInfo> {
    let totalFiles = 0;
    let totalSize = 0;
    const fileTypes: Record<string, number> = {};

    const walk = async (currentPath: string) => {
      try {
        const items = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const item of items) {
          const itemPath = path.join(currentPath, item.name);
          
          if (item.isDirectory()) {
            // Skip node_modules and other large directories
            if (item.name === 'node_modules' || item.name === '.git') {
              continue;
            }
            await walk(itemPath);
          } else {
            totalFiles++;
            const stats = await fs.stat(itemPath);
            totalSize += stats.size;
            
            const ext = path.extname(item.name).toLowerCase();
            fileTypes[ext] = (fileTypes[ext] || 0) + 1;
          }
        }
      } catch (error) {
        // Skip inaccessible directories
      }
    };

    await walk(workspace.path);

    // Get git info if available
    let gitInfo;
    try {
      const gitPath = path.join(workspace.path, '.git');
      if (await fs.pathExists(gitPath)) {
        const { execSync } = require('child_process');
        const branch = execSync('git branch --show-current', { cwd: workspace.path }).toString().trim();
        const status = execSync('git status --porcelain', { cwd: workspace.path }).toString().trim();
        const remote = execSync('git remote get-url origin', { cwd: workspace.path }).toString().trim();
        
        gitInfo = { branch, status, remote };
      }
    } catch (error) {
      // Git info not available
    }

    return {
      totalFiles,
      totalSize,
      fileTypes,
      gitInfo,
    };
  }

  private async getSSHWorkspaceInfo(workspace: Workspace): Promise<WorkspaceInfo> {
    if (!workspace.sshConnection) {
      throw new Error('SSH connection not available');
    }

    // Execute commands on remote server to get workspace info
    const commands = [
      `find ${workspace.path} -type f | wc -l`,
      `du -sb ${workspace.path} | cut -f1`,
      `find ${workspace.path} -type f -name "*.js" | wc -l`,
      `find ${workspace.path} -type f -name "*.ts" | wc -l`,
      `find ${workspace.path} -type f -name "*.py" | wc -l`,
      `find ${workspace.path} -type f -name "*.json" | wc -l`,
    ];

    const results = await Promise.all(
      commands.map(cmd => 
        sshService.executeCommand(workspace.sshConnection!.id, cmd)
      )
    );

    const totalFiles = parseInt(results[0].output.trim()) || 0;
    const totalSize = parseInt(results[1].output.trim()) || 0;
    const fileTypes = {
      '.js': parseInt(results[2].output.trim()) || 0,
      '.ts': parseInt(results[3].output.trim()) || 0,
      '.py': parseInt(results[4].output.trim()) || 0,
      '.json': parseInt(results[5].output.trim()) || 0,
    };

    // Get git info if available
    let gitInfo;
    try {
      const gitBranchCmd = `cd ${workspace.path} && git branch --show-current 2>/dev/null || echo ""`;
      const gitStatusCmd = `cd ${workspace.path} && git status --porcelain 2>/dev/null || echo ""`;
      const gitRemoteCmd = `cd ${workspace.path} && git remote get-url origin 2>/dev/null || echo ""`;

      const [branchResult, statusResult, remoteResult] = await Promise.all([
        sshService.executeCommand(workspace.sshConnection!.id, gitBranchCmd),
        sshService.executeCommand(workspace.sshConnection!.id, gitStatusCmd),
        sshService.executeCommand(workspace.sshConnection!.id, gitRemoteCmd),
      ]);

      const branch = branchResult.output.trim();
      const status = statusResult.output.trim();
      const remote = remoteResult.output.trim();

      if (branch) {
        gitInfo = { branch, status, remote };
      }
    } catch (error) {
      // Git info not available
    }

    return {
      totalFiles,
      totalSize,
      fileTypes,
      gitInfo,
    };
  }

  async listWorkspaceFiles(workspaceId: string, subPath: string = '.'): Promise<string[]> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    if (workspace.type === 'ssh') {
      return this.listSSHWorkspaceFiles(workspace, subPath);
    } else {
      return this.listLocalWorkspaceFiles(workspace, subPath);
    }
  }

  private async listLocalWorkspaceFiles(workspace: Workspace, subPath: string): Promise<string[]> {
    const fullPath = path.join(workspace.path, subPath);
    
    try {
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      return items.map(item => {
        const relativePath = path.join(subPath, item.name);
        return item.isDirectory() ? `${relativePath}/` : relativePath;
      });
    } catch (error) {
      return [];
    }
  }

  private async listSSHWorkspaceFiles(workspace: Workspace, subPath: string): Promise<string[]> {
    if (!workspace.sshConnection) {
      throw new Error('SSH connection not available');
    }

    const fullPath = path.join(workspace.path, subPath);
    const command = `ls -la "${fullPath}" | tail -n +2 | awk '{print $9}'`;
    
    try {
      const result = await sshService.executeCommand(workspace.sshConnection.id, command);
      return result.output.split('\n')
        .filter(line => line.trim())
        .map(item => {
          const relativePath = path.join(subPath, item);
          return item.endsWith('/') ? relativePath : relativePath;
        });
    } catch (error) {
      return [];
    }
  }

  async readWorkspaceFile(workspaceId: string, filePath: string): Promise<string> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    if (workspace.type === 'ssh') {
      return this.readSSHWorkspaceFile(workspace, filePath);
    } else {
      return this.readLocalWorkspaceFile(workspace, filePath);
    }
  }

  private async readLocalWorkspaceFile(workspace: Workspace, filePath: string): Promise<string> {
    const fullPath = path.join(workspace.path, filePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  private async readSSHWorkspaceFile(workspace: Workspace, filePath: string): Promise<string> {
    if (!workspace.sshConnection) {
      throw new Error('SSH connection not available');
    }

    const fullPath = path.join(workspace.path, filePath);
    const command = `cat "${fullPath}"`;
    
    const result = await sshService.executeCommand(workspace.sshConnection.id, command);
    return result.output;
  }

  async writeWorkspaceFile(workspaceId: string, filePath: string, content: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    if (workspace.type === 'ssh') {
      return this.writeSSHWorkspaceFile(workspace, filePath, content);
    } else {
      return this.writeLocalWorkspaceFile(workspace, filePath, content);
    }
  }

  private async writeLocalWorkspaceFile(workspace: Workspace, filePath: string, content: string): Promise<void> {
    const fullPath = path.join(workspace.path, filePath);
    const dir = path.dirname(fullPath);
    await fs.ensureDir(dir);
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  private async writeSSHWorkspaceFile(workspace: Workspace, filePath: string, content: string): Promise<void> {
    if (!workspace.sshConnection) {
      throw new Error('SSH connection not available');
    }

    const fullPath = path.join(workspace.path, filePath);
    const dir = path.dirname(fullPath);
    
    // Create directory if it doesn't exist
    await sshService.executeCommand(workspace.sshConnection.id, `mkdir -p "${dir}"`);
    
    // Write file content
    const escapedContent = content.replace(/'/g, "'\"'\"'");
    const command = `echo '${escapedContent}' > "${fullPath}"`;
    
    await sshService.executeCommand(workspace.sshConnection.id, command);
  }
}

export const workspaceManager = new WorkspaceManager();