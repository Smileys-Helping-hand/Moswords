import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load local database URL
dotenv.config({ path: '.env.local' });
const localDbUrl = process.env.DATABASE_URL;

console.log('🔍 Checking database configuration...\n');
console.log('Local Database URL (from .env.local):');
console.log(localDbUrl?.substring(0, 50) + '...\n');

console.log('⚠️  IMPORTANT: Compare this with your PRODUCTION database URL:\n');
console.log('1. Go to: https://vercel.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to: Settings → Environment Variables');
console.log('4. Find the DATABASE_URL value\n');

console.log('📊 IF THEY ARE DIFFERENT:');
console.log('   Run this command with your PRODUCTION database URL:\n');
console.log('   $env:DATABASE_URL="<production_url>"; npx drizzle-kit push\n');

console.log('✅ IF THEY ARE THE SAME:');
console.log('   Just wait 2-3 minutes for Vercel deployment to complete!');
console.log('   Then test signup at: https://awehchat.co.za/login\n');

process.exit(0);
