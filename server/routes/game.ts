/**
 * Game API Routes
 * Handles round management, seed distribution, and game state
 */

import express from 'express';
import { db } from '../database/connection';
import { aptosService } from '../services/AptosService';

const router = express.Router();

/**
 * POST /api/game/start
 * Start a new game round with Aptos seed
 */
router.post('/start', async (req, res) => {
  try {
    // For now, use the seeded test user. In production this would come from auth.
    const testUser = await db.ensureUser('0x1234567890abcdef', 'Test Player');
    
    // Step 1: Generate seed from Aptos (mocked)
    console.log('🎯 Generating new game round...');
    const seedData = await aptosService.generateRandomSeed();
    
    // Step 2: Create round record in database
    const config = {
      candleIntervalMs: 65,
      totalCandles: 460, // ~30 seconds at 65ms
      initialPrice: 100.0,
      roundDurationMs: 30000
    };
    
    const round = await db.createRound(testUser.id, seedData.seed);
    
    // Update the round with Aptos data
    await db.updateRound(round.id, {
      block_height: seedData.blockHeight,
      aptos_transaction_hash: seedData.transactionHash
    });
    
    console.log(`✅ Round created: ${round.id} with seed ${seedData.seed.substring(0, 10)}...`);
    
    // Step 3: Return game data to client
    res.json({
      success: true,
      round: {
        id: round.id,
        seed: seedData.seed,
        config,
        proof: {
          blockHeight: seedData.blockHeight,
          transactionHash: seedData.transactionHash,
          timestamp: seedData.timestamp
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Failed to start game round:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to start game round',
      details: error.message 
    });
  }
});

/**
 * POST /api/game/complete
 * Complete a game round and settle results
 */
router.post('/complete', async (req, res) => {
  try {
    const { roundId, finalPrice, candleCount, completedAt } = req.body;
    
    if (!roundId || typeof finalPrice !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: roundId and finalPrice required'
      });
    }
    
    // Get the round to verify it exists and is active
    const round = await db.getRoundById(roundId);
    if (!round) {
      return res.status(404).json({
        success: false,
        error: 'Round not found'
      });
    }
    
    if (round.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Round is not active'
      });
    }
    
    // TODO: Verify final price by regenerating candles from seed
    // For now, we trust the client (will be implemented with deterministic generation)
    
    // Complete the round
    await db.completeRound(roundId, finalPrice, completedAt ? new Date(completedAt) : new Date());
    
    console.log(`🏁 Round ${roundId} completed with final price: ${finalPrice}`);
    
    res.json({
      success: true,
      round: {
        id: roundId,
        finalPrice,
        candleCount: candleCount || 0,
        status: 'COMPLETED'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Failed to complete round:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete round',
      details: error.message 
    });
  }
});

/**
 * GET /api/game/round/:id
 * Get round information
 */
router.get('/round/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const round = await db.getRoundById(id);
    if (!round) {
      return res.status(404).json({
        success: false,
        error: 'Round not found'
      });
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
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Failed to get round:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get round',
      details: error.message 
    });
  }
});

/**
 * GET /api/game/history
 * Get recent game rounds (for testing)
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const rounds = await db.getRecentRounds(limit);
    
    res.json({
      success: true,
      rounds: rounds.map(round => ({
        id: round.id,
        seed: round.seed,
        status: round.status,
        startedAt: round.started_at,
        finalPrice: round.final_price,
        blockHeight: round.block_height
      }))
    });
    
  } catch (error: any) {
    console.error('❌ Failed to get game history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get game history',
      details: error.message 
    });
  }
});

/**
 * GET /api/game/rounds
 * Get all rounds (admin/read use)
 */
router.get('/rounds', async (_req, res) => {
  try {
    // Reuse db helper to fetch all; returns raw rows
    const rounds = await db.getAllRounds();
    res.json({ success: true, rounds });
  } catch (error: any) {
    console.error('❌ Failed to get all rounds:', error);
    res.status(500).json({ success: false, error: 'Failed to get rounds', details: error.message });
  }
});

/**
 * POST /api/game/trade/open
 * Open a trade for a given round
 */
router.post('/trade/open', async (req, res) => {
  try {
    const { roundId, direction, size, entryPrice, entryCandleIndex } = req.body;
    if (!roundId || !direction || typeof size !== 'number' || typeof entryPrice !== 'number' || typeof entryCandleIndex !== 'number') {
      return res.status(400).json({ success: false, error: 'Invalid request body' });
    }

    const round = await db.getRoundById(roundId);
    if (!round) return res.status(404).json({ success: false, error: 'Round not found' });

    const trade = await db.insertTrade({
      round_id: round.id,
      user_id: round.user_id,
      direction,
      size,
      entry_price: entryPrice,
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
 * POST /api/game/trade/close
 * Close a trade by ID
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
 * Record a round event (e.g., liquidation)
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
 * Upsert summary metrics for a round
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
    if (!round) {
      return res.status(404).json({ success: false, error: 'Round not found' });
    }
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
    if (!round) {
      return res.status(404).json({ success: false, error: 'Round not found' });
    }
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
    if (!round) {
      return res.status(404).json({ success: false, error: 'Round not found' });
    }
    const metrics = await db.getMetricsByRoundId(id);
    res.json({ success: true, metrics });
  } catch (error: any) {
    console.error('❌ Failed to get metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to get metrics', details: error.message });
  }
});

export default router;
