import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function fixLastSeenColumn() {
  console.log('🔧 Starting last_seen column conversion...\n');
  
  try {
    // Step 1: Check current column type
    console.log('1️⃣ Checking current column type...');
    const currentType = await sql`
      SELECT data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'last_seen';
    `;
    console.log('   Current type:', currentType[0]);
    
    if (currentType[0].data_type === 'timestamp without time zone') {
      console.log('✅ Column is already TIMESTAMP. No changes needed!');
      return;
    }
    
    // Step 2: Drop existing default
    console.log('\n2️⃣ Dropping old default value...');
    await sql`
      ALTER TABLE users 
      ALTER COLUMN last_seen DROP DEFAULT;
    `;
    console.log('   ✓ Old default removed');
    
    // Step 3: Alter column type
    console.log('\n3️⃣ Converting TEXT to TIMESTAMP...');
    await sql`
      ALTER TABLE users 
      ALTER COLUMN last_seen TYPE timestamp 
      USING CASE 
        WHEN last_seen = 'offline' OR last_seen IS NULL THEN NOW()
        ELSE NOW()
      END;
    `;
    console.log('   ✓ Column type converted');
    
    // Step 4: Set new default value
    console.log('\n4️⃣ Setting DEFAULT NOW()...');
    await sql`
      ALTER TABLE users 
      ALTER COLUMN last_seen SET DEFAULT NOW();
    `;
    console.log('   ✓ Default value set');
    
    // Step 5: Set NOT NULL
    console.log('\n5️⃣ Adding NOT NULL constraint...');
    await sql`
      ALTER TABLE users 
      ALTER COLUMN last_seen SET NOT NULL;
    `;
    console.log('   ✓ NOT NULL constraint added');
    
    // Step 6: Verify the change
    console.log('\n6️⃣ Verifying changes...');
    const newType = await sql`
      SELECT data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'last_seen';
    `;
    console.log('   New type:', newType[0]);
    
    console.log('\n✅ SUCCESS! The last_seen column has been converted to TIMESTAMP.');
    console.log('\n📋 Summary:');
    console.log('   - Type: TEXT → timestamp without time zone');
    console.log('   - Default: \'offline\' → NOW()');
    console.log('   - Nullable: NO');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  }
}

fixLastSeenColumn()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
