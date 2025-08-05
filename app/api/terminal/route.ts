import { NextRequest, NextResponse } from 'next/server';
import { terminalService } from '@/lib/terminal';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'system-info':
        const systemInfo = await terminalService.getSystemInfo();
        return NextResponse.json({ success: true, systemInfo });

      case 'available-commands':
        const commands = await terminalService.getAvailableCommands();
        return NextResponse.json({ success: true, commands });

      case 'processes':
        const processes = terminalService.getAllProcesses();
        return NextResponse.json({ success: true, processes });

      case 'check-command':
        const command = searchParams.get('command') || '';
        const exists = await terminalService.checkCommandExists(command);
        return NextResponse.json({ success: true, exists });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to execute terminal action: ${error}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'execute':
        const result = await terminalService.executeCommand(
          params.command,
          {
            cwd: params.cwd,
            timeout: params.timeout,
            env: params.env,
            shell: params.shell,
          }
        );
        return NextResponse.json({ success: true, result });

      case 'execute-simple':
        const output = await terminalService.executeCommandSimple(
          params.command,
          params.cwd
        );
        return NextResponse.json({ success: true, output });

      case 'kill-process':
        const killed = terminalService.killProcess(params.processId);
        return NextResponse.json({ success: true, killed });

      case 'kill-all':
        terminalService.killAllProcesses();
        return NextResponse.json({ success: true });

      case 'get-output':
        const outputHistory = terminalService.getProcessOutput(params.processId);
        return NextResponse.json({ success: true, output: outputHistory });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to execute terminal action: ${error}` },
      { status: 500 }
    );
  }
}