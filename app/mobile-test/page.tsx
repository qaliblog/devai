'use client';

import { useState } from 'react';
import { Menu, Code, Terminal, Folder, Bot, Settings } from 'lucide-react';

export default function MobileTestPage() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  const tabs = [
    { id: 'editor', label: 'Editor', icon: Code },
    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'files', label: 'Files', icon: Folder },
    { id: 'agent', label: 'Agent', icon: Bot },
  ];

  return (
    <div className="h-screen flex flex-col bg-background mobile-layout">
      {/* Header */}
      <header className="mobile-header flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="sm:hidden p-2 rounded-md hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">DevAI Mobile Test</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-md hover:bg-accent">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex mobile-content">
        {/* Mobile Sidebar Overlay */}
        {showSidebar && (
          <div
            className="mobile-overlay sm:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`mobile-sidebar ${showSidebar ? 'open' : ''} w-64 border-r border-border bg-card mobile-hidden sm:block`}>
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
                      setShowSidebar(false);
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
          <div className="flex-1 overflow-hidden mobile-panel p-4">
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Mobile Test Page</h2>
                <p className="text-muted-foreground mb-4">
                  Active Tab: <span className="font-semibold">{activeTab}</span>
                </p>
                <div className="space-y-2 text-sm">
                  <p>✅ Responsive header with hamburger menu</p>
                  <p>✅ Mobile tab navigation</p>
                  <p>✅ Collapsible sidebar</p>
                  <p>✅ Touch-friendly buttons</p>
                  <p>✅ Proper mobile layout</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}