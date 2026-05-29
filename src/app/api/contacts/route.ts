import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/contacts
 * Fetch all contacts for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !(session?.user as any)?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session?.user as any)?.id || (session?.user as any)?.uid;

    // TODO: Fetch contacts from database for current user
    // For now, return mock data
    const mockContacts = [
      {
        id: 'contact-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1 (555) 000-0001',
        avatar: null,
        userId,
        lastSynced: new Date(),
        syncedWith: ['nexus'],
        customData: null,
      },
      {
        id: 'contact-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1 (555) 000-0002',
        avatar: null,
        userId,
        lastSynced: new Date(),
        syncedWith: [],
        customData: null,
      },
    ];

    return NextResponse.json({ contacts: mockContacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/contacts
 * Create a new contact
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !(session?.user as any)?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session?.user as any)?.id || (session?.user as any)?.uid;
    const { name, email, phone, avatar } = await req.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // TODO: Save contact to database
    const newContact = {
      id: `contact-${Date.now()}-${Math.random()}`,
      name,
      email,
      phone: phone || null,
      avatar: avatar || null,
      userId,
      lastSynced: new Date(),
      syncedWith: [],
      customData: null,
    };

    return NextResponse.json({ contact: newContact }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
