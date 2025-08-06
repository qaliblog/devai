import fs from 'fs-extra';
import path from 'path';
import { FileOperation } from './ollama';

export class FileSystemService {
  private workspacePath: string;

  constructor(workspacePath: string = process.cwd()) {
    this.workspacePath = workspacePath;
  }

  async readFile(filePath: string): Promise<string> {
    try {
      const fullPath = path.resolve(this.workspacePath, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const fullPath = path.resolve(this.workspacePath, filePath);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      await fs.ensureDir(dir);
      
      await fs.writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.resolve(this.workspacePath, filePath);
      await fs.remove(fullPath);
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error}`);
    }
  }

  async listFiles(dirPath: string = '.'): Promise<string[]> {
    try {
      const fullPath = path.resolve(this.workspacePath, dirPath);
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      
      return items.map(item => {
        const relativePath = path.join(dirPath, item.name);
        return item.isDirectory() ? `${relativePath}/` : relativePath;
      });
    } catch (error) {
      throw new Error(`Failed to list files in ${dirPath}: ${error}`);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(this.workspacePath, filePath);
      return await fs.pathExists(fullPath);
    } catch (error) {
      return false;
    }
  }

  async getFileStats(filePath: string): Promise<fs.Stats | null> {
    try {
      const fullPath = path.resolve(this.workspacePath, filePath);
      return await fs.stat(fullPath);
    } catch (error) {
      return null;
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    try {
      const fullPath = path.resolve(this.workspacePath, dirPath);
      await fs.ensureDir(fullPath);
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error}`);
    }
  }

  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    try {
      const fullSourcePath = path.resolve(this.workspacePath, sourcePath);
      const fullDestPath = path.resolve(this.workspacePath, destPath);
      await fs.copy(fullSourcePath, fullDestPath);
    } catch (error) {
      throw new Error(`Failed to copy file from ${sourcePath} to ${destPath}: ${error}`);
    }
  }

  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    try {
      const fullSourcePath = path.resolve(this.workspacePath, sourcePath);
      const fullDestPath = path.resolve(this.workspacePath, destPath);
      await fs.move(fullSourcePath, fullDestPath);
    } catch (error) {
      throw new Error(`Failed to move file from ${sourcePath} to ${destPath}: ${error}`);
    }
  }

  async searchFiles(pattern: string, dirPath: string = '.'): Promise<string[]> {
    try {
      const fullPath = path.resolve(this.workspacePath, dirPath);
      const files: string[] = [];
      
      const walk = async (currentPath: string) => {
        const items = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const item of items) {
          const itemPath = path.join(currentPath, item.name);
          const relativePath = path.relative(fullPath, itemPath);
          
          if (item.isDirectory()) {
            await walk(itemPath);
          } else if (item.name.includes(pattern) || relativePath.includes(pattern)) {
            files.push(relativePath);
          }
        }
      };
      
      await walk(fullPath);
      return files;
    } catch (error) {
      throw new Error(`Failed to search files with pattern ${pattern}: ${error}`);
    }
  }

  async getWorkspaceInfo(): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  }> {
    try {
      let totalFiles = 0;
      let totalSize = 0;
      const fileTypes: Record<string, number> = {};
      
      const walk = async (currentPath: string) => {
        const items = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const item of items) {
          const itemPath = path.join(currentPath, item.name);
          
          if (item.isDirectory()) {
            await walk(itemPath);
          } else {
            totalFiles++;
            const stats = await fs.stat(itemPath);
            totalSize += stats.size;
            
            const ext = path.extname(item.name).toLowerCase();
            fileTypes[ext] = (fileTypes[ext] || 0) + 1;
          }
        }
      };
      
      await walk(this.workspacePath);
      
      return {
        totalFiles,
        totalSize,
        fileTypes,
      };
    } catch (error) {
      throw new Error(`Failed to get workspace info: ${error}`);
    }
  }
}

export const fileSystemService = new FileSystemService();