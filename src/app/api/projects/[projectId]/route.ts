import { NextRequest, NextResponse } from 'next/server';

// GET: /api/projects/[projectId]?userEmail=...
export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const { searchParams } = new URL(req.url);
  const userEmail = searchParams.get('userEmail');
  if (!userEmail) {
    return NextResponse.json({ error: 'Missing userEmail' }, { status: 400 });
  }
  try {
    const res = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    const projects = await res.json();
    if (!Array.isArray(projects)) {
      return NextResponse.json({ error: 'No projects found' }, { status: 404 });
    }
    const project = projects.find((p: any) => String(p.id).trim() === String(projectId).trim());
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
} 