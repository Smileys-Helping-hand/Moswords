import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeMessageToxicity } from '@/ai/flows/ai-auto-moderator';

// POST /api/ai/moderate-message
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const text = String(body.text ?? '').trim();

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const result = await analyzeMessageToxicity({ text });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error moderating message:', error);
    // Fail open (don’t block messaging if AI is misconfigured)
    return NextResponse.json({ isToxic: false, toxicityReason: '' });
  }
}
