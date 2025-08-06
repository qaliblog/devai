import { NextRequest, NextResponse } from 'next/server';
import { workspaceManager } from '@/lib/workspace';
import { sshService } from '@/lib/ssh';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        const workspaces = workspaceManager.getAllWorkspaces();
        return NextResponse.json({ success: true, workspaces });

      case 'active':
        const activeWorkspace = workspaceManager.getActiveWorkspace();
        return NextResponse.json({ success: true, workspace: activeWorkspace });

      case 'info':
        const workspaceId = searchParams.get('id');
        if (!workspaceId) {
          return NextResponse.json(
            { error: 'Workspace ID required' },
            { status: 400 }
          );
        }
        const info = await workspaceManager.getWorkspaceInfo(workspaceId);
        return NextResponse.json({ success: true, info });

      case 'files':
        const wsId = searchParams.get('id');
        const subPath = searchParams.get('path') || '.';
        if (!wsId) {
          return NextResponse.json(
            { error: 'Workspace ID required' },
            { status: 400 }
          );
        }
        const files = await workspaceManager.listWorkspaceFiles(wsId, subPath);
        return NextResponse.json({ success: true, files });

      case 'read':
        const readWsId = searchParams.get('id');
        const filePath = searchParams.get('path');
        if (!readWsId || !filePath) {
          return NextResponse.json(
            { error: 'Workspace ID and file path required' },
            { status: 400 }
          );
        }
        const content = await workspaceManager.readWorkspaceFile(readWsId, filePath);
        return NextResponse.json({ success: true, content });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to execute workspace action: ${error}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'add-local':
        const localId = await workspaceManager.addLocalWorkspace(
          params.name,
          params.path
        );
        return NextResponse.json({ success: true, workspaceId: localId });

      case 'add-ssh':
        // First establish SSH connection
        const connectionId = await sshService.connect({
          host: params.host,
          port: params.port || 22,
          username: params.username,
          password: params.password,
          privateKey: params.privateKey,
        });

        const connection = sshService.getConnection(connectionId);
        if (!connection) {
          throw new Error('Failed to establish SSH connection');
        }

        const sshId = await workspaceManager.addSSHWorkspace(
          params.name,
          connection
        );
        return NextResponse.json({ success: true, workspaceId: sshId });

      case 'set-active':
        await workspaceManager.setActiveWorkspace(params.workspaceId);
        return NextResponse.json({ success: true });

      case 'remove':
        await workspaceManager.removeWorkspace(params.workspaceId);
        return NextResponse.json({ success: true });

      case 'write':
        await workspaceManager.writeWorkspaceFile(
          params.workspaceId,
          params.filePath,
          params.content
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
      { error: `Failed to execute workspace action: ${error}` },
      { status: 500 }
    );
  }
}