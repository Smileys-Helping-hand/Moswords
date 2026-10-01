import { NextRequest, NextResponse } from 'next/server';
import { androidDownloadUrl, latestAndroidRelease } from '@/lib/app-release';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/download/android        → 302 to a short-lived link for the latest APK
 * GET /api/download/android?info=1 → { release } (version, size, checksum, notes)
 * Public: anyone may download the app.
 */
export async function GET(request: NextRequest) {
  const release = await latestAndroidRelease();
  if (!release) {
    return NextResponse.json({ error: 'The Android app is not available right now' }, { status: 503 });
  }

  if (request.nextUrl.searchParams.has('info')) {
    const { key: _key, ...info } = release;
    return NextResponse.json({ release: info }, { headers: { 'Cache-Control': 'public, max-age=300' } });
  }

  try {
    return NextResponse.redirect(await androidDownloadUrl(release), {
      status: 302,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('android download link:', (error as Error).message);
    return NextResponse.json({ error: 'Could not prepare the download. Try again.' }, { status: 502 });
  }
}
