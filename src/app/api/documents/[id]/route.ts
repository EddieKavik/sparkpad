import { NextRequest, NextResponse } from 'next/server';
import {
  getDocument,
  updateDocument,
  submitForApproval,
  approveDocument,
  rejectDocument,
  saveDraft,
  getDocumentHistory,
} from '@/utils/civilMemoryDocuments';

// GET /api/documents/[id] - fetch document
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const doc = await getDocument(params.id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(doc);
}

// POST /api/documents/[id] - update/save draft
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { content, editor } = await req.json();
  const updated = await saveDraft(params.id, content, editor || 'unknown');
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

// PATCH /api/documents/[id] - submit for approval, approve, reject
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { action, reviewer, editor } = await req.json();
  let result = null;
  if (action === 'submit_for_approval') {
    result = await submitForApproval(params.id, reviewer);
  } else if (action === 'approve') {
    result = await approveDocument(params.id, reviewer);
  } else if (action === 'reject') {
    result = await rejectDocument(params.id, reviewer);
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  if (!result) return NextResponse.json({ error: 'Not found or invalid state' }, { status: 404 });
  return NextResponse.json(result);
}

// GET /api/documents/[id]/history - get version history
export async function GET_HISTORY(req: NextRequest, { params }: { params: { id: string } }) {
  const history = await getDocumentHistory(params.id);
  if (!history) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(history);
} 