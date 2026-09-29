import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { isEmail, normalizeEmail } from '@/lib/validate';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

// Disable all caching for this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimit(`signup:ip:${clientIp(request.headers)}`, 10, 60 * 60);
    if (!limit.allowed) return tooManyRequests(3600);

    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';

    if (!isEmail(email) || !password) {
      return NextResponse.json(
        { error: 'A valid email and password are required' },
        { status: 400, headers: NO_STORE },
      );
    }

    if (password.length < 8 || password.length > 200) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400, headers: NO_STORE },
      );
    }

    // Older rows kept the email exactly as typed, so compare case-insensitively.
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400, headers: NO_STORE },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const displayName = name || email.split('@')[0];

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name: displayName,
        displayName,
        // Random seed: never send the user's email to a third-party image host.
        photoURL: `https://picsum.photos/seed/${crypto.randomUUID()}/96/96`,
        customStatus: 'Just joined!',
        themePreference: 'obsidian',
        isPro: false,
        points: 0,
      })
      .returning({ id: users.id });

    return NextResponse.json(
      { message: 'User created successfully', userId: newUser.id },
      { status: 201, headers: NO_STORE },
    );
  } catch (error) {
    console.error('Signup error:', (error as Error).message);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500, headers: NO_STORE },
    );
  }
}
