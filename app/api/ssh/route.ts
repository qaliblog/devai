import { NextRequest, NextResponse } from 'next/server';
import { sshService } from '@/lib/ssh';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'connections':
        const connections = sshService.getAllConnections();
        return NextResponse.json({ success: true, connections });

      case 'connection':
        const connectionId = searchParams.get('id');
        if (!connectionId) {
          return NextResponse.json(
            { error: 'Connection ID required' },
            { status: 400 }
          );
        }
        const connection = sshService.getConnection(connectionId);
        return NextResponse.json({ success: true, connection });

      case 'commands':
        const connId = searchParams.get('id');
        if (!connId) {
          return NextResponse.json(
            { error: 'Connection ID required' },
            { status: 400 }
          );
        }
        const commands = sshService.getConnectionCommands(connId);
        return NextResponse.json({ success: true, commands });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to execute SSH action: ${error}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'connect':
        const connectionId = await sshService.connect({
          host: params.host,
          port: params.port || 22,
          username: params.username,
          password: params.password,
          privateKey: params.privateKey,
        });
        return NextResponse.json({ success: true, connectionId });

      case 'disconnect':
        await sshService.disconnect(params.connectionId);
        return NextResponse.json({ success: true });

      case 'execute':
        const command = await sshService.executeCommand(
          params.connectionId,
          params.command
        );
        return NextResponse.json({ success: true, command });

      case 'test':
        const isConnected = await sshService.testConnection(
          params.host,
          params.port || 22,
          params.username,
          params.password,
          params.privateKey
        );
        return NextResponse.json({ success: true, connected: isConnected });

      case 'upload':
        await sshService.uploadFile(
          params.connectionId,
          params.localPath,
          params.remotePath
        );
        return NextResponse.json({ success: true });

      case 'download':
        await sshService.downloadFile(
          params.connectionId,
          params.remotePath,
          params.localPath
        );
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to execute SSH action: ${error}` },
      { status: 500 }
    );
  }
}