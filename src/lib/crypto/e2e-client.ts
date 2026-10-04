'use client';

import { decryptBytes, decryptText, openSealedKey } from './e2e';
import { getConversationKey, getDeviceId, getDeviceKeyPair, setConversationKey } from './e2e-storage';

/**
 * Read-only support for messages that were end-to-end encrypted in the past.
 *
 * Since October 2026 (owner's decision) new messages in DMs, groups and
 * channels are sent as ordinary messages, protected by HTTPS in transit and
 * stored on the server, so every member can read them instantly on every
 * device. End-to-end encryption was dropped because conversation keys were
 * only ever sealed to the devices that existed when a chat's key was made:
 * other members, new phones and the Android app (a separate device from the
 * browser) never got the key, and a member without one generated a NEW key,
 * so people in the same group could not read each other.
 *
 * Old encrypted messages still open on any device that already holds the key
 * (cached locally, or sealed to this device on the server). Nothing here ever
 * creates or uploads a key.
 */

export type ConversationScope = 'channel' | 'dm' | 'group';

/** Shown for an old encrypted message whose key this device never received. */
export const LEGACY_ENCRYPTED_TEXT = '🔒 Older encrypted message';

export function getDmScopeId(userA: string, userB: string): string {
  return [userA, userB].sort().join(':');
}

/** Encrypted only if the server says so — never guessed from the text itself. */
export function isEncryptedMessage(message: { isEncrypted?: boolean | null; contentNonce?: string | null }): boolean {
  return !!message.isEncrypted || !!message.contentNonce;
}

// One lookup per conversation per page load, shared by every message in it.
const keyLookups = new Map<string, Promise<string | null>>();

/** The existing key for a conversation on this device, or null. Never generates one. */
export function loadConversationKey(scope: ConversationScope, scopeId: string): Promise<string | null> {
  const id = `${scope}:${scopeId}`;
  let lookup = keyLookups.get(id);
  if (!lookup) {
    lookup = (async () => {
      const cached = await getConversationKey(scope, scopeId);
      if (cached) return cached;

      const [deviceId, keyPair] = await Promise.all([getDeviceId(), getDeviceKeyPair()]);
      if (!deviceId || !keyPair) return null; // this device never had keys

      const params = new URLSearchParams({ scope, scopeId, deviceId });
      const response = await fetch(`/api/keys/conversation?${params}`);
      if (!response.ok) return null;
      const { encryptedKey } = (await response.json()) as { encryptedKey?: string | null };
      if (!encryptedKey) return null;

      const key = await openSealedKey(encryptedKey, keyPair.publicKey, keyPair.privateKey);
      if (key) await setConversationKey(scope, scopeId, key);
      return key;
    })().catch(() => null);
    keyLookups.set(id, lookup);
  }
  return lookup;
}

/** Plain text of an old encrypted message, or null when this device can't open it. */
export async function decryptMessage(scope: ConversationScope, scopeId: string, ciphertext: string, nonce: string): Promise<string | null> {
  const key = await loadConversationKey(scope, scopeId);
  if (!key) return null;
  return decryptText({ ciphertext, nonce }, key).catch(() => null);
}

/** Readable text for any message: plain ones untouched, old encrypted ones opened when possible. */
export async function readableContent(
  scope: ConversationScope,
  scopeId: string,
  message: { content: string; isEncrypted?: boolean | null; contentNonce?: string | null },
): Promise<string> {
  if (!isEncryptedMessage(message)) return message.content;
  if (!message.contentNonce) return LEGACY_ENCRYPTED_TEXT;
  return (await decryptMessage(scope, scopeId, message.content, message.contentNonce)) ?? LEGACY_ENCRYPTED_TEXT;
}

/** Media from an old encrypted message, or null when this device can't open it. */
export async function decryptFile(scope: ConversationScope, scopeId: string, ciphertext: ArrayBuffer, nonce: string): Promise<Blob | null> {
  const key = await loadConversationKey(scope, scopeId);
  if (!key) return null;
  const plaintext = await decryptBytes(new Uint8Array(ciphertext), nonce, key);
  if (!plaintext) return null;
  return new Blob([plaintext as BlobPart]);
}
