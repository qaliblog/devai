'use client';

import { useState } from 'react';
import { Menu, Code, Terminal, Folder, Bot, Settings, Plus, X } from 'lucide-react';

export default function MobileTestPage() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

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
            className="sm:hidden mobile-button p-2 rounded-md hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">DevAI Mobile Test</h1>
          </div>
          
          {/* Test Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="mobile-button p-2 rounded-md hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
            </button>
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 mobile-dropdown z-50 min-w-48">
                <div className="p-2">
                  <div className="p-2 hover:bg-accent rounded cursor-pointer">Option 1</div>
                  <div className="p-2 hover:bg-accent rounded cursor-pointer">Option 2</div>
                  <div className="p-2 hover:bg-accent rounded cursor-pointer">Option 3</div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowModal(true)}
            className="mobile-button p-2 rounded-md hover:bg-accent"
          >
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
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-bold mb-4">Mobile Test Page</h2>
                <p className="text-muted-foreground mb-4">
                  Active Tab: <span className="font-semibold">{activeTab}</span>
                </p>
                
                <div className="space-y-4 text-left">
                  <div className="p-4 bg-card rounded-lg border">
                    <h3 className="font-semibold mb-2">Mobile Features Tested:</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Responsive header with hamburger menu</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Mobile tab navigation</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Collapsible sidebar with overlay</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Touch-friendly buttons (44px minimum)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Proper mobile layout and spacing</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Modal and dropdown backgrounds</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowModal(true)}
                      className="mobile-button flex-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                      Test Modal
                    </button>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="mobile-button flex-1 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                    >
                      Test Dropdown
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="mobile-modal p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Test Modal</h3>
              <button
                onClick={() => setShowModal(false)}
                className="mobile-button p-1 hover:bg-accent rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-muted-foreground mb-4">
              This modal has a proper background and is mobile-friendly.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Test input"
                className="mobile-input w-full border border-border rounded-md bg-background"
              />
              <button
                onClick={() => setShowModal(false)}
                className="mobile-button w-full bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Close Modal
              </button>
            </div>
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