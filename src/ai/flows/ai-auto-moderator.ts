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
  isToxic: z.boolean().describe('Whether the message is toxic or violates community guidelines.'),
  toxicityReason: z.string().describe('The reason why the message is considered toxic.'),
});
export type AnalyzeMessageToxicityOutput = z.infer<typeof AnalyzeMessageToxicityOutputSchema>;

export async function analyzeMessageToxicity(input: AnalyzeMessageToxicityInput): Promise<AnalyzeMessageToxicityOutput> {
  return analyzeMessageToxicityFlow(input);
}

const toxicityAnalysisPrompt = ai.definePrompt({
  name: 'toxicityAnalysisPrompt',
  input: {schema: AnalyzeMessageToxicityInputSchema},
  output: {schema: AnalyzeMessageToxicityOutputSchema},
  prompt: `You are an AI sentinel responsible for detecting toxic messages and messages that violate community guidelines.

  Analyze the following message and determine if it is toxic or violates community guidelines. If it does, explain why.

  Message: {{{text}}}

  Respond in JSON format with the isToxic boolean and toxicityReason string.
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
