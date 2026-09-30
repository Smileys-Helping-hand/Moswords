import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { groupChats, groupChatMembers, users } from '@/lib/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { isUuid } from '@/lib/validate';

// GET /api/group-chats - The user's groups with member count and latest message,
// in one query (this used to run one extra query per group).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id as string;

    const result = await db.execute(sql`
      SELECT g.id, g.name, g.description, g.image_url, g.created_by, g.created_at, g.updated_at,
             me.role AS user_role,
             (SELECT count(*)::int FROM group_chat_members m WHERE m.group_chat_id = g.id) AS member_count,
             lm.content AS last_content, lm.is_encrypted AS last_encrypted, lm.media_type AS last_media_type,
             lm.created_at AS last_at, COALESCE(lu.display_name, lu.name) AS last_sender
      FROM group_chat_members me
      JOIN group_chats g ON g.id = me.group_chat_id
      LEFT JOIN LATERAL (
        SELECT content, is_encrypted, media_type, created_at, user_id
        FROM group_chat_messages
        WHERE group_chat_id = g.id AND deleted = false
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      LEFT JOIN users lu ON lu.id = lm.user_id
      WHERE me.user_id = ${userId}
      ORDER BY COALESCE(lm.created_at, g.created_at) DESC
    `);

    const rows = (result as unknown as { rows: Record<string, any>[] }).rows;
    const groupChats = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUrl: r.image_url,
      createdBy: r.created_by,
      createdAt: utc(r.created_at),
      updatedAt: utc(r.updated_at),
      userRole: r.user_role || 'member',
      memberCount: Number(r.member_count) || 0,
      lastMessage: r.last_at
        ? {
            content: r.last_content,
            isEncrypted: r.last_encrypted,
            mediaType: r.last_media_type,
            senderName: r.last_sender,
            createdAt: utc(r.last_at),
          }
        : null,
      lastActivityAt: utc(r.last_at || r.created_at),
    }));

    return NextResponse.json({ groupChats });
  } catch (error) {
    console.error('Error fetching group chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group chats' },
      { status: 500 }
    );
  }
}

/** Timestamps are `timestamp without time zone` holding UTC. */
function utc(value: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`).toISOString();
}

// POST /api/group-chats - Create a new group chat
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { name, description, memberIds } = body;

    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 80) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    const uniqueMembers: string[] = Array.isArray(memberIds)
      ? Array.from(new Set(memberIds.filter((id: unknown) => isUuid(id) && id !== userId)))
      : [];
    if (uniqueMembers.length === 0) {
      return NextResponse.json(
        { error: 'Add at least one other person to the group' },
        { status: 400 }
      );
    }
    if (uniqueMembers.length > 255) {
      return NextResponse.json({ error: 'Groups can have up to 256 members' }, { status: 400 });
    }

    // Every member must be a real account.
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, uniqueMembers));
    if (existing.length !== uniqueMembers.length) {
      return NextResponse.json({ error: 'Some selected people no longer exist' }, { status: 400 });
    }

    // Create the group chat
    const [newGroupChat] = await db
      .insert(groupChats)
      .values({
        name: name.trim(),
        description: typeof description === 'string' ? description.trim().slice(0, 300) || null : null,
        createdBy: userId,
      })
      .returning();

    if (!newGroupChat || !newGroupChat.id) {
      throw new Error('Failed to create group chat - no ID returned');
    }

    // Add creator as admin
    await db.insert(groupChatMembers).values({
      groupChatId: newGroupChat.id,
      userId,
      role: 'admin',
    });

    // Add other members
    const memberValues = uniqueMembers
      .map((memberId: string) => ({
        groupChatId: newGroupChat.id,
        userId: memberId,
        role: 'member',
      }));

    if (memberValues.length > 0) {
      await db.insert(groupChatMembers).values(memberValues);
    }

    return NextResponse.json({
      groupChat: newGroupChat,
      memberCount: uniqueMembers.length + 1, // Include creator in count
    });
  } catch (error) {
    console.error('Error creating group chat:', error);
    return NextResponse.json(
      { error: 'Failed to create group chat' },
      { status: 500 }
    );
  }
}
