'use client';

import { useState, useEffect } from 'react';
import { Folder, File, FileText, Code, Image, Archive, Trash2, Edit, Copy, Download, Upload, Plus, ArrowUp } from 'lucide-react';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
}

interface FileExplorerProps {
  workspaceId?: string;
  onOpenFile?: (filePath: string) => void;
}

export default function FileExplorer({ workspaceId, onOpenFile }: FileExplorerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('.');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const loadFiles = async (path: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/files?action=list&path=${encodeURIComponent(path)}&workspaceId=${workspaceId || 'default'}`);
      const data = await response.json();
      
      if (data.success) {
        const fileItems: FileItem[] = data.files.map((file: string) => ({
          name: file.endsWith('/') ? file.slice(0, -1) : file,
          path: file,
          isDirectory: file.endsWith('/'),
        }));
        
        // Sort directories first, then files
        fileItems.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        
        setFiles(fileItems);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.isDirectory) {
      setCurrentPath(file.path);
      setSelectedFile(null);
    } else {
      setSelectedFile(file.path);
    }
  };

  const handleDoubleClick = (file: FileItem) => {
    if (file.isDirectory) {
      setCurrentPath(file.path);
    } else {
      // Open file in editor
      window.open(`/api/files?action=read&path=${encodeURIComponent(file.path)}`);
    }
  };

  const navigateUp = () => {
    if (currentPath === '.') return;
    
    const pathParts = currentPath.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      pathParts.pop();
      const newPath = pathParts.length > 0 ? pathParts.join('/') : '.';
      setCurrentPath(newPath);
    } else if (currentPath !== '.') {
      setCurrentPath('.');
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.isDirectory) {
      return <Folder className="h-4 w-4 text-blue-500" />;
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'html':
      case 'css':
      case 'json':
      case 'md':
        return <Code className="h-4 w-4 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return <Image className="h-4 w-4 text-purple-500" />;
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
        return <Archive className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const deleteFile = async (path: string) => {
    if (!confirm(`Are you sure you want to delete "${path}"?`)) return;
    
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          path,
        }),
      });
      
      if (response.ok) {
        loadFiles(currentPath);
        if (selectedFile === path) {
          setSelectedFile(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const createFolder = async () => {
    const name = prompt('Enter folder name:');
    if (!name) return;
    
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-directory',
          path: `${currentPath}/${name}`,
        }),
      });
      
      if (response.ok) {
        loadFiles(currentPath);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={navigateUp}
          className="mobile-button flex items-center space-x-1 px-2 py-1 rounded hover:bg-accent"
          disabled={currentPath === '.'}
          title="Go up one directory"
        >
          <ArrowUp className="h-4 w-4" />
          <span className="text-xs">Up</span>
        </button>
        <span className="text-xs text-muted-foreground">{currentPath}</span>
      </div>
      
      <div className="flex items-center justify-between p-2 border-b border-border bg-card">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-semibold">Files</h2>
          <span className="text-xs text-muted-foreground">{currentPath}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={navigateUp}
            disabled={currentPath === '.'}
            className="p-2 hover:bg-accent rounded disabled:opacity-50"
            title="Go Up"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          
          <button
            onClick={createFolder}
            className="p-2 hover:bg-accent rounded"
            title="New Folder"
          >
            <Plus className="h-4 w-4" />
          </button>
          
          <button className="p-2 hover:bg-accent rounded" title="Upload">
            <Upload className="h-4 w-4" />
          </button>
          
          <button className="p-2 hover:bg-accent rounded" title="Download">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border bg-card">
        <input
          type="text"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-1 text-sm border border-border rounded bg-background"
        />
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="p-2">
            {filteredFiles.map((file) => (
              <div
                key={file.path}
                onClick={() => handleFileClick(file)}
                onDoubleClick={() => handleDoubleClick(file)}
                className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-accent ${
                  selectedFile === file.path ? 'bg-primary/10 border border-primary' : ''
                }`}
              >
                {getFileIcon(file)}
                <span className="flex-1 text-sm truncate">{file.name}</span>
                
                {selectedFile === file.path && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!file.isDirectory) {
                          onOpenFile?.(file.path);
                        }
                      }}
                      className="p-1 hover:bg-accent rounded"
                      title="Edit"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Copy path
                        navigator.clipboard.writeText(file.path);
                      }}
                      className="p-1 hover:bg-accent rounded"
                      title="Copy Path"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile(file.path);
                      }}
                      className="p-1 hover:bg-accent rounded text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            {filteredFiles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No files match your search.' : 'No files in this directory.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border bg-card">
        <span>{filteredFiles.length} items</span>
        <span>{selectedFile ? `Selected: ${selectedFile}` : 'No selection'}</span>
      </div>
    </div>
  );
}