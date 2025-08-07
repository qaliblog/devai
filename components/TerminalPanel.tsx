'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Square, Trash2, Copy, Download, Upload, Settings, Folder } from 'lucide-react';

interface TerminalOutput {
  type: 'stdout' | 'stderr' | 'exit';
  data: string;
  timestamp: number;
}

interface Process {
  id: string;
  command: string;
  status: 'running' | 'completed' | 'failed';
  output: TerminalOutput[];
}

interface TerminalPanelProps {
  className?: string;
  workspaceId?: string;
}

export default function TerminalPanel({ workspaceId }: TerminalPanelProps) {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load command history from localStorage
    const saved = localStorage.getItem('terminal-history');
    if (saved) {
      setCommandHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Save command history to localStorage
    localStorage.setItem('terminal-history', JSON.stringify(commandHistory));
  }, [commandHistory]);

  useEffect(() => {
    // Scroll to bottom when new output is added
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [processes]);

  useEffect(() => {
    // Load current directory when workspace changes
    loadCurrentDirectory();
    // Clear processes when workspace changes to avoid confusion
    setProcesses([]);
  }, [workspaceId]);

  const loadCurrentDirectory = async () => {
    try {
      const response = await fetch(`/api/terminal?action=current-directory&workspaceId=${workspaceId || 'default'}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        setCurrentDirectory(data.directory);
      }
    } catch (error) {
      console.error('Failed to load current directory:', error);
    }
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsExecuting(true);
    const processId = Date.now().toString();
    
    const newProcess: Process = {
      id: processId,
      command,
      status: 'running',
      output: [],
    };

    setProcesses(prev => [...prev, newProcess]);
    setCommandHistory(prev => [command, ...prev.slice(0, 99)]); // Keep last 100 commands
    setCurrentCommand('');

    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          command,
          workspaceId,
        }),
      });
      const data = await response.json();
      if (data.success && data.result) {
        const result = data.result;
        
        // Add output to process
        setProcesses(prev => prev.map(p => 
          p.id === processId 
            ? {
                ...p,
                status: result.success ? 'completed' : 'failed',
                output: [
                  ...p.output,
                  { type: 'stdout', data: result.stdout, timestamp: Date.now() },
                  ...(result.stderr ? [{ type: 'stderr', data: result.stderr, timestamp: Date.now() }] : []),
                  { type: 'exit', data: `Process exited with code ${result.exitCode}`, timestamp: Date.now() },
                ],
              }
            : p
        ));
      } else {
        const errorMsg = data.error || data.result?.stderr || 'Command failed';
        setProcesses(prev => prev.map(p =>
          p.id === processId
            ? {
                ...p,
                status: 'failed',
                output: [
                  ...p.output,
                  { type: 'stderr', data: errorMsg, timestamp: Date.now() },
                  { type: 'stderr', data: 'Tip: Try "la" for ls -la, or check if the command exists', timestamp: Date.now() },
                ],
              }
            : p
        ));
      }
    } catch (error: any) {
      console.error('Terminal execution error:', error);
      setProcesses(prev => prev.map(p => 
        p.id === processId 
          ? {
              ...p,
              status: 'failed',
              output: [
                ...p.output,
                { type: 'stderr', data: `Network/API Error: ${error.message || error}`, timestamp: Date.now() },
                { type: 'stderr', data: 'Check if the development server is running', timestamp: Date.now() },
              ],
            }
          : p
      ));
    } finally {
      setIsExecuting(false);
      loadCurrentDirectory();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(currentCommand);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    }
  };

  const killProcess = async (processId: string) => {
    try {
      await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'kill-process',
          processId,
        }),
      });

      setProcesses(prev => prev.map(p => 
        p.id === processId 
          ? { ...p, status: 'failed' }
          : p
      ));
    } catch (error) {
      console.error('Failed to kill process:', error);
    }
  };

  const clearOutput = () => {
    setProcesses([]);
  };

  const copyOutput = () => {
    const output = processes
      .map(p => `$ ${p.command}\n${p.output.map(o => o.data).join('\n')}`)
      .join('\n\n');
    navigator.clipboard.writeText(output);
  };

  const getOutputClass = (type: string) => {
    switch (type) {
      case 'stdout':
        return 'text-foreground';
      case 'stderr':
        return 'text-destructive';
      case 'exit':
        return 'text-muted-foreground';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-card flex-shrink-0 terminal-toolbar">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-semibold">Terminal</h2>
          {currentDirectory && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Folder className="h-3 w-3" />
              <span className="hidden sm:inline">{currentDirectory}</span>
              <span className="sm:hidden">{currentDirectory.split('/').pop() || currentDirectory}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={clearOutput}
            className="mobile-button p-2 hover:bg-accent rounded"
            title="Clear Output"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          
          <button
            onClick={copyOutput}
            className="mobile-button p-2 hover:bg-accent rounded"
            title="Copy Output"
          >
            <Copy className="h-4 w-4" />
          </button>
          
          <button className="p-2 hover:bg-accent rounded hidden sm:block" title="Download Output">
            <Download className="h-4 w-4" />
          </button>
          
          <button className="p-2 hover:bg-accent rounded hidden sm:block" title="Upload Script">
            <Upload className="h-4 w-4" />
          </button>
          
          <button className="p-2 hover:bg-accent rounded hidden sm:block" title="Settings">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Output */}
      <div 
        ref={outputRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-background min-h-0"
      >
        {processes.map((process) => (
          <div key={process.id} className="mb-4 terminal-process">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-primary font-semibold terminal-command">$ {process.command}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  process.status === 'running' ? 'bg-yellow-500/20 text-yellow-600' :
                  process.status === 'completed' ? 'bg-green-500/20 text-green-600' :
                  'bg-red-500/20 text-red-600'
                }`}>
                  {process.status}
                </span>
              </div>
              
              {process.status === 'running' && (
                <button
                  onClick={() => killProcess(process.id)}
                  className="p-1 hover:bg-accent rounded"
                  title="Kill Process"
                >
                  <Square className="h-3 w-3" />
                </button>
              )}
            </div>
            
            <div className="ml-4 space-y-1">
              {process.output.map((output, index) => (
                <div
                  key={index}
                  className={`whitespace-pre-wrap terminal-output ${getOutputClass(output.type)}`}
                >
                  {output.data}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {processes.length === 0 && (
          <div className="text-muted-foreground text-center py-8">
            No commands executed yet. Start by typing a command below.
          </div>
        )}
      </div>

      {/* Command Input */}
      <div className="p-4 border-t border-border bg-card mobile-terminal-input flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <span className="text-primary font-semibold text-sm">$</span>
          <input
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command (try: la, ll, termux-info, env-info)..."
            className="flex-1 bg-transparent border-none outline-none text-foreground text-sm terminal-input"
            disabled={isExecuting}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="submit"
            disabled={isExecuting || !currentCommand.trim()}
            className="mobile-button p-2 hover:bg-accent rounded disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}