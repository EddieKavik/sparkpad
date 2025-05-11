import { NextRequest, NextResponse } from 'next/server';
import { qaStore, QAPair } from '../route';

// GET: /api/projects/[projectId]/research/qa
export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const items = qaStore[projectId] || [];
  return NextResponse.json(items);
}

// POST: /api/projects/[projectId]/research/qa
export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const body = await req.json();
  const newPair: QAPair = {
    ...body,
    id: Date.now().toString(),
    projectId,
    createdAt: new Date().toISOString(),
  };
  if (!qaStore[projectId]) qaStore[projectId] = [];
  qaStore[projectId].push(newPair);
  return NextResponse.json(newPair, { status: 201 });
}

// DELETE: /api/projects/[projectId]/research/qa?id=QA_ID
export async function DELETE(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const items = qaStore[projectId] || [];
  const idx = items.findIndex(item => item.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const deleted = items.splice(idx, 1)[0];
  qaStore[projectId] = items;
  return NextResponse.json(deleted);
}

// PUT: /api/projects/[projectId]/research/qa?id=QA_ID
export async function PUT(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const body = await req.json();
  const items = qaStore[projectId] || [];
  const idx = items.findIndex(item => item.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = { ...items[idx], ...body };
  items[idx] = updated;
  qaStore[projectId] = items;
  return NextResponse.json(updated);
} 