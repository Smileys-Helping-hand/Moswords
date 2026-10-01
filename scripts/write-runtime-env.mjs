/**
 * Amplify passes console environment variables to the *build* only — the SSR
 * runtime never sees them. Without this step production ran with no
 * DATABASE_URL or NEXTAUTH_SECRET at all. Next.js loads `.env.production` at
 * runtime, so the build copies the variables the app needs into it.
 *
 * Only allowlisted names are written, and only names are logged.
 */
import { writeFileSync } from 'node:fs';

const ALLOW = [
  /^DATABASE_URL$/,
  /^NEXTAUTH_(SECRET|URL)$/,
  /^NEXT_PUBLIC_[A-Z0-9_]+$/,
  /^GOOGLE_(CLIENT_ID|CLIENT_SECRET|GENAI_API_KEY|API_KEY)$/,
  /^GEMINI_API_KEY$/,
  /^LIVEKIT_[A-Z_]+$/,
  /^MEDIA_(BUCKET|REGION|PUBLIC_URL)$/,
  /^SES_(REGION|FROM_EMAIL|ACCESS_KEY_ID|SECRET_ACCESS_KEY)$/,
  /^RESEND_(API_KEY|FROM_EMAIL)$/,
  /^MFA_ENCRYPTION_KEY$/,
  /^BLOB_READ_WRITE_TOKEN$/,
  /^NEXUS_(EMAIL|OS)_API_URL$/,
];

const lines = [];
const names = [];
for (const [name, value] of Object.entries(process.env)) {
  if (!value || name.startsWith('AWS_') || !ALLOW.some((re) => re.test(name))) continue;
  if (/[\r\n]/.test(value)) {
    console.warn(`[runtime-env] skipping ${name}: multi-line values are not supported`);
    continue;
  }
  // Double-quoted so `#` and spaces survive dotenv parsing.
  lines.push(`${name}="${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  names.push(name);
}

writeFileSync('.env.production', lines.join('\n') + '\n', { mode: 0o600 });
console.log(`[runtime-env] wrote ${names.length} variables: ${names.sort().join(', ')}`);

for (const required of ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']) {
  if (!process.env[required]) console.warn(`[runtime-env] WARNING: ${required} is not set — the app will not work`);
}
