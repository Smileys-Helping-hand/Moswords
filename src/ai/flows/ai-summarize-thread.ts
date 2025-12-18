'use server';

/**
 * @fileOverview A thread summarization AI agent.
 *
 * - summarizeThread - A function that handles the thread summarization process.
 * - SummarizeThreadInput - The input type for the summarizeThread function.
 * - SummarizeThreadOutput - The return type for the summarizeThread function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeThreadInputSchema = z.object({
  channelId: z.string().describe('The ID of the channel containing the thread.'),
  threadId: z.string().describe('The ID of the thread to summarize.'),
  messages: z.array(z.string()).describe('The messages in the thread to summarize.'),
});
export type SummarizeThreadInput = z.infer<typeof SummarizeThreadInputSchema>;

const SummarizeThreadOutputSchema = z.object({
  summary: z.string().describe('A 3-bullet point summary of the thread.'),
});
export type SummarizeThreadOutput = z.infer<typeof SummarizeThreadOutputSchema>;

export async function summarizeThread(input: SummarizeThreadInput): Promise<SummarizeThreadOutput> {
  return summarizeThreadFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeThreadPrompt',
  input: {schema: SummarizeThreadInputSchema},
  output: {schema: SummarizeThreadOutputSchema},
  prompt: `You are an AI assistant tasked with summarizing message threads into concise bullet points.

  Given the following messages from a thread, create a 3-bullet point summary of the main topics discussed. Strip any potentially sensitive information.

  Messages:
  {{#each messages}}
  - {{{this}}}
  {{/each}}
  `,
});

const summarizeThreadFlow = ai.defineFlow(
  {
    name: 'summarizeThreadFlow',
    inputSchema: SummarizeThreadInputSchema,
    outputSchema: SummarizeThreadOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
