import axios from 'axios';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'list';
  path: string;
  content?: string;
}

export interface CommandExecution {
  command: string;
  cwd?: string;
  timeout?: number;
}

export class OllamaService {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'deepseek-coder:6.7b') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async generateResponse(
    messages: OllamaMessage[],
    options: {
      temperature?: number;
      top_p?: number;
      max_tokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<OllamaResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          num_predict: options.max_tokens || 4096,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error communicating with Ollama:', error);
      throw new Error(`Failed to generate response: ${error}`);
    }
  }

  async streamResponse(
    messages: OllamaMessage[],
    onChunk: (chunk: string) => void,
    options: {
      temperature?: number;
      top_p?: number;
      max_tokens?: number;
    } = {}
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
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
      console.error('Error streaming from Ollama:', error);
      throw new Error(`Failed to stream response: ${error}`);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models.map((model: any) => model.name);
    } catch (error) {
      console.error('Error listing models:', error);
      return [];
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

  async pullModel(modelName: string = 'deepseek-coder'): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/api/pull`, {
        name: modelName,
      });
    } catch (error) {
      console.error('Error pulling model:', error);
      throw new Error(`Failed to pull model: ${error}`);
    }
  }
}

export const ollamaService = new OllamaService();