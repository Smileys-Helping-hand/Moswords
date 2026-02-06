import { db } from '../src/lib/db';
import { users } from '../src/lib/schema';
import { sql } from 'drizzle-orm';

async function verifySchema() {
  try {
    console.log('🔍 Verifying users table schema...\n');
    
    // Get table columns
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ Users table columns:');
    console.table(result.rows);
    
    // Check required columns exist
    const requiredColumns = [
      'id', 'email', 'email_verified', 'name', 'image', 'password',
      'display_name', 'photo_url', 'created_at', 'points', 
      'custom_status', 'theme_preference', 'is_pro', 'last_seen'
    ];
    
    const columnNames = result.rows.map((row: any) => row.column_name);
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('\n✅ All required columns present!');
      console.log('✅ Sign up should now work correctly!');
    } else {
      console.log('\n❌ Missing columns:', missingColumns);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying schema:', error);
    process.exit(1);
  }
}

verifySchema();
