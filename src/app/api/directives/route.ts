import { NextRequest, NextResponse } from 'next/server';
import { putDirective, listDirectives } from '@/utils/civilMemoryDirectives';

export async function POST(req: NextRequest) {
  try {
    const directive = await req.json();
    // TODO: Add validation and authentication
    const saved = await putDirective(directive);
    return NextResponse.json(saved, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const directives = await listDirectives();
    return NextResponse.json(directives);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
} 