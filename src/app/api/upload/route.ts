import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { MAX_PROXY_UPLOAD_BYTES, mediaKey, putObject } from '@/lib/storage';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload (multipart, field "file") — upload through the server.
 * Capped by the Lambda request limit; large photos/videos should use
 * /api/upload/presign (see src/lib/upload-client.ts, which picks automatically).
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const limit = await rateLimit(`upload:${auth.user.id}`, 60, 60 * 10);
  if (!limit.allowed) return tooManyRequests(600);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_PROXY_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File too large. Maximum size is 4.5MB.' }, { status: 400 });
    }

    const key = mediaKey('uploads', file.name);
    const { url } = await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type);

    let mediaType: 'image' | 'video' | 'audio' | 'file' = 'file';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';

    return NextResponse.json({
      url,
      key,
      filename: file.name,
      size: file.size,
      type: mediaType,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('Upload error:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
