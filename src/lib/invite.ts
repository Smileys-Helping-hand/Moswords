'use client';

/** Your personal invite link: opening it (and signing up if needed) lands on your profile with "Add friend". */
export function inviteLink(userId: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://awehchat.co.za');
  return `${base.replace(/\/+$/, '')}/add/${userId}`;
}

/** Share via the phone's share sheet when available, otherwise copy. Returns how it was shared. */
export async function shareInvite(userId: string, name?: string | null): Promise<'shared' | 'copied' | 'failed'> {
  const url = inviteLink(userId);
  const text = `${name ? `${name} invited you` : "You're invited"} to chat on Moswords`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Join me on Moswords', text, url });
      return 'shared';
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') return 'failed'; // user closed the share sheet
  }
  try {
    await navigator.clipboard.writeText(`${text}: ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
