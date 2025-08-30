/*
  Seed script to populate the SQLite database with realistic, fake data.
  Usage: npm run db:seed
*/

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
} catch {}
import { db, User, Round } from '../database/connection';

async function ensureUsers(): Promise<User[]> {
  const usersSpec = [
    { wallet: '0x1234567890abcdef', username: 'Test Player' },
    { wallet: '0xabcdef0123456789', username: 'Alice' },
    { wallet: '0xdeadbeefcafebabe', username: 'Bob' },
  ];

  const users: User[] = [];
  for (const u of usersSpec) {
    const user = await db.ensureUser(u.wallet, u.username);
    users.push(user);
  }
  return users;
}

async function createRounds(users: User[]): Promise<Round[]> {
  const rounds: Round[] = [];
  const config = {
    candleIntervalMs: 65,
    totalCandles: 460,
    initialPrice: 100.0,
    roundDurationMs: 30000,
  };

  const seeds = [
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  ];

  // One ACTIVE and one COMPLETED across first two users
  // Helper to ensure round exists for a user+seed
  const ensureRound = async (userId: string, seed: string) => {
    const existing = await db.getRoundByUserAndSeed(userId, seed);
    if (existing) return existing;
    return await db.createRound(userId, seed);
  };

  const r1 = await ensureRound(users[0].id, seeds[0]);
  rounds.push(r1);

  const r2 = await ensureRound(users[1].id, seeds[1]);
  if (r2.status !== 'COMPLETED') {
    await db.completeRound(r2.id, 105.42, new Date(Date.now() - 60_000));
  }
  const r2f = await db.getRoundById(r2.id);
  if (!r2f) throw new Error('Failed to refetch completed round r2');
  rounds.push(r2f);

  const r3 = await ensureRound(users[2].id, seeds[2]);
  if (r3.status !== 'COMPLETED') {
    await db.completeRound(r3.id, 92.15, new Date(Date.now() - 120_000));
  }
  const r3f = await db.getRoundById(r3.id);
  if (!r3f) throw new Error('Failed to refetch completed round r3');
  rounds.push(r3f);

  return rounds;
}

async function createTrades(rounds: Round[], users: User[]) {
  // For the completed rounds, add a couple of trades each
  const completed = rounds.filter(r => r.status === 'COMPLETED');
  for (const r of completed) {
    const user = users.find(u => u.id === r.user_id)!;
    const existingTrades = await db.getTradesByRoundId(r.id);
    if (existingTrades.length === 0) {
      // LONG winner
      await db.insertTrade({
        round_id: r.id,
        user_id: user.id,
        direction: 'LONG',
        size: 100,
        entry_price: 98.0,
        exit_price: 103.5,
        entry_candle_index: 40,
        exit_candle_index: 120,
        pnl: (103.5 - 98.0) * 100,
        status: 'CLOSED',
      });

      // SHORT loser
      await db.insertTrade({
        round_id: r.id,
        user_id: user.id,
        direction: 'SHORT',
        size: 50,
        entry_price: 101.2,
        exit_price: 104.1,
        entry_candle_index: 180,
        exit_candle_index: 210,
        pnl: (101.2 - 104.1) * 50,
        status: 'CLOSED',
      });
    }
  }
}

async function createEventsAndMetrics(rounds: Round[]) {
  const completed = rounds.filter(r => r.status === 'COMPLETED');
  for (const r of completed) {
    // Example event: a moon spike mid-round
    const existingEvents = await db.getEventsByRoundId(r.id);
    if (existingEvents.length === 0) {
      await db.insertRoundEvent({
        round_id: r.id,
        candle_index: 150,
        type: 'MOON',
        data: { magnitude: 'x3', reason: 'volatility_cluster' },
      });
    }

    // Example metrics
    await db.upsertRoundMetrics(r.id, {
      max_drawdown: -0.18,
      max_runup: 0.26,
      peak_pnl: 540.0,
      liquidation_occurred: 0,
    });
  }
}

async function main() {
  try {
    console.log('🔧 Initializing DB...');
    await db.initialize();
    console.log('👥 Ensuring users...');
    const users = await ensureUsers();
    console.log('🎮 Creating rounds...');
    const rounds = await createRounds(users);
    console.log('💼 Creating trades...');
    await createTrades(rounds, users);
    console.log('🧾 Adding events/metrics...');
    await createEventsAndMetrics(rounds);
    console.log('✅ Seed complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

main();
