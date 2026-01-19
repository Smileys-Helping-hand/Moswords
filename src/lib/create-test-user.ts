import 'dotenv/config';
import { db } from './db';
import { users } from './schema';
import bcrypt from 'bcryptjs';

async function createTestUser() {
  console.log('🧪 Creating test user for messaging...');

  try {
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const [testUser] = await db
      .insert(users)
      .values({
        email: 'testuser@moswords.com',
        password: hashedPassword,
        name: 'Test Contact',
        displayName: 'Test Contact',
        photoURL: 'https://picsum.photos/seed/testuser/48/48',
        customStatus: 'Available for testing!',
        points: 50,
      })
      .returning()
      .onConflictDoNothing();

    if (!testUser) {
      console.log('⚠️  Test user already exists!');
      console.log('\n✅ Use these credentials to test messaging:');
      console.log('   Email: testuser@moswords.com');
      console.log('   Password: test123');
      return;
    }

    console.log('✅ Test user created successfully!');
    console.log('\n📝 Test User Credentials:');
    console.log('   Email: testuser@moswords.com');
    console.log('   Password: test123');
    console.log('   Display Name: Test Contact');
    console.log('\n💡 To test messaging:');
    console.log('   1. Log in as your main user');
    console.log('   2. Click "Add Contact" button');
    console.log('   3. Search for "testuser" or "Test Contact"');
    console.log('   4. Send a message!');
    console.log('   5. Open incognito window and log in as testuser@moswords.com to reply');
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  }
}

createTestUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
