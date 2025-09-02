/*
  Clear script to remove dummy data while keeping the seeded Test Player.
  Usage: npm run db:clear
*/

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
} catch {}

import { db } from '../database/connection';

const TEST_WALLET = '0x1234567890abcdef';

async function main() {
  try {
    console.log('🔧 Initializing DB...');
    await db.initialize();
    console.log('🧹 Clearing data (keeping Test Player)...');
    // Ensure the test user exists so we don't delete everyone and end up empty
    await db.ensureUser(TEST_WALLET, 'Test Player');
    await db.clearAllButTestUser(TEST_WALLET);
    console.log('✅ Cleared rounds, trades, events, metrics; kept Test Player');
    process.exit(0);
  } catch (err) {
    console.error('❌ Clear failed:', err);
    process.exit(1);
  }
}

main();

