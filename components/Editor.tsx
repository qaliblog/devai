'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, FileDown, FileUp, Settings, Search, Replace } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

interface EditorProps {
  workspaceId?: string;
  fileToOpen?: string | null;
  onFileOpened?: () => void;
}

export default function Editor({ workspaceId, fileToOpen, onFileOpened }: EditorProps) {
  const [code, setCode] = useState('// Welcome to DevAI\n// Start coding here...');
  const [language, setLanguage] = useState('javascript');
  const [theme, setTheme] = useState('vs-dark');
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (fileToOpen) {
      openFileByPath(fileToOpen);
      onFileOpened?.();
    }
  }, [fileToOpen, onFileOpened]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      setIsDirty(true);
    }
  };

  const handleSave = async () => {
    if (!currentFile) {
      // Prompt for filename
      const filename = prompt('Enter filename:');
      if (!filename) return;
      setCurrentFile(filename);
    }

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'write',
          path: currentFile,
          content: code,
          workspaceId,
        }),
      });

      if (response.ok) {
        setIsDirty(false);
        console.log('File saved successfully');
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const openFileByPath = async (filename: string) => {
    try {
      const response = await fetch(`/api/files?action=read&path=${encodeURIComponent(filename)}&workspaceId=${workspaceId || 'default'}`);
      const data = await response.json();
      
      if (data.success) {
        setCode(data.content);
        setCurrentFile(filename);
        setIsDirty(false);
        
        // Detect language from file extension
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext) {
          const languageMap: Record<string, string> = {
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
          };
          setLanguage(languageMap[ext] || 'plaintext');
        }
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const handleOpenFile = async () => {
    // In a real app, you'd use a file picker
    const filename = prompt('Enter filename to open:');
    if (!filename) return;
    
    await openFileByPath(filename);
  };

  const languages = [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
    'html', 'css', 'json', 'markdown', 'plaintext'
  ];

  const themes = ['vs-dark', 'vs-light', 'hc-black'];

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-card">
        <div className="flex items-center space-x-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-2 py-1 text-sm border border-border rounded bg-background"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>
          
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="px-2 py-1 text-sm border border-border rounded bg-background"
          >
            {themes.map((t) => (
              <option key={t} value={t}>
                {t === 'vs-dark' ? 'Dark' : t === 'vs-light' ? 'Light' : 'High Contrast'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenFile}
            className="p-2 hover:bg-accent rounded"
            title="Open File"
          >
            <FileUp className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleSave}
            className={`p-2 hover:bg-accent rounded ${isDirty ? 'text-primary' : ''}`}
            title="Save (Ctrl+S)"
          >
            <Save className="h-4 w-4" />
          </button>
          
          <button className="p-2 hover:bg-accent rounded" title="Search">
            <Search className="h-4 w-4" />
          </button>
          
          <button className="p-2 hover:bg-accent rounded" title="Replace">
            <Replace className="h-4 w-4" />
          </button>
          
          <button className="p-2 hover:bg-accent rounded" title="Settings">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <MonacoEditor
          height="100%"
          language={language}
          theme={theme}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            parameterHints: { enabled: true },
            autoIndent: 'full',
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border bg-card">
        <div className="flex items-center space-x-4">
          <span>{currentFile || 'Untitled'}</span>
          {isDirty && <span className="text-primary">● Modified</span>}
        </div>
        
        <div className="flex items-center space-x-4">
          <span>Ln 1, Col 1</span>
          <span>{language.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}