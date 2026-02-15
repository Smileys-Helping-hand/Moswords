'use client';

import {
  encryptText,
  decryptText,
  encryptBytes,
  decryptBytes,
  generateConversationKey,
  generateKeyPair,
  openSealedKey,
  sealKeyForRecipient,
} from './e2e';
import {
  getConversationKey,
  getDeviceId,
  getDeviceKeyPair,
  setConversationKey,
  setDeviceId,
  setDeviceKeyPair,
} from './e2e-storage';

export type ConversationScope = 'channel' | 'dm' | 'group';

export function getDmScopeId(userA: string, userB: string): string {
  return [userA, userB].sort().join(':');
}

interface DeviceKeyRecord {
  deviceId: string;
  publicKey: string;
  userId: string;
}

export async function ensureDeviceIdentity(): Promise<{ deviceId: string; publicKey: string; privateKey: string }> {
  let deviceId = await getDeviceId();
  let keyPair = await getDeviceKeyPair();

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    await setDeviceId(deviceId);
  }

  if (!keyPair) {
    keyPair = await generateKeyPair();
    await setDeviceKeyPair(keyPair);
  }

  await registerDeviceKey(deviceId, keyPair.publicKey);

  return {
    deviceId,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

export async function registerDeviceKey(deviceId: string, publicKey: string): Promise<void> {
  await fetch('/api/keys/device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, publicKey }),
  });
}

export async function fetchDeviceKeys(userIds: string[]): Promise<DeviceKeyRecord[]> {
  if (userIds.length === 0) return [];
  const params = new URLSearchParams();
  params.set('userIds', userIds.join(','));
  const response = await fetch(`/api/keys/device?${params.toString()}`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.keys || [];
}

async function fetchConversationKey(scope: ConversationScope, scopeId: string, deviceId: string): Promise<string | null> {
  const params = new URLSearchParams();
  params.set('scope', scope);
  params.set('scopeId', scopeId);
  params.set('deviceId', deviceId);

  const response = await fetch(`/api/keys/conversation?${params.toString()}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.encryptedKey || null;
}

async function saveConversationKeys(scope: ConversationScope, scopeId: string, entries: Array<{ deviceId: string; encryptedKey: string }>): Promise<void> {
  await fetch('/api/keys/conversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, scopeId, entries }),
  });
}

export async function ensureConversationKey(scope: ConversationScope, scopeId: string, recipientUserIds: string[]): Promise<string> {
  const cached = await getConversationKey(scope, scopeId);
  if (cached) return cached;

  const { deviceId, publicKey, privateKey } = await ensureDeviceIdentity();
  const encryptedKey = await fetchConversationKey(scope, scopeId, deviceId);

  if (encryptedKey) {
    const key = await openSealedKey(encryptedKey, publicKey, privateKey);
    if (key) {
      await setConversationKey(scope, scopeId, key);
      return key;
    }
  }

  const newKey = await generateConversationKey();
  const deviceKeys = await fetchDeviceKeys(recipientUserIds);
  const entries: Array<{ deviceId: string; encryptedKey: string }> = [];

  for (const record of deviceKeys) {
    const sealed = await sealKeyForRecipient(newKey, record.publicKey);
    entries.push({ deviceId: record.deviceId, encryptedKey: sealed });
  }

  // Ensure sender device also has a stored copy
  if (!entries.find((entry) => entry.deviceId === deviceId)) {
    const sealed = await sealKeyForRecipient(newKey, publicKey);
    entries.push({ deviceId, encryptedKey: sealed });
  }

  await saveConversationKeys(scope, scopeId, entries);
  await setConversationKey(scope, scopeId, newKey);

  return newKey;
}

export async function encryptMessage(scope: ConversationScope, scopeId: string, recipientUserIds: string[], plaintext: string) {
  const key = await ensureConversationKey(scope, scopeId, recipientUserIds);
  const encrypted = await encryptText(plaintext, key);
  return {
    ...encrypted,
    isEncrypted: true,
  };
}

export async function decryptMessage(scope: ConversationScope, scopeId: string, ciphertext: string, nonce: string): Promise<string | null> {
  const key = await getConversationKey(scope, scopeId);
  if (!key) return null;
  return decryptText({ ciphertext, nonce }, key);
}

export async function encryptFile(scope: ConversationScope, scopeId: string, recipientUserIds: string[], file: File): Promise<{ file: File; mediaNonce: string }>{
  const key = await ensureConversationKey(scope, scopeId, recipientUserIds);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const encrypted = await encryptBytes(bytes, key);
  const encryptedBlob = new Blob([encrypted.ciphertext as any], { type: 'application/octet-stream' });
  const encryptedFile = new File([encryptedBlob], file.name, { type: 'application/octet-stream' });
  return {
    file: encryptedFile,
    mediaNonce: encrypted.nonce,
  };
}

export async function decryptFile(scope: ConversationScope, scopeId: string, ciphertext: ArrayBuffer, nonce: string): Promise<Blob | null> {
  const key = await getConversationKey(scope, scopeId);
  if (!key) return null;
  const plaintext = await decryptBytes(new Uint8Array(ciphertext), nonce, key);
  if (!plaintext) return null;
  return new Blob([plaintext as any]);
}
