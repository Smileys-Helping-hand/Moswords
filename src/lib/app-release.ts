import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

/**
 * The Android app lives privately in the media bucket under downloads/android/,
 * described by downloads/android/latest.json (written when a release is
 * uploaded). Downloads are short-lived signed links, so nothing in the bucket
 * has to be public.
 *
 * If S3 is unconfigured or unavailable, it falls back to a locally bundled APK
 * under public/downloads/Moswords.apk.
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

function getLocalRelease(): AndroidRelease | null {
  try {
    const localApk = path.join(process.cwd(), 'public', 'downloads', 'Moswords.apk');
    if (fs.existsSync(localApk)) {
      const stats = fs.statSync(localApk);
      const manifestPath = path.join(process.cwd(), 'public', 'downloads', 'latest.json');
      let manifest: Partial<AndroidRelease> = {};
      if (fs.existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch {}
      }
      return {
        versionName: manifest.versionName || '1.2.0',
        versionCode: manifest.versionCode || 3,
        key: '/downloads/Moswords.apk',
        fileName: 'Moswords.apk',
        size: stats.size,
        sha256: manifest.sha256 || '',
        minAndroid: manifest.minAndroid || '7.0',
        releasedAt: manifest.releasedAt || stats.mtime.toISOString(),
        notes: manifest.notes || [
          'Second Brain Ecosystem branding & UI upgrades',
          'High-importance push & local notification channel',
          'Samsung One UI & Android stability enhancements',
        ],
      };
    }
  } catch (err) {
    console.warn('Local APK fallback check:', (err as Error).message);
  }
  return null;
}

/** Latest release info (cached 5 minutes per instance), or null if none/unconfigured. */
export async function latestAndroidRelease(): Promise<AndroidRelease | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.release;

  let release: AndroidRelease | null = null;

  if (BUCKET) {
    try {
      const out = await client().send(new GetObjectCommand({ Bucket: BUCKET, Key: MANIFEST_KEY }));
      const parsed = JSON.parse((await out.Body?.transformToString()) || 'null');
      if (parsed?.key?.startsWith('downloads/android/') && parsed.versionName) {
        release = parsed;
      }
    } catch (error) {
      console.warn('android release manifest from S3:', (error as Error).message);
    }
  }

  // The bundled copy is a fallback, but whichever release is newer wins: a
  // newer APK committed to public/downloads must not hide behind an older S3 one
  // (that happened with 1.2.0 vs 1.1.0).
  const local = getLocalRelease();
  if (!release || (local && local.versionCode > release.versionCode)) {
    release = local ?? release;
  }

  cached = { at: Date.now(), release };
  return release;
}

/** A download link for the APK (either presigned S3 URL or local path). */
export async function androidDownloadUrl(release: AndroidRelease): Promise<string> {
  if (release.key.startsWith('/')) {
    return release.key;
  }
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
