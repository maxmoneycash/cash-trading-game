/**
 * Game API Routes with Deterministic Candle Generation & Fairness
 */

import express from 'express';
import { db, Round } from '../database/connection';
import { aptosService } from '../services/AptosService';

import {
  createDefaultConfig,
  generateSeededCandles,
  generateCandleDigestSync,
  assertAligned,
  CandleConfig
} from '../src/utils/seededCandles';

const router = express.Router();

/**
 * POST /api/game/start
 * Start a new deterministic round (seed + canonical config + digest)
 */
router.post('/start', async (_req, res) => {
  try {
    // 1) user (replace with real auth later)
    const user = await db.ensureUser('0x1234567890abcdef', 'Test Player');

    // 2) seed (Aptos service; mocked or real)
    const seedData = await aptosService.generateRandomSeed();
    const seedHex = seedData.seed;

    // 3) canonical, aligned start time (+ small headroom)
    const interval = 65;
    const padTicks = 2;
    const now = Date.now();
    const aligned = now - (now % interval) + padTicks * interval;

    // 4) canonical config (NO defaults at client)
    const config = createDefaultConfig(aligned);
    assertAligned(config);

    // 5) generate on server + digest
    const candles = generateSeededCandles(seedHex, config);
    const digest = generateCandleDigestSync(seedHex, config, candles);

    // 6) create round + persist canonical fairness and proof
    const round = await db.createRound(user.id, seedHex);

    await db.setRoundFairness(round.id, {
      candle_digest: digest,
      fairness_version: config.fairness_version,
      prng: config.prng,
      scale: config.scale,
      interval_ms: config.interval_ms,
      total_candles: config.total_candles,
      start_at_ms: config.start_at_ms,
      initial_price_fp: config.initial_price_fp
    });

    await db.updateRound(round.id, {
      block_height: seedData.blockHeight,
      aptos_transaction_hash: seedData.transactionHash
    });

    // Optional: store JSON copy for UI/debug
    await db.setRoundConfigJson(round.id, config);

    console.log(`✅ Round created: ${round.id}`);
    console.log(`🎲 Seed: ${seedHex.substring(0, 16)}...`);
    console.log(`🔒 Digest: ${digest.substring(0, 16)}...`);
    console.log(`⏰ Start: ${new Date(aligned).toISOString()}`);
    console.log(`📈 Generated ${candles.length} deterministic candles`);

    // 7) respond (client will replay exactly)
    res.json({
      success: true,
      round: {
        id: round.id,
        seed: seedHex,
        config,
        digest,
        proof: {
          blockHeight: seedData.blockHeight,
          transactionHash: seedData.transactionHash,
          timestamp: seedData.timestamp
        }
      },
      user: {
        id: user.id,
        wallet_address: user.wallet_address
      }
    });
  } catch (error: any) {
    console.error('❌ Failed to start round:', error);
    res.status(500).json({ success: false, error: 'Failed to start round', details: error.message });
  }
});

/**
 * GET /api/game/fairness/:roundId
 * Returns canonical fairness data for client/3rd-party verification
 */
router.get('/fairness/:roundId', async (req, res) => {
  try {
    const round = await db.getRoundById(req.params.roundId);
    if (!round) return res.status(404).json({ success: false, error: 'Round not found' });

    // Check all canonical fields exist (no defaults/fallbacks)
    if (!round.seed || !round.candle_digest || !round.fairness_version || !round.prng ||
      !round.scale || !round.interval_ms || !round.total_candles ||
      !round.start_at_ms || !round.initial_price_fp) {
      return res.status(400).json({
        success: false,
        error: 'Round missing required fairness fields'
      });
    }

    const cfg: CandleConfig = {
      fairness_version: round.fairness_version,
      prng: round.prng,
      scale: round.scale,
      interval_ms: round.interval_ms,
      total_candles: round.total_candles,
      initial_price_fp: round.initial_price_fp,
      start_at_ms: round.start_at_ms
    };

    res.json({
      success: true,
      fairness: {
        roundId: round.id,
        seed: round.seed,
        digest: round.candle_digest,
        config: cfg,
        proof: {
          blockHeight: round.block_height,
          transactionHash: round.aptos_transaction_hash
        },
        instructions: "Regenerate with generateSeededCandles(seed, config) and verify digest."
      }
    });
  } catch (error: any) {
    console.error('❌ Failed to get fairness:', error);
    res.status(500).json({ success: false, error: 'Failed to get fairness', details: error.message });
  }
});

/**
 * GET /api/game/verify/:roundId
 * Server-side re-verification for audits/debug
 */
router.get('/verify/:roundId', async (req, res) => {
  try {
    const round = await db.getRoundById(req.params.roundId);
    if (!round || !round.candle_digest) {
      return res.status(404).json({ success: false, error: 'Round not found or no digest' });
    }

    if (!round.fairness_version || !round.prng || !round.scale || !round.interval_ms ||
      !round.total_candles || !round.start_at_ms || !round.initial_price_fp) {
      return res.status(400).json({ success: false, error: 'Round missing fairness fields' });
    }

    const cfg: CandleConfig = {
      fairness_version: round.fairness_version,
      prng: round.prng,
      scale: round.scale,
      interval_ms: round.interval_ms,
      total_candles: round.total_candles,
      initial_price_fp: round.initial_price_fp,
      start_at_ms: round.start_at_ms
    };

    const candles = generateSeededCandles(round.seed, cfg);
    const computed = generateCandleDigestSync(round.seed, cfg, candles);
    const valid = computed === round.candle_digest;

    res.json({
      success: true,
      verification: {
        roundId: round.id,
        valid,
        computedDigest: computed,
        storedDigest: round.candle_digest,
        candleCount: candles.length,
        config: cfg
      }
    });
  } catch (error: any) {
    console.error('❌ Failed to verify round:', error);
    res.status(500).json({ success: false, error: 'Failed to verify round', details: error.message });
  }
});

/**
 * POST /api/game/trade/open
 * Open a trade with server-side price verification (1-tick tolerance)
 */
router.post('/trade/open', async (req, res) => {
  try {
    const { roundId, size, entryPrice, entryCandleIndex } = req.body;
    if (!roundId || typeof size !== 'number' || typeof entryPrice !== 'number' || typeof entryCandleIndex !== 'number') {
      return res.status(400).json({ success: false, error: 'Invalid request body' });
    }

    const round = await db.getRoundById(roundId);
    if (!round) return res.status(404).json({ success: false, error: 'Round not found' });

    if (!round.candle_digest || !round.start_at_ms || !round.fairness_version || !round.prng ||
      !round.scale || !round.interval_ms || !round.total_candles || !round.initial_price_fp) {
      return res.status(400).json({ success: false, error: 'Round missing canonical fairness data' });
    }

    const cfg: CandleConfig = {
      fairness_version: round.fairness_version,
      prng: round.prng,
      scale: round.scale,
      interval_ms: round.interval_ms,
      total_candles: round.total_candles,
      initial_price_fp: round.initial_price_fp,
      start_at_ms: round.start_at_ms
    };

    const candles = generateSeededCandles(round.seed, cfg);
    if (entryCandleIndex < 0 || entryCandleIndex >= candles.length) {
      return res.status(400).json({ success: false, error: 'entryCandleIndex out of range' });
    }

    const expectedCloseFP = candles[entryCandleIndex].close;
    const expectedPrice = expectedCloseFP / cfg.scale;
    const tolerance = 1 / cfg.scale;

    if (Math.abs(expectedPrice - entryPrice) > tolerance) {
      return res.status(400).json({
        success: false,
        error: 'Price verification failed',
        expected: expectedPrice,
        received: entryPrice,
        tolerance,
        candleIndex: entryCandleIndex
      });
    }

    // Store canonical server price
    const trade = await db.insertTrade({
      round_id: round.id,
      user_id: round.user_id,
      size,
      entry_price: expectedPrice,
      entry_candle_index: entryCandleIndex,
      status: 'OPEN'
    });

    res.json({ success: true, trade });
  } catch (error: any) {
    console.error('❌ Failed to open trade:', error);
    res.status(500).json({ success: false, error: 'Failed to open trade', details: error.message });
  }
});

/**
 * POST /api/game/complete
 * Complete a round after verifying final price
 */
router.post('/complete', async (req, res) => {
  try {
    const { roundId, finalPrice, candleCount, completedAt } = req.body;

    if (!roundId || typeof finalPrice !== 'number') {
      return res.status(400).json({ success: false, error: 'Invalid request: roundId and finalPrice required' });
    }

    const round = await db.getRoundById(roundId);
    if (!round) return res.status(404).json({ success: false, error: 'Round not found' });
    if (round.status !== 'ACTIVE') return res.status(400).json({ success: false, error: 'Round is not active' });

    if (!round.candle_digest || !round.start_at_ms || !round.fairness_version || !round.prng ||
      !round.scale || !round.interval_ms || !round.total_candles || !round.initial_price_fp) {
      return res.status(400).json({ success: false, error: 'Round missing canonical fairness data' });
    }

    const cfg: CandleConfig = {
      fairness_version: round.fairness_version,
      prng: round.prng,
      scale: round.scale,
      interval_ms: round.interval_ms,
      total_candles: round.total_candles,
      initial_price_fp: round.initial_price_fp,
      start_at_ms: round.start_at_ms
    };

    const candles = generateSeededCandles(round.seed, cfg);
    const finalIdx = candles.length - 1;
    const expectedCloseFP = candles[finalIdx].close;
    const expectedFinalPrice = expectedCloseFP / cfg.scale;
    const tolerance = 1 / cfg.scale;

    if (Math.abs(expectedFinalPrice - finalPrice) > tolerance) {
      await db.markRoundDisputed(roundId);
      return res.status(400).json({
        success: false,
        error: 'Final price verification failed',
        expected: expectedFinalPrice,
        received: finalPrice,
        tolerance
      });
    }

    await db.completeRound(roundId, expectedFinalPrice, completedAt ? new Date(completedAt) : new Date());

    res.json({
      success: true,
      round: {
        id: roundId,
        finalPrice: expectedFinalPrice,
        candleCount: candleCount ?? candles.length,
        status: 'COMPLETED'
      }
    });
  } catch (error: any) {
    console.error('❌ Failed to complete round:', error);
    res.status(500).json({ success: false, error: 'Failed to complete round', details: error.message });
  }
});

/**
 * GET /api/game/round/:id
 */
router.get('/round/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const round = await db.getRoundById(id);
    if (!round) {
      return res.status(404).json({ success: false, error: 'Round not found' });
    }
    res.json({
      success: true,
      round: {
        id: round.id,
        seed: round.seed,
        status: round.status,
        startedAt: round.started_at,
        endedAt: round.ended_at,
        finalPrice: round.final_price,
        config: round.config ? JSON.parse(round.config) : null,
        proof: {
          blockHeight: round.block_height,
          transactionHash: round.aptos_transaction_hash
        },
        fairness: {
          digest: round.candle_digest,
          version: round.fairness_version,
          prng: round.prng,
          scale: round.scale,
          interval_ms: round.interval_ms,
          total_candles: round.total_candles,
          start_at_ms: round.start_at_ms,
          initial_price_fp: round.initial_price_fp
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Failed to get round:', error);
    res.status(500).json({ success: false, error: 'Failed to get round', details: error.message });
  }
});

/**
 * GET /api/game/history
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const rounds = await db.getRecentRounds(limit);

    res.json({
      success: true,
      rounds: rounds.map(r => ({
        id: r.id,
        seed: r.seed,
        status: r.status,
        startedAt: r.started_at,
        finalPrice: r.final_price,
        blockHeight: r.block_height,
        digest: r.candle_digest
      }))
    });
  } catch (error: any) {
    console.error('❌ Failed to get history:', error);
    res.status(500).json({ success: false, error: 'Failed to get game history', details: error.message });
  }
});

/**
 * GET /api/game/rounds
 */
router.get('/rounds', async (_req, res) => {
  try {
    const rounds = await db.getAllRounds();
    res.json({ success: true, rounds });
  } catch (error: any) {
    console.error('❌ Failed to get all rounds:', error);
    res.status(500).json({ success: false, error: 'Failed to get rounds', details: error.message });
  }
});

/**
 * POST /api/game/trade/close
 */
router.post('/trade/close', async (req, res) => {
  try {
    const { tradeId, exitPrice, exitCandleIndex, pnl } = req.body;
    if (!tradeId || typeof exitPrice !== 'number' || typeof exitCandleIndex !== 'number' || typeof pnl !== 'number') {
      return res.status(400).json({ success: false, error: 'Invalid request body' });
    }

    const trade = await db.getTradeById(tradeId);
    if (!trade) return res.status(404).json({ success: false, error: 'Trade not found' });

    await db.closeTrade(tradeId, { exit_price: exitPrice, exit_candle_index: exitCandleIndex, pnl });
    const updated = await db.getTradeById(tradeId);
    res.json({ success: true, trade: updated });
  } catch (error: any) {
    console.error('❌ Failed to close trade:', error);
    res.status(500).json({ success: false, error: 'Failed to close trade', details: error.message });
  }
});

/**
 * POST /api/game/event
 */
router.post('/event', async (req, res) => {
  try {
    const { roundId, candleIndex, type, data } = req.body;
    if (!roundId || typeof candleIndex !== 'number' || !type) {
      return res.status(400).json({ success: false, error: 'Invalid request body' });
    }
    const round = await db.getRoundById(roundId);
    if (!round) return res.status(404).json({ success: false, error: 'Round not found' });

    const event = await db.insertRoundEvent({ round_id: round.id, candle_index: candleIndex, type, data });
    res.json({ success: true, event });
  } catch (error: any) {
    console.error('❌ Failed to record event:', error);
    res.status(500).json({ success: false, error: 'Failed to record event', details: error.message });
  }
});

/**
 * POST /api/game/metrics
 */
router.post('/metrics', async (req, res) => {
  try {
    const { roundId, max_drawdown, max_runup, peak_pnl, liquidation_occurred } = req.body;
    if (!roundId) return res.status(400).json({ success: false, error: 'roundId required' });
    const round = await db.getRoundById(roundId);
    if (!round) return res.status(404).json({ success: false, error: 'Round not found' });

    await db.upsertRoundMetrics(roundId, { max_drawdown, max_runup, peak_pnl, liquidation_occurred });
    const metrics = await db.getMetricsByRoundId(roundId);
    res.json({ success: true, metrics });
  } catch (error: any) {
    console.error('❌ Failed to upsert metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to upsert metrics', details: error.message });
  }
});

/**
 * GET /api/game/round/:id/trades
 */
router.get('/round/:id/trades', async (req, res) => {
  try {
    const { id } = req.params;
    const round = await db.getRoundById(id);
    if (!round) return res.status(404).json({ success: false, error: 'Round not found' });
    const trades = await db.getTradesByRoundId(id);
    res.json({ success: true, trades });
  } catch (error: any) {
    console.error('❌ Failed to get trades:', error);
    res.status(500).json({ success: false, error: 'Failed to get trades', details: error.message });
  }
});

/**
 * GET /api/game/round/:id/events
 */
router.get('/round/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const round = await db.getRoundById(id);
    if (!round) return res.status(404).json({ success: false, error: 'Round not found' });
    const events = await db.getEventsByRoundId(id);
    res.json({ success: true, events });
  } catch (error: any) {
    console.error('❌ Failed to get events:', error);
    res.status(500).json({ success: false, error: 'Failed to get events', details: error.message });
  }
});

/**
 * GET /api/game/round/:id/metrics
 */
router.get('/round/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const round = await db.getRoundById(id);
    if (!round) return res.status(404).json({ success: false, error: 'Round not found' });
    const metrics = await db.getMetricsByRoundId(id);
    res.json({ success: true, metrics });
  } catch (error: any) {
    console.error('❌ Failed to get metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to get metrics', details: error.message });
  }
});

export default router;
