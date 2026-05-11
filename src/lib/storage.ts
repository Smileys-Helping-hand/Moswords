export { put, del } from '@vercel/blob';

/** Public hostname for this Vercel Blob store */
const BLOB_STORE_HOST = 'aekzijjfjqjnzyjo.public.blob.vercel-storage.com';

/** Returns true when a URL was issued by this Vercel Blob store */
export function isBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname === BLOB_STORE_HOST;
  } catch {
    return false;
  }
}
