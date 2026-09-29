/**
 * Canonical public origin of the app. Everything that builds an absolute URL
 * (emails, integration docs, mobile shells) should go through here so the
 * domain lives in exactly one place.
 */
export const SITE_DOMAIN = 'awehchat.co.za';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  `https://${SITE_DOMAIN}`
).replace(/\/+$/, '');
