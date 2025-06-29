import { NextResponse } from 'next/server';
import {
  getAllUserReceivedDirectives,
  updateUserReceivedDirectiveReadStatus,
  getDirective,
} from '@/utils/civilMemoryDirectives';

// GET all notifications for a specific user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  try {
    // 1. Fetch all broadcast logs for the user (these are their notifications)
    const receivedDirectives = await getAllUserReceivedDirectives(userId);

    // 2. For each notification, fetch the original directive content
    const notifications = await Promise.all(
      receivedDirectives.map(async (received: any) => {
        const directive = await getDirective(received.directive_id);
        return {
          id: received.id, // This is the unique ID of the user_received_directive record
          message: directive ? directive.message : 'Directive content not found.',
          from: directive ? directive.from : 'Unknown',
          timestamp: received.timestamp,
          read: received.read_status,
          directiveId: received.directive_id,
        };
      })
    );

    // Sort notifications by most recent
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(notifications);
  } catch (error) {
    console.error(`Failed to get notifications for user ${userId}:`, error);
    return NextResponse.json({ message: 'Failed to retrieve notifications' }, { status: 500 });
  }
}

// PATCH to update a notification's read status
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { notificationId, read } = body;

        if (!notificationId || typeof read !== 'boolean') {
            return NextResponse.json({ message: 'notificationId and read status are required' }, { status: 400 });
        }

        const updatedNotification = await updateUserReceivedDirectiveReadStatus(notificationId, read);

        if (!updatedNotification) {
            return NextResponse.json({ message: 'Notification not found' }, { status: 404 });
        }

        return NextResponse.json(updatedNotification);

    } catch (error) {
        console.error('Failed to update notification:', error);
        return NextResponse.json({ message: 'Failed to update notification' }, { status: 500 });
    }
} 