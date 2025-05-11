import { NextRequest, NextResponse } from 'next/server';

// In-memory store for demo (replace with DB in production)
const researchStore: Record<string, ResearchItem[]> = {};

export interface ResearchItem {
  id: string;
  projectId: string;
  type: 'web' | 'note' | 'pdf' | 'other';
  title: string;
  sourceUrl?: string;
  content: string;
  summary?: string;
  tags?: string[];
  annotations?: string[];
  createdBy: string;
  createdAt: string;
}

// GET: /api/projects/[projectId]/research
export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const items = researchStore[projectId] || [];
  return NextResponse.json(items);
}

// POST: /api/projects/[projectId]/research
export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const body = await req.json();
  const newItem: ResearchItem = {
    ...body,
    id: Date.now().toString(),
    projectId,
    createdAt: new Date().toISOString(),
  };
  if (!researchStore[projectId]) researchStore[projectId] = [];
  researchStore[projectId].push(newItem);
  return NextResponse.json(newItem, { status: 201 });
}

// PUT: /api/projects/[projectId]/research?id=RESEARCH_ID
export async function PUT(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const body = await req.json();
  const items = researchStore[projectId] || [];
  const idx = items.findIndex(item => item.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = { ...items[idx], ...body };
  items[idx] = updated;
  researchStore[projectId] = items;
  return NextResponse.json(updated);
}

// DELETE: /api/projects/[projectId]/research?id=RESEARCH_ID
export async function DELETE(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const items = researchStore[projectId] || [];
  const idx = items.findIndex(item => item.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const deleted = items.splice(idx, 1)[0];
  researchStore[projectId] = items;
  return NextResponse.json(deleted);
} 