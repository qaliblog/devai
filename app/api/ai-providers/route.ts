import { NextRequest, NextResponse } from 'next/server';
import { aiProviderManager, OpenAIProvider, GeminiProvider, OllamaProvider } from '@/lib/ai-providers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        const providers = aiProviderManager.getAvailableProviders();
        const currentProvider = aiProviderManager.getCurrentProviderName();
        return NextResponse.json({ providers, currentProvider });

      case 'status':
        const isConnected = await aiProviderManager.checkConnection();
        const currentProviderName = aiProviderManager.getCurrentProviderName();
        return NextResponse.json({ 
          connected: isConnected, 
          provider: currentProviderName 
        });

      case 'models':
        const models = await aiProviderManager.listModels();
        return NextResponse.json({ models });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to execute AI provider action: ${error}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'add-openai':
        const openaiProvider = new OpenAIProvider(params.apiKey, params.baseUrl);
        aiProviderManager.addProvider('openai', openaiProvider);
        return NextResponse.json({ success: true, provider: 'openai' });

      case 'add-gemini':
        const geminiProvider = new GeminiProvider(params.apiKey, params.baseUrl);
        aiProviderManager.addProvider('gemini', geminiProvider);
        return NextResponse.json({ success: true, provider: 'gemini' });

      case 'add-ollama':
        const ollamaProvider = new OllamaProvider(params.baseUrl, params.model);
        aiProviderManager.addProvider('ollama', ollamaProvider);
        return NextResponse.json({ success: true, provider: 'ollama' });

      case 'switch':
        aiProviderManager.setCurrentProvider(params.provider);
        return NextResponse.json({ 
          success: true, 
          provider: aiProviderManager.getCurrentProviderName() 
        });

      case 'generate':
        const response = await aiProviderManager.generateResponse(
          params.messages,
          params.options
        );
        return NextResponse.json({ success: true, response });

      case 'test-connection':
        const isConnected = await aiProviderManager.checkConnection();
        return NextResponse.json({ success: true, connected: isConnected });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to execute AI provider action: ${error}` },
      { status: 500 }
    );
  }
}