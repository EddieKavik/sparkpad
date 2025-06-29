import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/utils/civilMemoryUsers';
import { localMemoryKV as civilMemoryKV } from '@/utils/localMemoryKV';

const USERS_NAMESPACE = 'users';

// GET /api/users - list all users
export async function GET() {
  const users = await getAllUsers();
  return NextResponse.json(users);
}

// POST /api/users - create a new user
export async function POST(req: NextRequest) {
  const { email, name, role } = await req.json();
  if (!email || !name || !role) {
    return NextResponse.json({ error: 'Missing email, name, or role' }, { status: 400 });
  }
  const user = { email, name, role };
  await civilMemoryKV.disk.set(`${USERS_NAMESPACE}#${email}`, JSON.stringify(user));
  return NextResponse.json(user);
} 