import { NextRequest, NextResponse } from 'next/server';
import { devAIAgent } from '@/lib/agent';

export async function GET(request: NextRequest) {
  try {
    const state = devAIAgent.getState();
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get agent state' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'initialize':
        await devAIAgent.initialize();
        return NextResponse.json({ success: true });

      case 'start-auto-mode':
        await devAIAgent.startAutoMode();
        return NextResponse.json({ success: true });

      case 'stop-auto-mode':
        devAIAgent.stopAutoMode();
        return NextResponse.json({ success: true });

      case 'add-task':
        const taskId = await devAIAgent.addTask(params);
        return NextResponse.json({ success: true, taskId });

      case 'get-task-history':
        const history = await devAIAgent.getTaskHistory();
        return NextResponse.json({ success: true, history });

      case 'get-current-task':
        const currentTask = await devAIAgent.getCurrentTask();
        return NextResponse.json({ success: true, currentTask });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to execute action: ${error}` },
      { status: 500 }
    );
  }
}