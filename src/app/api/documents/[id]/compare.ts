import { NextRequest, NextResponse } from 'next/server';
import { getDocument } from '@/utils/civilMemoryDocuments';
import { diffLines } from 'diff';

// GET /api/documents/[id]/compare?versionA=1&versionB=2
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const versionA = parseInt(searchParams.get('versionA') || '', 10);
  const versionB = parseInt(searchParams.get('versionB') || '', 10);
  if (!versionA || !versionB) {
    return NextResponse.json({ error: 'versionA and versionB are required' }, { status: 400 });
  }
  const doc = await getDocument(params.id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const vA = doc.history.find(v => v.version === versionA);
  const vB = doc.history.find(v => v.version === versionB);
  if (!vA || !vB) {
    return NextResponse.json({ error: 'One or both versions not found' }, { status: 404 });
  }
  const diff = diffLines(vA.content, vB.content);
  return NextResponse.json({ diff });
} 