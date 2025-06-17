import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAllUserReceivedDirectives } from '@/utils/civilMemoryDirectives';

export async function GET(req: NextRequest) {
  try {
    // In dev, always use mock user (getServerSession will return null)
    let session = await getServerSession();
    let userId;
    if (!session || !(session as any).user?.id) {
      // MOCK USER FOR DEV ONLY
      userId = 'mock-user-1';
    } else {
      userId = (session as any).user.id;
    }
    const directives = await getAllUserReceivedDirectives(userId);
    return NextResponse.json(directives);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, read } = await req.json();
    if (!id || typeof read !== 'boolean') {
      return NextResponse.json({ error: 'Missing id or read' }, { status: 400 });
    }
    // No auth for dev
    const updated = await (await import('@/utils/civilMemoryDirectives')).updateUserReceivedDirectiveReadStatus(id, read);
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
} 