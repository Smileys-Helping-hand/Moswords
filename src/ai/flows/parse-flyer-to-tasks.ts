'use server';

/**
 * @fileOverview A multimodal AI agent that parses school flyers into actionable tasks.
 * 
 * - parseFlyerToTasks - A function that uses Gemini 1.5 Flash to extract tasks from an image.
 * - ParseFlyerToTasksInput - The input type for the parseFlyerToTasks function.
 * - ParseFlyerToTasksOutput - The return type for the parseFlyerToTasks function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TaskSchema = z.object({
    title: z.string().describe("The specific, actionable task extracted from the flyer (e.g., 'Return permission slip', 'Buy cookies for bake sale')."),
    dueDate: z.string().optional().describe("The due date for the task in YYYY-MM-DD format if available."),
    pointsValue: z.number().describe("Assign a point value based on effort. Simple reminders are 10, tasks requiring action are 25, and events are 50."),
});

const ParseFlyerToTasksInputSchema = z.object({
  flyerImageUrl: z.string().describe("The data URI of the flyer image to parse. It must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ParseFlyerToTasksInput = z.infer<typeof ParseFlyerToTasksInputSchema>;

const ParseFlyerToTasksOutputSchema = z.object({
  tasks: z.array(TaskSchema).describe('An array of tasks extracted from the flyer.'),
});
export type ParseFlyerToTasksOutput = z.infer<typeof ParseFlyerToTasksOutputSchema>;

export async function parseFlyerToTasks(input: ParseFlyerToTasksInput): Promise<ParseFlyerToTasksOutput> {
  return parseFlyerToTasksFlow(input);
}

const flyerParserPrompt = ai.definePrompt({
  name: 'flyerParserPrompt',
  input: { schema: ParseFlyerToTasksInputSchema },
  output: { schema: ParseFlyerToTasksOutputSchema },
  prompt: `You are an intelligent assistant for a family productivity app. Your job is to analyze images of school flyers and extract actionable tasks for the family.

  Analyze the image provided and identify any key events, deadlines, or required items. For each item, create a distinct task.

  - **Dates are critical.** Extract any due dates and format them as YYYY-MM-DD.
  - **Be specific.** Instead of "School event", use "Picture Day" or "Field Trip to Museum".
  - **Assign points.** Use your judgment to assign points: 10 for simple reminders, 25 for tasks that require an action (like signing a form), and 50 for attending an event.
  - If no actionable tasks are found, return an empty array.

  Flyer Image:
  {{media url=flyerImageUrl}}

  Respond in JSON format.`,
});

const parseFlyerToTasksFlow = ai.defineFlow(
  {
    name: 'parseFlyerToTasksFlow',
    inputSchema: ParseFlyerToTasksInputSchema,
    outputSchema: ParseFlyerToTasksOutputSchema,
  },
  async input => {
    const { output } = await flyerParserPrompt(input);
    return output!;
  }
);