'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, CheckCircle, XCircle, RefreshCw, Key, Globe } from 'lucide-react';

interface AIProvider {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AISettings({ isOpen, onClose }: AISettingsProps) {
  const [providers, setProviders] = useState<string[]>([]);
  const [currentProvider, setCurrentProvider] = useState<string>('ollama');
  const [isConnected, setIsConnected] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState<AIProvider>({
    name: '',
    apiKey: '',
    baseUrl: '',
    model: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/ai-providers?action=list');
      const data = await response.json();
      setProviders(data.providers);
      setCurrentProvider(data.currentProvider);
      
      // Check connection status
      const statusResponse = await fetch('/api/ai-providers?action=status');
      const statusData = await statusResponse.json();
      setIsConnected(statusData.connected);
      
      // Load models
      const modelsResponse = await fetch('/api/ai-providers?action=models');
      const modelsData = await modelsResponse.json();
      setModels(modelsData.models);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const switchProvider = async (provider: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'switch',
          provider,
        }),
      });
      
      if (response.ok) {
        setCurrentProvider(provider);
        await loadProviders();
      }
    } catch (error) {
      console.error('Failed to switch provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-connection',
        }),
      });
      
      const data = await response.json();
      setIsConnected(data.connected);
    } catch (error) {
      console.error('Failed to test connection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const addProvider = async () => {
    setLoading(true);
    try {
      const action = `add-${newProvider.name.toLowerCase()}`;
      const response = await fetch('/api/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          apiKey: newProvider.apiKey,
          baseUrl: newProvider.baseUrl,
          model: newProvider.model,
        }),
      });
      
      if (response.ok) {
        setShowAddForm(false);
        setNewProvider({ name: '', apiKey: '', baseUrl: '', model: '' });
        await loadProviders();
      }
    } catch (error) {
      console.error('Failed to add provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return <Key className="h-4 w-4 text-green-500" />;
      case 'gemini':
        return <Globe className="h-4 w-4 text-blue-500" />;
      case 'ollama':
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      case 'gemini':
        return 'Google Gemini';
      case 'ollama':
        return 'Ollama';
      default:
        return provider;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">AI Provider Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Current Provider Status */}
        <div className="mb-6 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Current Provider</h3>
            <div className="flex items-center space-x-2">
              {getProviderIcon(currentProvider)}
              <span className="font-medium">{getProviderName(currentProvider)}</span>
              {isConnected ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={testConnection}
              disabled={loading}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Connection'}
            </button>
            
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Available Models */}
        {models.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">Available Models</h3>
            <div className="grid grid-cols-2 gap-2">
              {models.map((model) => (
                <div
                  key={model}
                  className="p-2 bg-muted rounded text-sm font-mono"
                >
                  {model}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Provider List */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Available Providers</h3>
          <div className="space-y-2">
            {providers.map((provider) => (
              <div
                key={provider}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  currentProvider === provider
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card border-border hover:bg-accent'
                }`}
                onClick={() => switchProvider(provider)}
              >
                <div className="flex items-center space-x-2">
                  {getProviderIcon(provider)}
                  <span>{getProviderName(provider)}</span>
                </div>
                
                {currentProvider === provider && (
                  <CheckCircle className="h-4 w-4 text-primary" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add New Provider */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Add New Provider</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-2 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              <Plus className="h-4 w-4" />
              <span>Add Provider</span>
            </button>
          </div>

          {showAddForm && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-1">Provider</label>
                <select
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded bg-background"
                >
                  <option value="">Select Provider</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>

              {newProvider.name === 'openai' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={newProvider.apiKey}
                      onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 border border-border rounded bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Base URL (Optional)</label>
                    <input
                      type="text"
                      value={newProvider.baseUrl}
                      onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                      className="w-full px-3 py-2 border border-border rounded bg-background"
                    />
                  </div>
                </>
              )}

              {newProvider.name === 'gemini' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={newProvider.apiKey}
                      onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                      placeholder="AIza..."
                      className="w-full px-3 py-2 border border-border rounded bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Base URL (Optional)</label>
                    <input
                      type="text"
                      value={newProvider.baseUrl}
                      onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                      placeholder="https://generativelanguage.googleapis.com/v1beta"
                      className="w-full px-3 py-2 border border-border rounded bg-background"
                    />
                  </div>
                </>
              )}

              {newProvider.name === 'ollama' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Base URL</label>
                    <input
                      type="text"
                      value={newProvider.baseUrl}
                      onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="w-full px-3 py-2 border border-border rounded bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Default Model</label>
                    <input
                      type="text"
                      value={newProvider.model}
                      onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })}
                      placeholder="deepseek-coder"
                      className="w-full px-3 py-2 border border-border rounded bg-background"
                    />
                  </div>
                </>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={addProvider}
                  disabled={loading || !newProvider.name}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Provider'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}