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

    // Ensure we have a valid provider
    const targetProvider = provider || aiProviderManager.getCurrentProviderName();
    
    // Format message for AI provider
    const messages = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: message }
    ];

    // Generate response using the appropriate provider
    const response = await aiProviderManager.generateResponse(
      messages,
      {
        model,
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
    
    // Check if it's an Ollama connection error
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { 
          error: 'Unable to connect to Ollama',
          details: 'Make sure Ollama is running and accessible. Try: ollama serve',
          type: 'connection_error'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: 'generation_error'
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