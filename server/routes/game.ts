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
    // For now, use mock user - in production this would come from JWT auth
    const mockUserId = 'F78A611A27B2635CA39F8C7815AD556C'; // Test user ID
    
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
    
    const round = await db.createRound(mockUserId, seedData.seed);
    
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
        seed: round.seed.substring(0, 10) + '...', // Truncate for privacy
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

export default router;