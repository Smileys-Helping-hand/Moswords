import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { MAX_UPLOAD_BYTES, mediaKey, presignUpload } from '@/lib/storage';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload/presign { filename, contentType, size }
 * → { uploadUrl, url, headers } for a direct browser→S3 PUT (images, video,
 * audio; up to 50 MB), or 204 when direct upload isn't available and the
 * client should fall back to POST /api/upload.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const limit = await rateLimit(`upload:${auth.user.id}`, 60, 60 * 10);
  if (!limit.allowed) return tooManyRequests(600);

  const { filename, contentType, size } = await request.json().catch(() => ({}));
  if (typeof filename !== 'string' || typeof contentType !== 'string' || typeof size !== 'number') {
    return NextResponse.json({ error: 'filename, contentType and size are required' }, { status: 400 });
  }
  if (size <= 0 || size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 });
  }

  const signed = await presignUpload(mediaKey('uploads', filename), contentType);
  if (!signed) return new NextResponse(null, { status: 204 });
  return NextResponse.json(signed);
}
