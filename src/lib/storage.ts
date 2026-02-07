import { S3Client } from '@aws-sdk/client-s3';

// Cloudflare R2 Storage Client (S3-compatible)
// Uses singleton pattern to avoid creating multiple client instances

const globalForS3 = globalThis as unknown as {
  s3Client: S3Client | undefined;
};

export const s3Client =
  globalForS3.s3Client ??
  new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: `https://${process.env.S3_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForS3.s3Client = s3Client;
}

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'mediaspace';
export const R2_PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_R2_DOMAIN || '';

/**
 * Generate a public URL for an uploaded file
 */
export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_DOMAIN}/${key}`;
}
