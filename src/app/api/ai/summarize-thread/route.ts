import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { summarizeThread } from '@/ai/flows/ai-summarize-thread';

// POST /api/ai/summarize-thread
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const channelId = String(body.channelId ?? '');
    const threadId = String(body.threadId ?? channelId);
    const messages = Array.isArray(body.messages)
      ? (body.messages as unknown[]).map((m) => String(m))
      : [];

    if (!channelId || messages.length === 0) {
      return NextResponse.json(
        { error: 'channelId and messages are required' },
        { status: 400 }
      );
    }

    // Keep payload bounded
    const trimmed = messages
      .filter(Boolean)
      .slice(0, 80)
      .map((m: string) => (m.length > 500 ? m.slice(0, 500) + '…' : m));

    const result = await summarizeThread({
      channelId,
      threadId,
      messages: trimmed,
    });

    return NextResponse.json({ summary: result.summary });
  } catch (error) {
    console.error('Error summarizing thread:', error);
    return NextResponse.json({ error: 'Failed to summarize thread' }, { status: 500 });
  }
}
