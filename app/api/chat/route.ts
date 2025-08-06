import { NextRequest, NextResponse } from 'next/server';
import { aiProviderManager } from '@/lib/ai-providers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, provider = 'ollama', model, systemPrompt } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get the current provider
    const currentProvider = aiProviderManager.getCurrentProvider();
    
    // Use the specified provider or fall back to current
    const targetProvider = provider || currentProvider;

    // Generate response using the appropriate provider
    const response = await aiProviderManager.generateResponse(
      message,
      {
        model,
        systemPrompt,
        provider: targetProvider
      }
    );

    return NextResponse.json({
      success: true,
      response: response.content,
      provider: targetProvider,
      model: response.model
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        const status = aiProviderManager.getStatus();
        return NextResponse.json({ success: true, status });
      
      case 'providers':
        const providers = aiProviderManager.getAvailableProviders();
        return NextResponse.json({ success: true, providers });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Chat API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}