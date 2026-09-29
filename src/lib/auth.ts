import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from './db';
import { users } from './schema';
import { sql } from 'drizzle-orm';
import { normalizeEmail } from './validate';
import { rateLimit, clientIp } from './rate-limit';
import bcrypt from 'bcryptjs';

const isProduction = process.env.NODE_ENV === 'production';
const useSecureCookies = isProduction;
const sameSitePolicy = isProduction ? 'none' : 'lax';
const cookiePrefix = useSecureCookies ? '__Secure-' : '';

const providers: any[] = [
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials, req) {
      try {
        const email = normalizeEmail(credentials?.email);
        const password = credentials?.password;
        if (!email || !password) return null;

        // Throttle guessing per account and per client IP.
        const ip = clientIp(new Headers((req?.headers as Record<string, string>) || {}));
        const [perAccount, perIp] = await Promise.all([
          rateLimit(`login:acct:${email}`, 10, 15 * 60),
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
          })
          .from(users)
          .where(sql`lower(${users.email}) = ${email}`)
          .limit(1);

        if (!user?.password) return null;
        if (!(await bcrypt.compare(password, user.password))) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.name,
          image: user.photoURL || user.image,
        };
      } catch (error) {
        // Rate-limit errors surface to the login form; everything else is a plain failure.
        if (error instanceof Error && error.message.startsWith('Too many')) throw error;
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
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
} as NextAuthOptions;
