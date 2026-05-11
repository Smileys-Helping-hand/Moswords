import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { put } from '@/lib/storage';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Vercel server uploads are limited to 4.5 MB (Next.js serverless body limit).
// For larger files, switch to Vercel Blob client uploads.
const MAX_FILE_SIZE = 4.5 * 1024 * 1024;

// Allowed MIME types
// NOTE: Allow all file types for file sharing; size limit still enforced.
const ALLOWED_TYPES: string[] = [];

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 4.5MB.' },
        { status: 400 }
      );
    }

    // Validate file type
    if (ALLOWED_TYPES.length > 0 && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const uniqueId = crypto.randomUUID();
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);
    const key = `uploads/${uniqueId}-${sanitizedName}`;

    // Upload to Vercel Blob
    const blob = await put(key, file.stream(), {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
    });

    const url = blob.url;

    // Determine media type
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
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
