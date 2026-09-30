import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ai } from '@/ai/genkit';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const limit = await rateLimit(`ai:${(session.user as { id?: string }).id}`, 30, 60);
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
  }

  const { messages, systemPrompt } = await request.json();
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array required' }), { status: 400 });
  }

  // Build conversation history for Genkit
  // Last 20 turns only: keeps token cost bounded on long chats.
  const history = messages.slice(-21, -1).map((m: { role: string; content: string }) => ({
    role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
    content: [{ text: String(m.content ?? '').slice(0, 8000) }],
  }));
  const lastMessage = messages[messages.length - 1];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { stream: genStream } = ai.generateStream({
          model: 'googleai/gemini-2.5-flash',
          system: systemPrompt || `You are Moswords AI — a smart, helpful assistant built into the Moswords team communication platform. You help users with tasks, answer questions, draft messages, summarize content, and assist with workflow approvals. Be concise and helpful.`,
          // Genkit's option is `messages`; the old `history` key was silently ignored,
          // so the assistant never saw earlier turns.
          messages: history,
          prompt: String(lastMessage.content ?? '').slice(0, 8000),
        });

        for await (const chunk of genStream) {
          const text = chunk.text;
          if (text) {
            const data = `data: ${JSON.stringify({ text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err: any) {
        console.error('AI chat stream failed:', err?.message);
        const errData = `data: ${JSON.stringify({ error: 'The assistant is unavailable right now. Please try again.' })}\n\n`;
        controller.enqueue(encoder.encode(errData));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
