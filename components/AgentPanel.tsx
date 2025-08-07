'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, Play, Square, Clock, CheckCircle, XCircle, AlertCircle, Activity, Settings } from 'lucide-react';

interface AgentTask {
  id: string;
  type: 'code' | 'command' | 'file' | 'analysis';
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: number;
}

interface AgentState {
  isRunning: boolean;
  currentTask?: AgentTask;
  taskHistory: AgentTask[];
  workspaceInfo: any;
  systemInfo: any;
}

interface AgentPanelProps {
  workspaceId?: string;
}

export default function AgentPanel({ workspaceId }: AgentPanelProps) {
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState<'code' | 'command' | 'file' | 'analysis'>('code');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgentState();
    const interval = setInterval(loadAgentState, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when new tasks are added
  useEffect(() => {
    if (agentState && scrollContainerRef.current) {
      const scrollContainer = scrollContainerRef.current;
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
    }
  }, [agentState?.taskHistory.length, agentState?.taskHistory]);

  const loadAgentState = async () => {
    try {
      const response = await fetch('/api/agent');
      const data = await response.json();
      setAgentState(data);
      setIsAutoMode(data.isRunning);
    } catch (error) {
      console.error('Failed to load agent state:', error);
    }
  };

  const handleAutoModeToggle = async () => {
    try {
      const action = isAutoMode ? 'stop-auto-mode' : 'start-auto-mode';
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      if (response.ok) {
        setIsAutoMode(!isAutoMode);
        loadAgentState();
      }
    } catch (error) {
      console.error('Failed to toggle auto mode:', error);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-task',
          type: selectedTaskType,
          description: newTask,
          workspaceId,
        }),
      });
      
      if (response.ok) {
        setNewTask('');
        loadAgentState();
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'code':
        return <Brain className="h-4 w-4 text-blue-500" />;
      case 'command':
        return <Play className="h-4 w-4 text-green-500" />;
      case 'file':
        return <AlertCircle className="h-4 w-4 text-purple-500" />;
      case 'analysis':
        return <Activity className="h-4 w-4 text-orange-500" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'code':
        return 'Code Generation';
      case 'command':
        return 'Command Execution';
      case 'file':
        return 'File Operation';
      case 'analysis':
        return 'Code Analysis';
      default:
        return type;
    }
  };

  if (!agentState) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold">AI Agent</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              agentState.isRunning ? 'bg-green-500' : 'bg-gray-500'
            }`} />
            <span className="text-sm text-muted-foreground">
              {agentState.isRunning ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleAutoModeToggle}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isAutoMode
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isAutoMode ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isAutoMode ? 'Stop Auto' : 'Start Auto'}</span>
          </button>
          
          <button className="p-2 hover:bg-accent rounded">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Add Task */}
      <div className="p-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex flex-col space-y-4">
          <select
            value={selectedTaskType}
            onChange={(e) => setSelectedTaskType(e.target.value as any)}
            className="px-4 py-3 text-base border-2 border-border rounded-lg bg-background"
          >
            <option value="code">Code Generation</option>
            <option value="command">Command Execution</option>
            <option value="file">File Operation</option>
            <option value="analysis">Code Analysis</option>
          </select>
          
          <textarea
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Describe what you want the agent to do..."
            className="flex-1 px-4 py-3 text-base border-2 border-border rounded-lg bg-background resize-none mobile-input agent-chat-textarea"
            rows={4}
            style={{ minHeight: 120, maxHeight: 300, overflow: 'auto' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddTask();
              }
            }}
          />
          
          <button
            onClick={handleAddTask}
            disabled={!newTask.trim()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-base font-medium flex items-center justify-center"
          >
            <Play className="h-5 w-5 mr-2" />
            Execute Task
          </button>
        </div>
      </div>

      {/* Current Task */}
      {agentState.currentTask && (
        <div className="p-4 border-b border-border bg-card flex-shrink-0">
          <h3 className="text-sm font-semibold mb-2">Current Task</h3>
          <div className="bg-accent/50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              {getTaskIcon(agentState.currentTask.type)}
              <span className="text-sm font-medium">
                {getTaskTypeLabel(agentState.currentTask.type)}
              </span>
              {getStatusIcon(agentState.currentTask.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              {agentState.currentTask.description}
            </p>
            <div className="text-xs text-muted-foreground mt-2">
              Started at {formatTimestamp(agentState.currentTask.timestamp)}
            </div>
          </div>
        </div>
      )}

      {/* Task History */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth min-h-0">
        <div className="p-4 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Task History</h3>
            <button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                }
              }}
              className="text-xs px-2 py-1 bg-accent/50 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
              title="Scroll to bottom"
            >
              ↓ Latest
            </button>
          </div>
          
          {agentState.taskHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks yet. Add a task to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {agentState.taskHistory.slice().reverse().map((task) => (
                <div
                  key={task.id}
                  className="bg-card border border-border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getTaskIcon(task.type)}
                      <span className="text-sm font-medium">
                        {getTaskTypeLabel(task.type)}
                      </span>
                      {getStatusIcon(task.status)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(task.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-foreground mb-2">
                    {task.description}
                  </p>
                  
                  {task.error && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      Error: {task.error}
                    </div>
                  )}
                  
                  {task.result && task.status === 'completed' && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Response:</div>
                      <div className="bg-muted/50 rounded-lg p-3 text-sm max-h-[480px] overflow-y-auto">
                        {typeof task.result === 'string' ? (
                          <pre className="whitespace-pre-wrap font-sans leading-relaxed break-words">
                            {task.result}
                          </pre>
                        ) : task.result?.content ? (
                          <pre className="whitespace-pre-wrap font-sans leading-relaxed break-words">
                            {task.result.content}
                          </pre>
                        ) : task.result?.generatedCode ? (
                          <pre className="whitespace-pre-wrap font-sans leading-relaxed break-words">
                            {task.result.generatedCode}
                          </pre>
                        ) : (
                          <pre className="text-xs overflow-x-auto break-words">
                            {JSON.stringify(task.result, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border bg-card flex-shrink-0">
        <span>{agentState.taskHistory.length} total tasks</span>
        <span>
          {agentState.taskHistory.filter(t => t.status === 'completed').length} completed,
          {agentState.taskHistory.filter(t => t.status === 'failed').length} failed
        </span>
      </div>
    </div>
  );
}