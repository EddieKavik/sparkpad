import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory annotation store (reset on server restart)
let annotations: any[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Create annotation
    const annotation = req.body;
    if (!annotation || !annotation.annotation_id) {
      return res.status(400).json({ error: 'Missing annotation_id' });
    }
    annotations.push(annotation);
    return res.status(201).json(annotation);
  }

  if (req.method === 'GET') {
    // List annotations for a document
    const { document_id } = req.query;
    if (!document_id) {
      return res.status(400).json({ error: 'Missing document_id' });
    }
    const filtered = annotations.filter(a => a.document_id === document_id);
    return res.status(200).json(filtered);
  }

  if (req.method === 'PATCH') {
    // Update annotation by annotation_id
    const { annotation_id } = req.query;
    if (!annotation_id) {
      return res.status(400).json({ error: 'Missing annotation_id' });
    }
    const idx = annotations.findIndex(a => a.annotation_id === annotation_id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    annotations[idx] = { ...annotations[idx], ...req.body };
    return res.status(200).json(annotations[idx]);
  }

  if (req.method === 'DELETE') {
    // Delete annotation by annotation_id
    const { annotation_id } = req.query;
    if (!annotation_id) {
      return res.status(400).json({ error: 'Missing annotation_id' });
    }
    annotations = annotations.filter(a => a.annotation_id !== annotation_id);
    return res.status(204).end();
  }

  res.setHeader('Allow', ['POST', 'GET', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
} 