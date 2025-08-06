'use client';

import { useState, useEffect } from 'react';
import { Activity, Wifi, Battery, Settings } from 'lucide-react';

interface StatusBarProps {
  isAutoMode: boolean;
  agentStatus: string;
}

export default function StatusBar({ isAutoMode, agentStatus }: StatusBarProps) {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [aiProviderStatus, setAiProviderStatus] = useState<string>('checking');
  const [currentProvider, setCurrentProvider] = useState<string>('ollama');

  useEffect(() => {
    loadSystemInfo();
    checkAIProviderStatus();
    
    const interval = setInterval(() => {
      checkAIProviderStatus();
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadSystemInfo = async () => {
    try {
      const response = await fetch('/api/terminal?action=system-info');
      const data = await response.json();
      if (data.success) {
        setSystemInfo(data.systemInfo);
      }
    } catch (error) {
      console.error('Failed to load system info:', error);
    }
  };

  const checkAIProviderStatus = async () => {
    try {
      const response = await fetch('/api/ai-providers?action=status');
      const data = await response.json();
      setAiProviderStatus(data.connected ? 'connected' : 'disconnected');
      setCurrentProvider(data.provider);
    } catch (error) {
      setAiProviderStatus('error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-500';
      case 'disconnected':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="status-bar flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border bg-card">
      <div className="flex items-center space-x-4">
        {/* Agent Status */}
        <div className="flex items-center space-x-1">
          <Activity className="h-3 w-3" />
          <span>Agent:</span>
          <span className={getStatusColor(agentStatus)}>
            {agentStatus === 'connected' ? 'Connected' : 
             agentStatus === 'error' ? 'Error' : 'Connecting...'}
          </span>
        </div>

        {/* Auto Mode */}
        {isAutoMode && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Auto Mode</span>
          </div>
        )}

        {/* AI Provider Status */}
        <div className="flex items-center space-x-1">
          <Wifi className="h-3 w-3" />
          <span>{currentProvider}:</span>
          <span className={getStatusColor(aiProviderStatus)}>
            {aiProviderStatus === 'connected' ? 'Connected' : 
             aiProviderStatus === 'disconnected' ? 'Disconnected' : 'Error'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* System Info */}
        {systemInfo && (
          <>
            <span>{systemInfo.platform}</span>
            <span>{systemInfo.arch}</span>
            <span>Node {systemInfo.nodeVersion}</span>
          </>
        )}

        {/* Settings */}
        <button className="p-1 hover:bg-accent rounded">
          <Settings className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}