import 'dotenv/config';
import { db } from './db';
import { users, servers, channels, serverMembers, messages } from './schema';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  try {
    // Create demo users
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const [demoUser1] = await db
      .insert(users)
      .values({
        email: 'demo1@moswords.com',
        password: hashedPassword,
        name: 'Demo User 1',
        displayName: 'Demo User 1',
        photoURL: 'https://picsum.photos/seed/demo1/48/48',
        customStatus: 'Building awesome things!',
        points: 100,
      })
      .returning()
      .onConflictDoNothing();

    const [demoUser2] = await db
      .insert(users)
      .values({
        email: 'demo2@moswords.com',
        password: hashedPassword,
        name: 'Demo User 2',
        displayName: 'Demo User 2',
        photoURL: 'https://picsum.photos/seed/demo2/48/48',
        customStatus: 'Always learning!',
        points: 75,
      })
      .returning()
      .onConflictDoNothing();

    if (!demoUser1 || !demoUser2) {
      console.log('⚠️  Demo users already exist, skipping...');
      return;
    }

    console.log('✅ Created demo users');

    // Create a demo server
    const [demoServer] = await db
      .insert(servers)
      .values({
        name: 'Welcome Server',
        imageUrl: 'https://picsum.photos/seed/server1/200/200',
        inviteCode: 'WELCOME2024',
        ownerId: demoUser1.id,
      })
      .returning();

    console.log('✅ Created demo server');

    // Add members to server
    await db.insert(serverMembers).values([
      {
        serverId: demoServer.id,
        userId: demoUser1.id,
        role: 'owner',
      },
      {
        serverId: demoServer.id,
        userId: demoUser2.id,
        role: 'member',
      },
    ]);

    console.log('✅ Added server members');

    // Create channels
    const [generalChannel] = await db
      .insert(channels)
      .values([
        {
          name: 'general',
          type: 'text',
          serverId: demoServer.id,
        },
        {
          name: 'random',
          type: 'text',
          serverId: demoServer.id,
        },
        {
          name: 'announcements',
          type: 'text',
          serverId: demoServer.id,
        },
      ])
      .returning();

    console.log('✅ Created channels');

    // Add some welcome messages
    await db.insert(messages).values([
      {
        content: 'Welcome to Moswords! 👋',
        channelId: generalChannel.id,
        userId: demoUser1.id,
      },
      {
        content: 'Thanks! Excited to be here!',
        channelId: generalChannel.id,
        userId: demoUser2.id,
      },
      {
        content: 'This is built with Next.js, PostgreSQL, and NextAuth 🚀',
        channelId: generalChannel.id,
        userId: demoUser1.id,
      },
    ]);

    console.log('✅ Added welcome messages');
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📝 Demo Credentials:');
    console.log('   Email: demo1@moswords.com');
    console.log('   Password: demo123');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
