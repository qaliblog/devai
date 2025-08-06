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

  constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = 'deepseek-coder') {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
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
    } catch (error) {
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
      await axios.get(`${this.baseUrl}/api/tags`);
      return true;
    } catch (error) {
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
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || 'gpt-4',
          messages,
          stream: true,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 4096,
          top_p: options.top_p || 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices[0]?.delta?.content) {
                onChunk(parsed.choices[0].delta.content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`OpenAI streaming error: ${error}`);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return response.data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => model.id);
    } catch (error) {
      return [];
    }
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
      const model = options.model || 'gemini-pro';
      const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

      // Convert messages to Gemini format
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }],
      }));

      const response = await axios.post(url, {
        contents: geminiMessages,
        generationConfig: {
          temperature: options.temperature || 0.7,
          topP: options.top_p || 1,
          maxOutputTokens: options.max_tokens || 4096,
        },
      });

      return {
        content: response.data.candidates[0].content.parts[0].text,
        model: model,
        finish_reason: 'STOP',
      };
    } catch (error) {
      throw new Error(`Gemini error: ${error}`);
    }
  }

  async streamResponse(messages: AIMessage[], onChunk: (chunk: string) => void, options: any = {}): Promise<void> {
    try {
      const model = options.model || 'gemini-pro';
      const url = `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}`;

      // Convert messages to Gemini format
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }],
      }));

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: options.temperature || 0.7,
            topP: options.top_p || 1,
            maxOutputTokens: options.max_tokens || 4096,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                onChunk(parsed.candidates[0].content.parts[0].text);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Gemini streaming error: ${error}`);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/models?key=${this.apiKey}`;
      await axios.get(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const url = `${this.baseUrl}/models?key=${this.apiKey}`;
      const response = await axios.get(url);
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

  constructor() {
    // Initialize with Ollama as default
    this.providers.set('ollama', new OllamaProvider());
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
    const provider = this.getCurrentProvider();
    if (!provider) {
      throw new Error('No AI provider available');
    }
    return provider.generateResponse(messages, options);
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
    return provider.checkConnection();
  }

  async listModels(): Promise<string[]> {
    const provider = this.getCurrentProvider();
    if (!provider) {
      return [];
    }
    return provider.listModels();
  }
}

// Global instance
export const aiProviderManager = new AIProviderManager();