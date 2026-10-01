'use client';

import type Sodium from 'libsodium-wrappers';

// libsodium is ~900 KB (WASM inlined as base64). Importing it statically put it
// in the first bundle of every chat screen, which made the app slow to open on
// phones. It now loads on first use; every export below awaits initSodium().
let sodium: typeof Sodium;
let loading: Promise<void> | null = null;

export interface E2EKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
}

export async function initSodium(): Promise<void> {
  loading ??= import('libsodium-wrappers')
    .then(async (mod) => {
      const lib = ((mod as { default?: typeof Sodium }).default ?? mod) as typeof Sodium;
      await lib.ready;
      sodium = lib;
    })
    .catch((error) => {
      loading = null; // let the next call retry (e.g. after a network blip)
      throw error;
    });
  await loading;
}

export function encodeBase64(data: Uint8Array): string {
  return sodium.to_base64(data, sodium.base64_variants.ORIGINAL);
}

export function decodeBase64(data: string): Uint8Array {
  return sodium.from_base64(data, sodium.base64_variants.ORIGINAL);
}

export async function generateKeyPair(): Promise<E2EKeyPair> {
  await initSodium();
  const keyPair = sodium.crypto_box_keypair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    privateKey: encodeBase64(keyPair.privateKey),
  };
}

export async function generateConversationKey(): Promise<string> {
  await initSodium();
  const key = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
  return encodeBase64(key);
}

export async function encryptText(plaintext: string, keyB64: string): Promise<EncryptedPayload> {
  await initSodium();
  const key = decodeBase64(keyB64);
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const message = sodium.from_string(plaintext);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(message, null, null, nonce, key);
  return {
    ciphertext: encodeBase64(ciphertext),
    nonce: encodeBase64(nonce),
  };
}

export async function decryptText(payload: EncryptedPayload, keyB64: string): Promise<string | null> {
  await initSodium();
  try {
    const key = decodeBase64(keyB64);
    const nonce = decodeBase64(payload.nonce);
    const ciphertext = decodeBase64(payload.ciphertext);
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ciphertext, null, nonce, key);
    return sodium.to_string(plaintext);
  } catch {
    return null;
  }
}

export async function encryptBytes(bytes: Uint8Array, keyB64: string): Promise<{ ciphertext: Uint8Array; nonce: string }>{
  await initSodium();
  const key = decodeBase64(keyB64);
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(bytes, null, null, nonce, key);
  return {
    ciphertext,
    nonce: encodeBase64(nonce),
  };
}

export async function decryptBytes(ciphertext: Uint8Array, nonceB64: string, keyB64: string): Promise<Uint8Array | null> {
  await initSodium();
  try {
    const key = decodeBase64(keyB64);
    const nonce = decodeBase64(nonceB64);
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ciphertext, null, nonce, key);
    return plaintext;
  } catch {
    return null;
  }
}

export async function sealKeyForRecipient(keyB64: string, recipientPublicKeyB64: string): Promise<string> {
  await initSodium();
  const key = decodeBase64(keyB64);
  const recipientPublicKey = decodeBase64(recipientPublicKeyB64);
  const sealed = sodium.crypto_box_seal(key, recipientPublicKey);
  return encodeBase64(sealed);
}

export async function openSealedKey(sealedB64: string, recipientPublicKeyB64: string, recipientPrivateKeyB64: string): Promise<string | null> {
  await initSodium();
  try {
    const sealed = decodeBase64(sealedB64);
    const publicKey = decodeBase64(recipientPublicKeyB64);
    const privateKey = decodeBase64(recipientPrivateKeyB64);
    const opened = sodium.crypto_box_seal_open(sealed, publicKey, privateKey);
    return encodeBase64(opened);
  } catch {
    return null;
  }
}
