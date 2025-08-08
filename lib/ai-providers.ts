import axios from 'axios';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason?: string;
}

export interface AIProvider {
  name: string;
  generateResponse(messages: AIMessage[], options?: any): Promise<AIResponse>;
  streamResponse(messages: AIMessage[], onChunk: (chunk: string) => void, options?: any): Promise<void>;
  checkConnection(): Promise<boolean>;
  listModels(): Promise<string[]>;
}

export class OllamaProvider implements AIProvider {
  name = 'Ollama';
  private baseUrl: string;
  private defaultModel: string;

  constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = 'deepseek-coder:6.7b') {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }

  private buildPromptFromMessages(messages: AIMessage[]): string {
    return messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');
  }

  async generateResponse(messages: AIMessage[], options: any = {}): Promise<AIResponse> {
    try {
      const model = options.model || this.defaultModel;
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          num_predict: options.max_tokens || 4096,
        },
      });

      return {
        content: response.data.message.content,
        model: response.data.model,
        finish_reason: 'stop',
      };
    } catch (error: any) {
      // Fallback for older Ollama versions that lack /api/chat (404)
      if (error?.response?.status === 404) {
        try {
          const model = options.model || this.defaultModel;
          const prompt = this.buildPromptFromMessages(messages);
          const resp = await axios.post(`${this.baseUrl}/api/generate`, {
            model,
            prompt,
            stream: false,
            options: {
              temperature: options.temperature || 0.7,
              top_p: options.top_p || 0.9,
              num_predict: options.max_tokens || 4096,
            },
          });
          const content = resp.data?.response ?? '';
          return {
            content,
            model: model,
            finish_reason: 'stop',
          };
        } catch (fallbackErr) {
          throw new Error(`Ollama error (fallback generate): ${fallbackErr}`);
        }
      }
      throw new Error(`Ollama error: ${error}`);
    }
  }

  async streamResponse(messages: AIMessage[], onChunk: (chunk: string) => void, options: any = {}): Promise<void> {
    try {
      const model = options.model || this.defaultModel;
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          options: {
            temperature: options.temperature || 0.7,
            top_p: options.top_p || 0.9,
            num_predict: options.max_tokens || 4096,
          },
        }),
      });

      if (response.status === 404) {
        // Fallback to /api/generate stream
        const prompt = this.buildPromptFromMessages(messages);
        const resp = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt,
            stream: true,
            options: {
              temperature: options.temperature || 0.7,
              top_p: options.top_p || 0.9,
              num_predict: options.max_tokens || 4096,
            },
          }),
        });
        if (!resp.ok) {
          throw new Error(`HTTP error on fallback generate! status: ${resp.status}`);
        }
        const reader = resp.body?.getReader();
        if (!reader) throw new Error('No response body reader available');
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.trim() === '') continue;
            try {
              const data = JSON.parse(line);
              if (data.response) onChunk(data.response);
              if (data.done) return;
            } catch {}
          }
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              onChunk(data.message.content);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      throw new Error(`Ollama streaming error: ${error}`);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('Ollama connection failed:', error);
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models.map((model: any) => model.name);
    } catch (error) {
      return [];
    }
  }
}

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async generateResponse(messages: AIMessage[], options: any = {}): Promise<AIResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/chat/completions`, {
        model: options.model || 'gpt-4',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 4096,
        top_p: options.top_p || 1,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        content: response.data.choices[0].message.content,
        model: response.data.model,
        usage: response.data.usage,
        finish_reason: response.data.choices[0].finish_reason,
      };
    } catch (error) {
      throw new Error(`OpenAI error: ${error}`);
    }
  }

  async streamResponse(messages: AIMessage[], onChunk: (chunk: string) => void, options: any = {}): Promise<void> {
    throw new Error('Streaming not implemented for OpenAI in this example');
  }

  async checkConnection(): Promise<boolean> {
    return !!this.apiKey;
  }

  async listModels(): Promise<string[]> {
    return ['gpt-3.5-turbo', 'gpt-4'];
  }
}

export class GeminiProvider implements AIProvider {
  name = 'Gemini';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async generateResponse(messages: AIMessage[], options: any = {}): Promise<AIResponse> {
    try {
      const url = `${this.baseUrl}/models/${options.model || 'gemini-pro'}:generateContent`;
      const response = await axios.post(url, {
        contents: [
          {
            parts: messages.map((m) => ({ text: `${m.role}: ${m.content}` })),
            role: 'user',
          }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        }
      });

      return {
        content: response.data.candidates[0].content.parts[0].text,
        model: options.model || 'gemini-pro',
      };
    } catch (error) {
      throw new Error(`Gemini error: ${error}`);
    }
  }

  async streamResponse(messages: AIMessage[], onChunk: (chunk: string) => void, options: any = {}): Promise<void> {
    throw new Error('Streaming not implemented for Gemini in this example');
  }

  async checkConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/models`;
      const response = await axios.get(url, {
        headers: {
          'x-goog-api-key': this.apiKey,
        },
        params: {
          key: this.apiKey,
        },
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const url = `${this.baseUrl}/models`;
      const response = await axios.get(url, {
        headers: {
          'x-goog-api-key': this.apiKey,
        },
        params: {
          key: this.apiKey,
        },
      });
      return response.data.models
        .filter((model: any) => model.name.includes('gemini'))
        .map((model: any) => model.name);
    } catch (error) {
      return [];
    }
  }
}

export class AIProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private currentProvider: string = 'ollama';
  private fallbackProvider: string = 'mock';

  constructor() {
    // Initialize with Ollama as default (configurable via env)
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const defaultModel = process.env.OLLAMA_MODEL || 'deepseek-coder:6.7b';
    this.providers.set('ollama', new OllamaProvider(baseUrl, defaultModel));
    
    // Add mock provider as fallback
    const { mockAIProvider } = require('./mock-ai');
    this.providers.set('mock', mockAIProvider);
  }

  addProvider(name: string, provider: AIProvider): void {
    this.providers.set(name, provider);
  }

  setCurrentProvider(name: string): void {
    if (this.providers.has(name)) {
      this.currentProvider = name;
    }
  }

  getCurrentProvider(): AIProvider | undefined {
    return this.providers.get(this.currentProvider);
  }

  getCurrentProviderName(): string {
    return this.currentProvider;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async generateResponse(messages: AIMessage[], options: any = {}): Promise<AIResponse> {
    let provider = this.getCurrentProvider();
    
    // Try primary provider first
    if (provider) {
      try {
        const isConnected = await provider.checkConnection();
        if (isConnected) {
          return await provider.generateResponse(messages, options);
        }
      } catch (error) {
        console.warn('Primary provider failed, falling back to mock:', error);
      }
    }
    
    // Fall back to mock provider
    const fallbackProvider = this.providers.get(this.fallbackProvider);
    if (!fallbackProvider) {
      throw new Error('No AI provider available');
    }
    
    return await fallbackProvider.generateResponse(messages, options);
  }

  async streamResponse(messages: AIMessage[], onChunk: (chunk: string) => void, options: any = {}): Promise<void> {
    const provider = this.getCurrentProvider();
    if (!provider) {
      throw new Error('No AI provider available');
    }
    return provider.streamResponse(messages, onChunk, options);
  }

  async checkConnection(): Promise<boolean> {
    const provider = this.getCurrentProvider();
    if (!provider) {
      return false;
    }
    try {
      return await provider.checkConnection();
    } catch (error) {
      console.error('Provider connection check failed:', error);
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const provider = this.getCurrentProvider();
    if (!provider) {
      return [];
    }
    return provider.listModels();
  }

  getStatus() {
    return {
      currentProvider: this.getCurrentProviderName(),
      availableProviders: this.getAvailableProviders(),
    };
  }
}

// Global instance
export const aiProviderManager = new AIProviderManager();