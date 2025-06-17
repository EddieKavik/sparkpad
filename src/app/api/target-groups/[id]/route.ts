import { NextRequest, NextResponse } from 'next/server';
import { putTargetGroup } from '@/utils/civilMemoryDirectives';
import { localMemoryKV } from '@/utils/localMemoryKV';

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  try {
    const id = context.params.id;
    const data: Record<string, unknown> = await req.json();
    const updated = await putTargetGroup({ ...data, id });
    return NextResponse.json(updated);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: error || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  try {
    const id = context.params.id;
    await localMemoryKV.disk.delete(`target_groups#${id}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: error || 'Unknown error' }, { status: 500 });
  }
} 