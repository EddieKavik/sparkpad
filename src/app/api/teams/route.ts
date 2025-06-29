import { NextResponse } from 'next/server';
import {
  putTargetGroup,
  listTargetGroups,
  getTargetGroup,
  putDirective,
  putBroadcastLog,
} from '@/utils/civilMemoryDirectives';

// GET all teams
export async function GET() {
  try {
    const teams = await listTargetGroups();
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Failed to list teams:', error);
    return NextResponse.json({ message: 'Failed to list teams' }, { status: 500 });
  }
}

// POST a new team or a directive
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // If 'action' is 'send_directive', create a directive and a broadcast log
    if (body.action === 'send_directive') {
      const { teamId, message, from } = body;
      if (!teamId || !message || !from) {
        return NextResponse.json({ message: 'Missing required fields for directive' }, { status: 400 });
      }

      // 1. Get the team to find its members
      const team = await getTargetGroup(teamId);
      if (!team || !team.members || team.members.length === 0) {
        return NextResponse.json({ message: 'Team not found or has no members' }, { status: 404 });
      }

      // 2. Create the directive
      const directive = await putDirective({
        message,
        from,
        targetGroupId: teamId,
        timestamp: new Date().toISOString(),
      });

      // 3. Create a broadcast log for each member (which acts as their notification)
      const broadcastPromises = team.members.map((memberId: string) =>
        putBroadcastLog({
          directive_id: directive.id,
          user_id: memberId,
          timestamp: new Date().toISOString(),
          read_status: false,
        })
      );
      await Promise.all(broadcastPromises);

      return NextResponse.json({ message: 'Directive sent successfully', directive });
    }

    // Otherwise, create a new team
    const { name, members } = body;
    if (!name || !Array.isArray(members)) {
      return NextResponse.json({ message: 'Team name and members array are required' }, { status: 400 });
    }

    const newTeam = await putTargetGroup({
      name,
      members, // Array of user emails/IDs
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/teams:', error);
    return NextResponse.json({ message: 'Failed to process request' }, { status: 500 });
  }
} 