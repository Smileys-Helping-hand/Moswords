import { config } from 'dotenv';
config();

import '@/ai/flows/ai-auto-moderator.ts';
import '@/ai/flows/ai-summarize-thread.ts';
import '@/ai/flows/parse-flyer-to-tasks.ts';