import { NextRequest, NextResponse } from 'next/server';
import { listBroadcastLogs } from '@/utils/civilMemoryDirectives';

export async function GET(req: NextRequest) {
  try {
    const logs = await listBroadcastLogs();
    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
} 