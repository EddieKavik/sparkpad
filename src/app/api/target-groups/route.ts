import { NextRequest, NextResponse } from 'next/server';
import { putTargetGroup, listTargetGroups } from '@/utils/civilMemoryDirectives';

export async function POST(req: NextRequest) {
  try {
    const group = await req.json();
    // TODO: Add validation and authentication
    const saved = await putTargetGroup(group);
    return NextResponse.json(saved, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const groups = await listTargetGroups();
    return NextResponse.json(groups);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
} 