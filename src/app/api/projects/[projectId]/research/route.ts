import { NextRequest, NextResponse } from 'next/server';
import { localMemoryKV } from '@/utils/localMemoryKV';

// In-memory store for demo (replace with DB in production)
const researchStore: Record<string, ResearchItem[]> = {};

// In-memory store for Q&A pairs per project
const qaStore: Record<string, QAPair[]> = {};

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

export interface QAPair {
  id: string;
  projectId: string;
  question: string;
  answer: string;
  createdBy: string;
  createdAt: string;
}

// GET: /api/projects/[projectId]/research
export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const prefix = `project/${projectId}/documents/`;
  const keys = await localMemoryKV.disk.listKeys(prefix);
  const items = await Promise.all(
    keys.map(async (key: string) => {
      const data = await localMemoryKV.disk.get(key);
      return data ? JSON.parse(data) : null;
    })
  );
  return NextResponse.json(items.filter(Boolean));
}

// POST: /api/projects/[projectId]/research
export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const body = await req.json();
  const id = Date.now().toString();
  const newItem: ResearchItem = {
    ...body,
    id,
    projectId,
    createdAt: new Date().toISOString(),
  };
  const key = `project/${projectId}/documents/${id}`;
  await localMemoryKV.disk.set(key, JSON.stringify(newItem));
  return NextResponse.json(newItem, { status: 201 });
}

// PUT: /api/projects/[projectId]/research?id=RESEARCH_ID
export async function PUT(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const key = `project/${projectId}/documents/${id}`;
  const data = await localMemoryKV.disk.get(key);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const updated = { ...JSON.parse(data), ...body };
  await localMemoryKV.disk.set(key, JSON.stringify(updated));
  return NextResponse.json(updated);
}

// DELETE: /api/projects/[projectId]/research?id=RESEARCH_ID
export async function DELETE(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const key = `project/${projectId}/documents/${id}`;
  const data = await localMemoryKV.disk.get(key);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await localMemoryKV.disk.delete(key);
  return NextResponse.json(JSON.parse(data));
}

// Q&A API: /api/projects/[projectId]/research/qa
export async function GET_QA(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const items = qaStore[projectId] || [];
  return NextResponse.json(items);
}

export async function POST_QA(req: NextRequest, { params }: { params: { projectId: string } }) {
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

export async function DELETE_QA(req: NextRequest, { params }: { params: { projectId: string } }) {
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