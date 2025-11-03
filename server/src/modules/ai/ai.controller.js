import OpenAI from 'openai';
import { env } from '../../config/env.js';

const client = new OpenAI({ apiKey: env.openAiKey || 'mock-key' });

const ensureKey = () => {
  if (!env.openAiKey) {
    throw Object.assign(new Error('OpenAI key not configured'), { status: 503 });
  }
};

export const summarizeConversation = async (req, res) => {
  try {
    ensureKey();
    const { messages } = req.body;
    const prompt = `Summarize the following conversation in under 120 words:\n${messages.map((m) => `${m.author}: ${m.content}`).join('\n')}`;

    const completion = await client.responses.create({
      model: 'gpt-4o-mini',
      input: prompt
    });

    res.json({ summary: completion.output_text || 'Summary unavailable' });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

export const moderateMessage = async (req, res) => {
  try {
    ensureKey();
    const { content } = req.body;
    const moderation = await client.moderations.create({
      model: 'omni-moderation-latest',
      input: content
    });
    res.json({ moderation });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

export const smartReply = async (req, res) => {
  try {
    ensureKey();
    const { context } = req.body;
    const completion = await client.responses.create({
      model: 'gpt-4o-mini',
      input: `Suggest three helpful replies to the following chat:\n${context}`
    });

    res.json({ suggestions: completion.output_text?.split('\n').filter(Boolean) ?? [] });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};
