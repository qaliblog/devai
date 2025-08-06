import { NextRequest, NextResponse } from 'next/server';
import { ollamaService } from '@/lib/ollama';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'check-connection':
        const isConnected = await ollamaService.checkConnection();
        return NextResponse.json({ connected: isConnected });

      case 'list-models':
        const models = await ollamaService.listModels();
        return NextResponse.json({ models });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to execute Ollama action: ${error}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'generate':
        const response = await ollamaService.generateResponse(
          params.messages,
          params.options
        );
        return NextResponse.json({ success: true, response });

      case 'pull-model':
        await ollamaService.pullModel(params.modelName);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to execute Ollama action: ${error}` },
      { status: 500 }
    );
  }
}