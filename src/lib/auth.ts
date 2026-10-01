import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from './db';
import { users } from './schema';
import { sql } from 'drizzle-orm';
import { normalizeEmail } from './validate';
import { rateLimit, rateLimitCount, clearRateLimit, clientIp } from './rate-limit';
import bcrypt from 'bcryptjs';
import { isAccountBlocked } from './account-status';

const isProduction = process.env.NODE_ENV === 'production';
const useSecureCookies = isProduction;
const sameSitePolicy = isProduction ? 'none' : 'lax';
const cookiePrefix = useSecureCookies ? '__Secure-' : '';

const DAY = 24 * 60 * 60;
const MAX_DAILY_FAILURES = 20;

const providers: any[] = [
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email or username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials, req) {
      try {
        // The "email" field also accepts a username (e.g. the owner's "mraaziqp").
        const identifier = normalizeEmail(credentials?.email).replace(/^@(?=[^@]+$)/, '');
        const password = credentials?.password;
        if (!identifier || !password || identifier.length > 254) return null;
        const byUsername = !identifier.includes('@');

        // Throttle guessing per account and per client IP.
        const ip = clientIp(new Headers((req?.headers as Record<string, string>) || {}));
        const [perAccount, perIp] = await Promise.all([
          rateLimit(`login:acct:${identifier}`, 10, 15 * 60),
          rateLimit(`login:ip:${ip}`, 50, 15 * 60),
        ]);
        if (!perAccount.allowed || !perIp.allowed) {
          throw new Error('Too many sign-in attempts. Try again in 15 minutes.');
        }

        // Emails were historically stored exactly as typed, so match case-insensitively.
        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            password: users.password,
            name: users.name,
            displayName: users.displayName,
            image: users.image,
            photoURL: users.photoURL,
            suspendedAt: users.suspendedAt,
          })
          .from(users)
          .where(byUsername ? sql`lower(${users.username}) = ${identifier}` : sql`lower(${users.email}) = ${identifier}`)
          .limit(1);

        if (!user?.password) return null;

        // Wrong passwords per account per day are capped (on top of the 15-minute
        // limit), so even a short password can't be brute-forced. A password
        // reset clears the counter.
        const failKey = `login:fail:${user.id}`;
        if ((await rateLimitCount(failKey, DAY)) >= MAX_DAILY_FAILURES) {
          throw new Error('Too many sign-in attempts on this account today. Reset your password to unlock it.');
        }
        if (!(await bcrypt.compare(password, user.password))) {
          await rateLimit(failKey, MAX_DAILY_FAILURES, DAY);
          return null;
        }
        void clearRateLimit(failKey);
        if (user.suspendedAt) throw new Error('This account has been suspended. Contact support if you think this is a mistake.');

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.name,
          image: user.photoURL || user.image,
        };
      } catch (error) {
        // Rate-limit errors surface to the login form; everything else is a plain failure.
        if (error instanceof Error && /^(Too many|This account has been suspended)/.test(error.message)) throw error;
        console.error('Authorization error:', (error as Error).message);
        return null;
      }
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.unshift(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const authOptions: NextAuthOptions = {
  // Note: DrizzleAdapter is not compatible with CredentialsProvider + JWT sessions
  // adapter: DrizzleAdapter(db) as any,
  providers,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: sameSitePolicy,
        path: '/',
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        httpOnly: false,
        sameSite: sameSitePolicy,
        path: '/',
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: sameSitePolicy,
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.authAt = Date.now(); // compared with users.password_changed_at
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      // Suspended or deleted accounts, and sessions older than the last password
      // change, end on the next request (checked at most once a minute per instance).
      if (token.id && (await isAccountBlocked(token.id as string, Number(token.authAt) || 0))) {
        return { expires: session.expires };
      }
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
} as NextAuthOptions;
