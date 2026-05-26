import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ai } from '@/ai/genkit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { messages, systemPrompt } = await request.json();
  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'messages array required' }), { status: 400 });
  }

  // Build conversation history for Genkit
  const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'model',
    content: [{ text: m.content }],
  }));
  const lastMessage = messages[messages.length - 1];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { stream: genStream } = ai.generateStream({
          model: 'googleai/gemini-2.5-flash',
          system: systemPrompt || `You are Moswords AI — a smart, helpful assistant built into the Moswords team communication platform. You help users with tasks, answer questions, draft messages, summarize content, and assist with workflow approvals. Be concise and helpful.`,
          history,
          prompt: lastMessage.content,
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
        const errData = `data: ${JSON.stringify({ error: err.message || 'Stream error' })}\n\n`;
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
