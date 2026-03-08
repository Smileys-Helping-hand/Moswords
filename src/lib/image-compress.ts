/**
 * Client-side image compression before upload.
 * Resizes to a max dimension and re-encodes as JPEG/WebP at reduced quality.
 * Non-image files are returned unchanged.
 *
 * Target: ≤ 1280px on the longest side, 0.82 quality — suitable for mobile chat
 * while keeping the image looking sharp on a phone screen.
 */

export interface CompressOptions {
  /** Max pixels on the longest side (default: 1280) */
  maxPx?: number;
  /** JPEG/WebP quality 0–1 (default: 0.82) */
  quality?: number;
  /** Output MIME type. Falls back to image/jpeg (default: 'image/webp') */
  mimeType?: 'image/webp' | 'image/jpeg';
}

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const { maxPx = 1280, quality = 0.82, mimeType = 'image/webp' } = opts;

  // Only compress raster images
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Down-scale only if larger than allowed
      if (width > maxPx || height > maxPx) {
        if (width >= height) {
          height = Math.round((height / width) * maxPx);
          width = maxPx;
        } else {
          width = Math.round((width / height) * maxPx);
          height = maxPx;
        }
      } else {
        // No resize needed – just re-encode at lower quality if it's large
        if (file.size < 200_000) {
          resolve(file);
          return;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // If compression made it larger, stick with the original
          if (blob.size > file.size) {
            resolve(file);
            return;
          }
          const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
          const baseName = file.name.replace(/\.[^.]+$/, '');
          resolve(new File([blob], `${baseName}.${ext}`, { type: mimeType }));
        },
        mimeType,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // If anything fails, upload the original
    };

    img.src = url;
  });
}
