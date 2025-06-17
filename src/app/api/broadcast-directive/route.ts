import { NextRequest, NextResponse } from 'next/server';
import { listTargetGroups, getDirective, putUserReceivedDirective, putBroadcastLog } from '@/utils/civilMemoryDirectives';
import { getAllUsers } from '@/utils/civilMemoryUsers';
import { sendInAppNotification } from '@/utils/notifications';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Real translation using Gemini API via /api/ai endpoint
async function aiTranslateGemini(content: string, from: string, to: string) {
  if (from === to) return content;
  const prompt = `Translate the following text from ${from} to ${to}:\n${content}`;
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error('Translation failed');
  const data = await res.json();
  return data.result || content;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const broadcasterUserId = session.user.id;
    const { directiveId, targetGroupIds } = await req.json();
    const allGroups = await listTargetGroups();
    const selectedGroups = allGroups.filter((g: any) => targetGroupIds.includes(g.id));
    const allUsers = await getAllUsers();
    const recipientSet = new Set<string>();
    for (const group of selectedGroups) {
      for (const user of allUsers) {
        const c = group.criteria || {};
        if (
          (!c.regions || c.regions.length === 0 || c.regions.includes(user.region)) &&
          (!c.countries || c.countries.length === 0 || c.countries.includes(user.country)) &&
          (!c.preferred_languages || c.preferred_languages.length === 0 || c.preferred_languages.includes(user.preferred_language)) &&
          (!c.user_roles || c.user_roles.length === 0 || (user.roles && user.roles.some((r: string) => c.user_roles.includes(r)))) &&
          (!c.user_tags || c.user_tags.length === 0 || (user.tags && user.tags.some((t: string) => c.user_tags.includes(t)))) &&
          (!c.project_ids || c.project_ids.length === 0 || (user.projects && user.projects.some((p: string) => c.project_ids.includes(p))))
        ) {
          recipientSet.add(user.id);
        }
      }
    }
    const recipientIds = Array.from(recipientSet);
    const directive = await getDirective(directiveId);
    let translatedCount = 0;
    for (const userId of recipientIds) {
      const user = allUsers.find((u: any) => u.id === userId);
      const userLang = user?.preferred_language || directive.source_language;
      let content = directive.content;
      if (userLang !== directive.source_language) {
        content = await aiTranslateGemini(directive.content, directive.source_language, userLang);
        translatedCount++;
      }
      await putUserReceivedDirective({
        user_id: userId,
        directive_id: directiveId,
        translated_content: content,
        read_status: false,
        received_at: new Date().toISOString(),
      });
      await sendInAppNotification(
        userId,
        `New Directive: '${directive.title}'`,
        `From ${directive.issuing_body}`
      );
    }
    await putBroadcastLog({
      directive_id: directiveId,
      broadcast_timestamp: new Date().toISOString(),
      broadcaster_user_id: broadcasterUserId,
      target_group_ids_used: targetGroupIds,
      number_of_recipients: recipientIds.length,
      success_status: 'completed',
    });
    return NextResponse.json({ success: true, recipientCount: recipientIds.length, translatedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
} 