'use client';

import { useState, useEffect } from 'react';
import { Code, Terminal, FileText, Brain, Play, Square, Settings, Activity, Menu } from 'lucide-react';
import Editor from '@/components/Editor';
import TerminalPanel from '@/components/TerminalPanel';
import FileExplorer from '@/components/FileExplorer';
import AgentPanel from '@/components/AgentPanel';
import StatusBar from '@/components/StatusBar';
import AISettings from '@/components/AISettings';
import WorkspaceSelector from '@/components/WorkspaceSelector';

export default function Home() {
  const [activeTab, setActiveTab] = useState('editor');
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [agentStatus, setAgentStatus] = useState('disconnected');
  const [showAISettings, setShowAISettings] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('default');

  useEffect(() => {
    // Initialize agent connection
    const initializeAgent = async () => {
      try {
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'initialize' }),
        });
        
        if (response.ok) {
          setAgentStatus('connected');
        }
      } catch (error) {
        console.error('Failed to initialize agent:', error);
        setAgentStatus('error');
      }
    };

    initializeAgent();
  }, []);

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
      }
    } catch (error) {
      console.error('Failed to toggle auto mode:', error);
    }
  };

  const handleWorkspaceChange = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
  };

  const tabs = [
    { id: 'editor', label: 'Editor', icon: Code },
    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'agent', label: 'Agent', icon: Brain },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-background mobile-layout">
      {/* Header */}
      <header className="mobile-header flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="sm:hidden mobile-button p-2 rounded-md hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">DevAI</h1>
          </div>
          <WorkspaceSelector onWorkspaceChange={handleWorkspaceChange} />
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              agentStatus === 'connected' ? 'bg-green-500' : 
              agentStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <span className="text-sm text-muted-foreground">
              {agentStatus === 'connected' ? 'Connected' : 
               agentStatus === 'error' ? 'Error' : 'Connecting...'}
            </span>
          </div>

          <button
            onClick={handleAutoModeToggle}
            className={`mobile-button flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isAutoMode
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isAutoMode ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="hidden sm:inline">{isAutoMode ? 'Stop Auto' : 'Start Auto'}</span>
          </button>
          
          <button 
            onClick={() => setShowAISettings(true)}
            className="mobile-button p-2 rounded-md hover:bg-accent"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex mobile-content">
        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <div
            className="mobile-overlay sm:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`mobile-sidebar ${showMobileSidebar ? 'open' : ''} w-64 border-r border-border bg-card mobile-hidden sm:block`}>
          <div className="p-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4">NAVIGATION</h2>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowMobileSidebar(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col mobile-main">
          {/* Mobile Tab Navigation */}
          <div className="sm:hidden">
            <div className="flex overflow-x-auto mobile-tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`mobile-tab flex items-center justify-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden mobile-panel">
            {activeTab === 'editor' && <Editor workspaceId={activeWorkspaceId} />}
            {activeTab === 'terminal' && <TerminalPanel workspaceId={activeWorkspaceId} />}
            {activeTab === 'files' && <FileExplorer workspaceId={activeWorkspaceId} />}
            {activeTab === 'agent' && <AgentPanel workspaceId={activeWorkspaceId} />}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar isAutoMode={isAutoMode} agentStatus={agentStatus} />

      {/* AI Settings Modal */}
      <AISettings 
        isOpen={showAISettings} 
        onClose={() => setShowAISettings(false)} 
      />
    </div>
  );
}