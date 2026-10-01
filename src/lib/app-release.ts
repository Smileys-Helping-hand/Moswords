import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * The Android app lives privately in the media bucket under downloads/android/,
 * described by downloads/android/latest.json (written when a release is
 * uploaded). Downloads are short-lived signed links, so nothing in the bucket
 * has to be public.
 */
export interface AndroidRelease {
  versionName: string;
  versionCode: number;
  key: string;
  fileName: string;
  size: number;
  sha256: string;
  minAndroid: string;
  releasedAt: string;
  notes?: string[];
}

const BUCKET = process.env.MEDIA_BUCKET || '';
const REGION = process.env.MEDIA_REGION || process.env.AWS_REGION || 'eu-west-2';
const MANIFEST_KEY = 'downloads/android/latest.json';
const TTL_MS = 5 * 60_000;

let s3: S3Client | null = null;
let cached: { at: number; release: AndroidRelease | null } | null = null;

function client() {
  s3 ??= new S3Client({ region: REGION });
  return s3;
}

/** Latest release info (cached 5 minutes per instance), or null if none/unconfigured. */
export async function latestAndroidRelease(): Promise<AndroidRelease | null> {
  if (!BUCKET) return null;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.release;
  let release: AndroidRelease | null = null;
  try {
    const out = await client().send(new GetObjectCommand({ Bucket: BUCKET, Key: MANIFEST_KEY }));
    const parsed = JSON.parse((await out.Body?.transformToString()) || 'null');
    if (parsed?.key?.startsWith('downloads/android/') && parsed.versionName) release = parsed;
  } catch (error) {
    console.error('android release manifest:', (error as Error).message);
  }
  cached = { at: Date.now(), release };
  return release;
}

/** A 10-minute download link for the APK. */
export async function androidDownloadUrl(release: AndroidRelease): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: release.key,
      ResponseContentType: 'application/vnd.android.package-archive',
      ResponseContentDisposition: `attachment; filename="${release.fileName.replace(/[^\w.-]/g, '')}"`,
    }),
    { expiresIn: 600 },
  );
}
