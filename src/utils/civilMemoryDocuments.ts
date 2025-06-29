import { localMemoryKV as civilMemoryKV } from './localMemoryKV';

const DOCUMENTS_NAMESPACE = 'documents';

export type DocumentStatus = 'draft' | 'pending_approval' | 'approved';

export interface DocumentVersion {
  version: number;
  content: string;
  timestamp: string;
  status: DocumentStatus;
  editor: string;
}

export interface CivilMemoryDocument {
  id: string;
  projectId?: string;
  content: string;
  status: DocumentStatus;
  version: number;
  last_approved_version: number;
  owner: string;
  reviewer: string;
  history: DocumentVersion[];
}

function docKey(id: string) {
  return `${DOCUMENTS_NAMESPACE}#${id}`;
}

export async function createDocument(doc: Partial<CivilMemoryDocument>) {
  const id = doc.id || `doc-${Date.now()}`;
  const now = new Date().toISOString();
  const initialVersion: DocumentVersion = {
    version: 1,
    content: doc.content || '',
    timestamp: now,
    status: 'draft',
    editor: doc.owner || 'unknown',
  };
  const newDoc: CivilMemoryDocument = {
    id,
    projectId: doc.projectId,
    content: doc.content || '',
    status: 'draft',
    version: 1,
    last_approved_version: 0,
    owner: doc.owner || 'unknown',
    reviewer: doc.reviewer || '',
    history: [initialVersion],
  };
  await civilMemoryKV.disk.set(docKey(id), JSON.stringify(newDoc));
  return newDoc;
}

export async function getDocument(id: string): Promise<CivilMemoryDocument | null> {
  const data = await civilMemoryKV.disk.get(docKey(id));
  return data ? JSON.parse(data) : null;
}

export async function updateDocument(id: string, updates: Partial<CivilMemoryDocument>, editor: string) {
  const doc = await getDocument(id);
  if (!doc) return null;
  const now = new Date().toISOString();
  const newVersion = doc.version + 1;
  const updatedDoc: CivilMemoryDocument = {
    ...doc,
    ...updates,
    version: newVersion,
    content: updates.content !== undefined ? updates.content : doc.content,
    history: [
      ...doc.history,
      {
        version: newVersion,
        content: updates.content !== undefined ? updates.content : doc.content,
        timestamp: now,
        status: updates.status || doc.status,
        editor,
      },
    ],
  };
  await civilMemoryKV.disk.set(docKey(id), JSON.stringify(updatedDoc));
  return updatedDoc;
}

export async function submitForApproval(id: string, reviewer: string) {
  const doc = await getDocument(id);
  if (!doc) return null;
  doc.status = 'pending_approval';
  doc.reviewer = reviewer;
  await civilMemoryKV.disk.set(docKey(id), JSON.stringify(doc));
  return doc;
}

export async function approveDocument(id: string, reviewer: string) {
  const doc = await getDocument(id);
  if (!doc || doc.status !== 'pending_approval' || doc.reviewer !== reviewer) return null;
  doc.status = 'approved';
  doc.last_approved_version = doc.version;
  await civilMemoryKV.disk.set(docKey(id), JSON.stringify(doc));
  return doc;
}

export async function rejectDocument(id: string, reviewer: string) {
  const doc = await getDocument(id);
  if (!doc || doc.status !== 'pending_approval' || doc.reviewer !== reviewer) return null;
  doc.status = 'draft';
  await civilMemoryKV.disk.set(docKey(id), JSON.stringify(doc));
  return doc;
}

export async function saveDraft(id: string, content: string, editor: string) {
  return updateDocument(id, { content, status: 'draft' }, editor);
}

export async function getDocumentHistory(id: string): Promise<DocumentVersion[] | null> {
  const doc = await getDocument(id);
  return doc ? doc.history : null;
}

export async function listDocuments(projectId?: string) {
  if (typeof civilMemoryKV.disk.listKeys === 'function') {
    const keys = await civilMemoryKV.disk.listKeys(DOCUMENTS_NAMESPACE);
    const docs = await Promise.all(
      keys.map(async (key: string) => {
        const data = await civilMemoryKV.disk.get(key);
        return data ? JSON.parse(data) : null;
      })
    );
    const filtered = docs.filter(Boolean);
    if (projectId) {
      return filtered.filter((doc: CivilMemoryDocument) => doc.projectId === projectId);
    }
    return filtered;
  }
  return [];
} 