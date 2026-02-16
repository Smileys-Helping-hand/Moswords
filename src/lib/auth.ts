import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const isProduction = process.env.NODE_ENV === 'production';
const useSecureCookies = isProduction;
const sameSitePolicy = isProduction ? 'none' : 'lax';
const cookiePrefix = useSecureCookies ? '__Secure-' : '';

const providers = [
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      try {
        console.log('Authorization attempt for:', credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.error('Missing email or password');
          return null;
        }

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
          .where(eq(users.email, credentials.email))
          .limit(1);

        if (!user || !user.password) {
          console.error('User not found:', credentials.email);
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          console.error('Password mismatch for:', credentials.email);
          return null;
        }

        console.log('Authorization successful for:', credentials.email);
        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.name,
          image: user.photoURL || user.image,
        };
      } catch (error) {
        console.error('Authorization error:', error);
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
  // Required for production deployment on Vercel and mobile browsers
  trustHost: true,
};
