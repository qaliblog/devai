'use client';

import { useState, useEffect } from 'react';
import { Folder, Server, Plus, Settings, X, Globe, Key } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  type: 'local' | 'ssh';
  path: string;
  isActive: boolean;
  lastAccessed: number;
}

interface SSHConnection {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

interface WorkspaceSelectorProps {
  onWorkspaceChange: (workspaceId: string) => void;
  className?: string;
}

export default function WorkspaceSelector({ onWorkspaceChange, className = '' }: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formType, setFormType] = useState<'local' | 'ssh'>('local');
  const [loading, setLoading] = useState(false);

  // Form states
  const [localName, setLocalName] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [sshName, setSshName] = useState('');
  const [sshHost, setSshHost] = useState('');
  const [sshPort, setSshPort] = useState('22');
  const [sshUsername, setSshUsername] = useState('');
  const [sshPassword, setSshPassword] = useState('');
  const [sshPrivateKey, setSshPrivateKey] = useState('');
  const [usePrivateKey, setUsePrivateKey] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspace?action=list');
      const data = await response.json();
      if (data.success) {
        setWorkspaces(data.workspaces);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const loadActiveWorkspace = async () => {
    try {
      const response = await fetch('/api/workspace?action=active');
      const data = await response.json();
      if (data.success && data.workspace) {
        setActiveWorkspace(data.workspace);
      }
    } catch (error) {
      console.error('Failed to load active workspace:', error);
    }
  };

  useEffect(() => {
    loadActiveWorkspace();
  }, [workspaces]);

  const handleWorkspaceSelect = async (workspaceId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-active',
          workspaceId,
        }),
      });

      if (response.ok) {
        await loadWorkspaces();
        onWorkspaceChange(workspaceId);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocalWorkspace = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-local',
          name: localName,
          path: localPath,
        }),
      });

      if (response.ok) {
        await loadWorkspaces();
        setShowAddForm(false);
        setLocalName('');
        setLocalPath('');
      }
    } catch (error) {
      console.error('Failed to add local workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSSHWorkspace = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-ssh',
          name: sshName,
          host: sshHost,
          port: parseInt(sshPort),
          username: sshUsername,
          password: usePrivateKey ? undefined : sshPassword,
          privateKey: usePrivateKey ? sshPrivateKey : undefined,
        }),
      });

      if (response.ok) {
        await loadWorkspaces();
        setShowAddForm(false);
        setSshName('');
        setSshHost('');
        setSshPort('22');
        setSshUsername('');
        setSshPassword('');
        setSshPrivateKey('');
      }
    } catch (error) {
      console.error('Failed to add SSH workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkspaceIcon = (type: 'local' | 'ssh') => {
    return type === 'local' ? <Folder className="h-4 w-4" /> : <Server className="h-4 w-4" />;
  };

  const getWorkspaceStatus = (workspace: Workspace) => {
    if (workspace.isActive) {
      return <span className="text-green-500 text-xs">Active</span>;
    }
    return <span className="text-gray-500 text-xs">Inactive</span>;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Workspace Selector Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-3 py-2 bg-card border border-border rounded-md hover:bg-accent transition-colors"
      >
        {activeWorkspace ? (
          <>
            {getWorkspaceIcon(activeWorkspace.type)}
            <span className="hidden sm:inline text-sm font-medium">
              {activeWorkspace.name}
            </span>
            <span className="sm:hidden text-sm font-medium">
              {activeWorkspace.name.length > 10 
                ? activeWorkspace.name.substring(0, 10) + '...' 
                : activeWorkspace.name}
            </span>
          </>
        ) : (
          <>
            <Folder className="h-4 w-4" />
            <span className="text-sm font-medium">Select Workspace</span>
          </>
        )}
        <Settings className="h-3 w-3" />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {/* Workspace List */}
            <div className="space-y-1">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleWorkspaceSelect(workspace.id)}
                  disabled={loading}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors ${
                    workspace.isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {getWorkspaceIcon(workspace.type)}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{workspace.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {workspace.path}
                      </span>
                    </div>
                  </div>
                  {getWorkspaceStatus(workspace)}
                </button>
              ))}
            </div>

            {/* Add Workspace Button */}
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center space-x-2 p-2 mt-2 rounded-md hover:bg-accent transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Add Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Workspace Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Workspace</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 hover:bg-accent rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Type Selector */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setFormType('local')}
                className={`flex-1 flex items-center justify-center space-x-2 p-2 rounded-md transition-colors ${
                  formType === 'local'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent hover:bg-accent/80'
                }`}
              >
                <Folder className="h-4 w-4" />
                <span className="text-sm">Local</span>
              </button>
              <button
                onClick={() => setFormType('ssh')}
                className={`flex-1 flex items-center justify-center space-x-2 p-2 rounded-md transition-colors ${
                  formType === 'ssh'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent hover:bg-accent/80'
                }`}
              >
                <Server className="h-4 w-4" />
                <span className="text-sm">SSH</span>
              </button>
            </div>

            {/* Local Workspace Form */}
            {formType === 'local' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    placeholder="My Local Project"
                    className="w-full p-2 border border-border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Path</label>
                  <input
                    type="text"
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    placeholder="/path/to/project"
                    className="w-full p-2 border border-border rounded-md bg-background"
                  />
                </div>
                <button
                  onClick={handleAddLocalWorkspace}
                  disabled={loading || !localName || !localPath}
                  className="w-full p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Local Workspace'}
                </button>
              </div>
            )}

            {/* SSH Workspace Form */}
            {formType === 'ssh' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={sshName}
                    onChange={(e) => setSshName(e.target.value)}
                    placeholder="Remote Server"
                    className="w-full p-2 border border-border rounded-md bg-background"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Host</label>
                    <input
                      type="text"
                      value={sshHost}
                      onChange={(e) => setSshHost(e.target.value)}
                      placeholder="192.168.1.100"
                      className="w-full p-2 border border-border rounded-md bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Port</label>
                    <input
                      type="number"
                      value={sshPort}
                      onChange={(e) => setSshPort(e.target.value)}
                      placeholder="22"
                      className="w-full p-2 border border-border rounded-md bg-background"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username</label>
                  <input
                    type="text"
                    value={sshUsername}
                    onChange={(e) => setSshUsername(e.target.value)}
                    placeholder="user"
                    className="w-full p-2 border border-border rounded-md bg-background"
                  />
                </div>

                {/* Authentication Method */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setUsePrivateKey(false)}
                    className={`flex-1 flex items-center justify-center space-x-2 p-2 rounded-md transition-colors ${
                      !usePrivateKey
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent hover:bg-accent/80'
                    }`}
                  >
                    <Key className="h-4 w-4" />
                    <span className="text-sm">Password</span>
                  </button>
                  <button
                    onClick={() => setUsePrivateKey(true)}
                    className={`flex-1 flex items-center justify-center space-x-2 p-2 rounded-md transition-colors ${
                      usePrivateKey
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent hover:bg-accent/80'
                    }`}
                  >
                    <Key className="h-4 w-4" />
                    <span className="text-sm">Private Key</span>
                  </button>
                </div>

                {!usePrivateKey ? (
                  <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input
                      type="password"
                      value={sshPassword}
                      onChange={(e) => setSshPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full p-2 border border-border rounded-md bg-background"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">Private Key</label>
                    <textarea
                      value={sshPrivateKey}
                      onChange={(e) => setSshPrivateKey(e.target.value)}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                      rows={4}
                      className="w-full p-2 border border-border rounded-md bg-background resize-none"
                    />
                  </div>
                )}

                <button
                  onClick={handleAddSSHWorkspace}
                  disabled={loading || !sshName || !sshHost || !sshUsername || (!usePrivateKey && !sshPassword) || (usePrivateKey && !sshPrivateKey)}
                  className="w-full p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add SSH Workspace'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay for mobile */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}