'use client';

export type MediaKind = 'image' | 'video' | 'audio' | 'file';

export function mediaKindOf(mime: string): MediaKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

/**
 * Upload a file and return its public URL.
 * Photos/videos/audio go straight to S3 via a presigned URL (up to 50 MB, no
 * server hop); everything else — or any environment without S3 — falls back
 * to the server upload route.
 */
export async function uploadFile(file: File): Promise<{ url: string; mediaType: MediaKind }> {
  const mediaType = mediaKindOf(file.type);

  if (mediaType !== 'file') {
    const presign = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
    });
    if (presign.status === 200) {
      const { uploadUrl, url, headers } = await presign.json();
      const put = await fetch(uploadUrl, { method: 'PUT', headers, body: file });
      if (!put.ok) throw new Error('Upload failed');
      return { url, mediaType };
    }
    if (presign.status !== 204) {
      const data = await presign.json().catch(() => ({}));
      throw new Error(data.error || 'Upload failed');
    }
  }

  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return { url: data.url, mediaType };
}
