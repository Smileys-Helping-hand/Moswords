/**
 * Postgres error codes, read through drizzle's wrapper (DrizzleQueryError keeps
 * the driver error in `.cause`).
 */
function pgCode(error: unknown): string | undefined {
  let e: unknown = error;
  for (let depth = 0; e && depth < 4; depth++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}

/** A referenced row (user, group, …) doesn't exist. */
export const isForeignKeyViolation = (error: unknown) => pgCode(error) === '23503';

/** A unique constraint was hit (e.g. duplicate friend request). */
export const isUniqueViolation = (error: unknown) => pgCode(error) === '23505';
