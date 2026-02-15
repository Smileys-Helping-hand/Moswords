'use client';

import { get, set, del } from 'idb-keyval';
import type { E2EKeyPair } from './e2e';

const DEVICE_ID_KEY = 'e2e_device_id';
const DEVICE_KEYPAIR_KEY = 'e2e_device_keypair';
const CONVERSATION_KEY_PREFIX = 'e2e_conv_key:';

export async function getDeviceId(): Promise<string | null> {
  return (await get(DEVICE_ID_KEY)) || null;
}

export async function setDeviceId(deviceId: string): Promise<void> {
  await set(DEVICE_ID_KEY, deviceId);
}

export async function getDeviceKeyPair(): Promise<E2EKeyPair | null> {
  return (await get(DEVICE_KEYPAIR_KEY)) || null;
}

export async function setDeviceKeyPair(keyPair: E2EKeyPair): Promise<void> {
  await set(DEVICE_KEYPAIR_KEY, keyPair);
}

export async function getConversationKey(scope: string, scopeId: string): Promise<string | null> {
  return (await get(`${CONVERSATION_KEY_PREFIX}${scope}:${scopeId}`)) || null;
}

export async function setConversationKey(scope: string, scopeId: string, keyB64: string): Promise<void> {
  await set(`${CONVERSATION_KEY_PREFIX}${scope}:${scopeId}`, keyB64);
}

export async function clearConversationKey(scope: string, scopeId: string): Promise<void> {
  await del(`${CONVERSATION_KEY_PREFIX}${scope}:${scopeId}`);
}
