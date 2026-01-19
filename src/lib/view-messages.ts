import 'dotenv/config';
import { db } from './db';
import { directMessages, users } from './schema';
import { desc, eq } from 'drizzle-orm';

async function viewMessages() {
  console.log('📨 Fetching all direct messages...\n');

  try {
    const messages = await db
      .select({
        id: directMessages.id,
        content: directMessages.content,
        createdAt: directMessages.createdAt,
        sender: {
          id: users.id,
          email: users.email,
          name: users.displayName,
        },
      })
      .from(directMessages)
      .leftJoin(users, eq(directMessages.senderId, users.id))
      .orderBy(desc(directMessages.createdAt))
      .limit(20);

    if (messages.length === 0) {
      console.log('No direct messages found yet.');
      console.log('\n💡 Send a message through the app to see it here!');
    } else {
      console.log(`Found ${messages.length} message(s):\n`);
      messages.forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.createdAt?.toLocaleString()}]`);
        console.log(`   From: ${msg.sender?.name || msg.sender?.email || 'Unknown'}`);
        console.log(`   Message: "${msg.content}"`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    throw error;
  }
}

viewMessages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
