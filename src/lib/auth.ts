import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  // Note: DrizzleAdapter is not compatible with CredentialsProvider + JWT sessions
  // adapter: DrizzleAdapter(db) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
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
            throw new Error('Please enter an email and password');
          }

          const [user] = await db
            .select({
              id: users.id,
              email: users.email,
              password: users.password,
              displayName: users.displayName,
              photoURL: users.photoURL,
            })
            .from(users)
            .where(eq(users.email, credentials.email))
            .limit(1);

          if (!user || !user.password) {
            console.error('User not found:', credentials.email);
            throw new Error('No user found with this email');
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!passwordMatch) {
            console.error('Password mismatch for:', credentials.email);
            throw new Error('Incorrect password');
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
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
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
  trustHost: true,
};
