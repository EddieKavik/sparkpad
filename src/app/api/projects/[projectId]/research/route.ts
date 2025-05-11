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