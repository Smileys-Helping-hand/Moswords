/**
 * Optional AI toxicity check for plaintext messages.
 *
 * Skipped outright when no Gemini key is configured, and capped at 1.5 s
 * otherwise, so moderation can never make sending feel slow. Always fails open.
 */
const HAS_AI_KEY = !!(
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY
);

export async function moderateText(text: string): Promise<{ isToxic: boolean; reason?: string }> {
  if (!HAS_AI_KEY || !text.trim()) return { isToxic: false };
  try {
    const { analyzeMessageToxicity } = await import('@/ai/flows/ai-auto-moderator');
    const result = await Promise.race([
      analyzeMessageToxicity({ text }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    if (!result) return { isToxic: false };
    return { isToxic: !!result.isToxic, reason: result.toxicityReason };
  } catch {
    return { isToxic: false };
  }
}
