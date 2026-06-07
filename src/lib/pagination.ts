/**
 * Cursor-based pagination utilities for efficient database queries.
 * Reduces memory usage and improves performance for large datasets.
 */

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Create cursor from item ID for pagination
 */
export function createCursor(itemId: string): string {
  return Buffer.from(itemId).toString('base64');
}

/**
 * Decode cursor to get item ID
 */
export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

/**
 * Create paginated response with next cursor
 */
export function createPaginatedResponse<T extends { id: string }>(
  items: T[],
  limit: number
): PaginatedResponse<T> {
  const hasMore = items.length > limit;
  const result = items.slice(0, limit);
  const nextCursor = hasMore && result.length > 0 ? createCursor(result[result.length - 1].id) : undefined;

  return {
    items: result,
    nextCursor,
    hasMore,
  };
}

/**
 * Request caching key generator for API calls
 */
export function generateCacheKey(
  baseKey: string,
  params: Record<string, any>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return `${baseKey}:${sortedParams}`;
}
