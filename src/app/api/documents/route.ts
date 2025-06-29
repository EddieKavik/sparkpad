import { NextRequest, NextResponse } from 'next/server';
import { createDocument, listDocuments } from '@/utils/civilMemoryDocuments';

// GET /api/documents - list all documents
export async function GET() {
  const docs = await listDocuments();
  return NextResponse.json(docs);
}

// POST /api/documents - create a new document
export async function POST(req: NextRequest) {
  const { content, owner, reviewer } = await req.json();
  const doc = await createDocument({ content, owner, reviewer });
  return NextResponse.json(doc);
} 