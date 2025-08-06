import { NextRequest, NextResponse } from 'next/server';
import { fileSystemService } from '@/lib/file-system';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const path = searchParams.get('path') || '.';

    switch (action) {
      case 'read':
        const content = await fileSystemService.readFile(path);
        return NextResponse.json({ success: true, content });

      case 'list':
        const files = await fileSystemService.listFiles(path);
        return NextResponse.json({ success: true, files });

      case 'exists':
        const exists = await fileSystemService.fileExists(path);
        return NextResponse.json({ success: true, exists });

      case 'stats':
        const stats = await fileSystemService.getFileStats(path);
        return NextResponse.json({ success: true, stats });

      case 'workspace-info':
        const workspaceInfo = await fileSystemService.getWorkspaceInfo();
        return NextResponse.json({ success: true, workspaceInfo });

      case 'search':
        const pattern = searchParams.get('pattern') || '';
        const searchResults = await fileSystemService.searchFiles(pattern, path);
        return NextResponse.json({ success: true, results: searchResults });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to execute file operation: ${error}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'write':
        await fileSystemService.writeFile(params.path, params.content);
        return NextResponse.json({ success: true });

      case 'delete':
        await fileSystemService.deleteFile(params.path);
        return NextResponse.json({ success: true });

      case 'create-directory':
        await fileSystemService.createDirectory(params.path);
        return NextResponse.json({ success: true });

      case 'copy':
        await fileSystemService.copyFile(params.sourcePath, params.destPath);
        return NextResponse.json({ success: true });

      case 'move':
        await fileSystemService.moveFile(params.sourcePath, params.destPath);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to execute file operation: ${error}` },
      { status: 500 }
    );
  }
}