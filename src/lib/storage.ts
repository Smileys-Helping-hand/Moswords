import crypto from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Media storage.
 *
 * Production: an S3 bucket (MEDIA_BUCKET) in the same AWS account as the
 * Amplify app. Credentials come from the Amplify compute role through the
 * default AWS provider chain — no static keys.
 * Fallback: Vercel Blob when BLOB_READ_WRITE_TOKEN is set and S3 isn't.
 *
 * Keys are random UUIDs, so public URLs are unguessable. Anything that isn't
 * image/video/audio is served as a download, never rendered, so the bucket
 * can't be used to host pages.
 */
const BUCKET = process.env.MEDIA_BUCKET || '';
const REGION = process.env.MEDIA_REGION || process.env.AWS_REGION || 'eu-west-2';
const PUBLIC_BASE = (process.env.MEDIA_PUBLIC_URL || (BUCKET ? `https://${BUCKET}.s3.${REGION}.amazonaws.com` : '')).replace(/\/+$/, '');

/** Hosts whose URLs we issued (S3 now, Vercel Blob / R2 for older media). */
const LEGACY_HOSTS = ['aekzijjfjqjnzyjo.public.blob.vercel-storage.com'];

let s3: S3Client | null = null;
function client() {
  s3 ??= new S3Client({ region: REGION });
  return s3;
}

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // direct-to-S3 uploads
export const MAX_PROXY_UPLOAD_BYTES = 4.5 * 1024 * 1024; // through the API (Lambda body limit)

export function storageBackend(): 's3' | 'vercel-blob' | 'none' {
  if (BUCKET) return 's3';
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'vercel-blob';
  return 'none';
}

function inlineSafe(contentType: string) {
  return /^(image|video|audio)\//.test(contentType) && contentType !== 'image/svg+xml';
}

export function mediaKey(prefix: 'uploads' | 'stickers' | 'avatars' | 'statuses', filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9.-]/g, '_').slice(-60) || 'file';
  return `${prefix}/${crypto.randomUUID()}-${safe}`;
}

/** Upload bytes from the server. Returns the public URL. */
export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<{ url: string }> {
  const type = contentType || 'application/octet-stream';
  const backend = storageBackend();

  if (backend === 's3') {
    await client().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: type,
        CacheControl: 'public, max-age=31536000, immutable',
        ...(inlineSafe(type) ? {} : { ContentDisposition: 'attachment' }),
      }),
    );
    return { url: `${PUBLIC_BASE}/${key}` };
  }

  if (backend === 'vercel-blob') {
    const { put } = await import('@vercel/blob');
    const blob = await put(key, Buffer.from(body), { access: 'public', contentType: type, addRandomSuffix: false });
    return { url: blob.url };
  }

  throw new Error('Media storage is not configured (set MEDIA_BUCKET)');
}

/**
 * Presigned PUT so the browser uploads straight to S3 — no Lambda body limit,
 * no server bandwidth. Only for image/video/audio (other types go through
 * /api/upload, which forces a download disposition). The client must send the
 * same Content-Type header.
 */
export async function presignUpload(key: string, contentType: string) {
  if (storageBackend() !== 's3' || !inlineSafe(contentType)) return null;
  const uploadUrl = await getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
  return { uploadUrl, url: `${PUBLIC_BASE}/${key}`, headers: { 'Content-Type': contentType } };
}

/** True when a URL points at media this app stored. */
export function isOwnMediaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (PUBLIC_BASE && url.startsWith(`${PUBLIC_BASE}/`)) return true;
    return LEGACY_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

/** @deprecated kept for older imports; use isOwnMediaUrl. */
export const isBlobUrl = isOwnMediaUrl;
