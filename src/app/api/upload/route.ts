import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME, getPublicUrl } from '@/lib/storage';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
        { error: 'File too large. Maximum size is 10MB.' },
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
    const fileExtension = file.name.split('.').pop() || 'bin';
    const uniqueId = crypto.randomUUID();
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);
    const key = `uploads/${uniqueId}-${sanitizedName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      // Note: R2 doesn't support ACLs, public access is configured at bucket level
    });

    await s3Client.send(command);

    // Generate public URL
    const url = getPublicUrl(key);

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
