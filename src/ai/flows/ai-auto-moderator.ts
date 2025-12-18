'use server';

/**
 * @fileOverview Implements an AI-powered auto-moderation system that flags toxic messages.
 * 
 * - analyzeMessageToxicity - A function that analyzes the toxicity of a message and flags it if it violates community guidelines.
 * - AnalyzeMessageToxicityInput - The input type for the analyzeMessageToxicity function.
 * - AnalyzeMessageToxicityOutput - The return type for the analyzeMessageToxicity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeMessageToxicityInputSchema = z.object({
  text: z.string().describe('The text of the message to analyze.'),
});
export type AnalyzeMessageToxicityInput = z.infer<typeof AnalyzeMessageToxicityInputSchema>;

const AnalyzeMessageToxicityOutputSchema = z.object({
  isToxic: z
    .boolean()
    .describe('Whether the message is toxic, inappropriate, or violates community guidelines.'),
  toxicityReason: z
    .string()
    .describe(
      'If the message is toxic, a kind and empathetic explanation for a young person about why the message could be hurtful or inappropriate. This should be educational, not punitive.'
    ),
});
export type AnalyzeMessageToxicityOutput = z.infer<typeof AnalyzeMessageToxicityOutputSchema>;

export async function analyzeMessageToxicity(input: AnalyzeMessageToxicityInput): Promise<AnalyzeMessageToxicityOutput> {
  return analyzeMessageToxicityFlow(input);
}

const toxicityAnalysisPrompt = ai.definePrompt({
  name: 'toxicityAnalysisPrompt',
  input: {schema: AnalyzeMessageToxicityInputSchema},
  output: {schema: AnalyzeMessageToxicityOutputSchema},
  prompt: `You are an AI sentinel for a kids' social app. You are responsible for detecting toxic, mean, or otherwise inappropriate messages.

  Your primary goal is to foster a safe and empathetic environment.

  Analyze the following message. Determine if it is toxic or violates community guidelines.

  - If the message is NOT toxic, respond with 'isToxic: false' and an empty 'toxicityReason'.
  - If the message IS toxic, respond with 'isToxic: true'. For the 'toxicityReason', provide a kind, gentle, and educational explanation for a young person (under 13) about why their words might be hurtful. Focus on empathy and understanding, not punishment. For example, instead of "Don't use bad words," you could say, "This word can be hurtful to others. Let's try to use kinder language."

  Message: {{{text}}}

  Respond in JSON format.
`,
});

const analyzeMessageToxicityFlow = ai.defineFlow(
  {
    name: 'analyzeMessageToxicityFlow',
    inputSchema: AnalyzeMessageToxicityInputSchema,
    outputSchema: AnalyzeMessageToxicityOutputSchema,
  },
  async input => {
    const {output} = await toxicityAnalysisPrompt(input);
    return output!;
  }
);
