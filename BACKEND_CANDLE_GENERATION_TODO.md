# Backend Candle Generation & PnL Modal Implementation Plan

## Current State Assessment

### ⚠️ Critical Issue: Backend Files Missing
Despite merging Sam's PR, the backend implementation files are NOT present:
- ❌ `server/database/` directory missing
- ❌ `server/routes/game.ts` missing  
- ❌ `server/services/AptosService.ts` missing

Only the frontend files from Sam's PR are present. We need to recreate the backend.

### What We Have:
- ✅ `src/utils/CandleGenerator.ts` - Deterministic candle generation
- ✅ `src/managers/GameManager.ts` - Client-side game orchestration
- ✅ `src/services/api.ts` - API client ready to use
- ✅ `src/components/GameManagerTest.tsx` - Test interface
- ⚠️ Basic Express server with old Socket.io implementation

---

## Architecture Decision: Server-Side Pre-Generation

### Chosen Approach: **Batch Pre-Generation on Server**

**Reasoning:**
1. **Security**: Server controls all randomness, no client manipulation
2. **Verifiability**: All trades verified against server's canonical candles
3. **Performance**: No network latency during gameplay
4. **Simplicity**: Easier to implement than streaming
5. **Debugging**: Complete round data available for replay

### Data Flow:
```
User Action          Backend                           Frontend
-----------          -------                           --------
Click Start -------> Generate Seed
                     Generate ALL Candles (460)
                     Store in Database
                     <------ Return Complete Array -----> Receive Candles
                                                        Play at 65ms intervals
                                                        Show animations
Round Ends -----------------------------------------> Show PnL Modal
                                                        5s countdown
Click Next -------> (Repeat)                          Start new round
```

---

## Implementation Plan

### Phase 1: Recreate Missing Backend Infrastructure

#### 1.1 Database Setup
```typescript
// server/database/schema.sql
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    balance REAL DEFAULT 1000.0,
    locked_balance REAL DEFAULT 0.0,
    total_pnl REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

CREATE TABLE rounds (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT NOT NULL,
    seed TEXT NOT NULL,
    candles TEXT NOT NULL, -- JSON array of all candles
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    status TEXT DEFAULT 'ACTIVE',
    final_price REAL,
    total_trades INTEGER DEFAULT 0,
    net_pnl REAL DEFAULT 0.0,
    config TEXT, -- JSON config
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE trades (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    round_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    size REAL NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    entry_candle_index INTEGER NOT NULL,
    exit_candle_index INTEGER,
    pnl REAL DEFAULT 0.0,
    status TEXT DEFAULT 'OPEN',
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (round_id) REFERENCES rounds (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

#### 1.2 Database Connection
```typescript
// server/database/connection.ts
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export class DatabaseConnection {
    private db: sqlite3.Database;
    
    constructor() {
        this.db = new sqlite3.Database('./game.db');
        // Promisify methods...
    }
    
    async storeRoundWithCandles(userId: string, seed: string, candles: any[], config: any) {
        const candlesJson = JSON.stringify(candles);
        const configJson = JSON.stringify(config);
        
        await this.run(
            'INSERT INTO rounds (user_id, seed, candles, config) VALUES (?, ?, ?, ?)',
            [userId, seed, candlesJson, configJson]
        );
        
        return this.get('SELECT * FROM rounds WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
    }
}
```

#### 1.3 Mock Aptos Service
```typescript
// server/services/AptosService.ts
import crypto from 'crypto';

export class AptosService {
    async generateRandomSeed(): Promise<{seed: string, blockHeight: number, transactionHash: string}> {
        // Mock implementation
        const seed = '0x' + crypto.randomBytes(32).toString('hex');
        return {
            seed,
            blockHeight: Math.floor(Math.random() * 1000000),
            transactionHash: '0x' + crypto.randomBytes(32).toString('hex')
        };
    }
}
```

---

### Phase 2: Server-Side Candle Generation

#### 2.1 Move CandleGenerator to Backend
```typescript
// server/services/CandleGenerationService.ts
import { CandleGenerator } from './CandleGenerator';

export interface CandleData {
    index: number;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    isLiquidation?: boolean;
}

export class CandleGenerationService {
    generateRoundCandles(seed: string, config: GameConfig): CandleData[] {
        const generator = new CandleGenerator(seed, {
            initialPrice: config.initialPrice || 100,
            volatility: 0.02,
            drift: -0.0001, // Slight negative drift for house edge
            liquidationChance: 0.0015,
            minPrice: 0.01
        });
        
        const candles: CandleData[] = [];
        const startTime = Date.now();
        
        // Pre-generate all candles for the round
        for (let i = 0; i < config.totalCandles; i++) {
            const candle = generator.generateCandle(i);
            candles.push({
                ...candle,
                timestamp: startTime + (i * config.candleIntervalMs)
            });
        }
        
        return candles;
    }
    
    // Verify a claimed price against the canonical candle
    verifyPrice(seed: string, candleIndex: number, claimedPrice: number): boolean {
        const generator = new CandleGenerator(seed);
        const candle = generator.generateCandle(candleIndex);
        
        // Allow 0.01 tolerance for floating point
        return Math.abs(candle.close - claimedPrice) < 0.01;
    }
}
```

#### 2.2 Enhanced Game API Endpoints
```typescript
// server/routes/game.ts
import express from 'express';
import { db } from '../database/connection';
import { aptosService } from '../services/AptosService';
import { candleGenerationService } from '../services/CandleGenerationService';

const router = express.Router();

// POST /api/game/start
router.post('/start', async (req, res) => {
    try {
        // 1. Generate Aptos seed
        const seedData = await aptosService.generateRandomSeed();
        
        // 2. Game configuration
        const config = {
            candleIntervalMs: 65,
            totalCandles: 460, // ~30 seconds
            initialPrice: 100.0,
            roundDurationMs: 30000
        };
        
        // 3. Pre-generate ALL candles
        console.time('Candle Generation');
        const candles = candleGenerationService.generateRoundCandles(seedData.seed, config);
        console.timeEnd('Candle Generation'); // Should be < 50ms
        
        // 4. Store in database
        const round = await db.storeRoundWithCandles(
            req.userId || 'test_user', // TODO: Real auth
            seedData.seed,
            candles,
            config
        );
        
        // 5. Return complete dataset to frontend
        res.json({
            success: true,
            round: {
                id: round.id,
                seed: seedData.seed,
                candles, // Full array of 460 candles
                config,
                proof: {
                    blockHeight: seedData.blockHeight,
                    transactionHash: seedData.transactionHash
                }
            }
        });
        
    } catch (error) {
        console.error('Failed to start round:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/game/complete
router.post('/complete', async (req, res) => {
    const { roundId, trades, finalPrice } = req.body;
    
    // Calculate total PnL
    let totalPnL = 0;
    for (const trade of trades) {
        totalPnL += trade.pnl;
    }
    
    // Update round in database
    await db.completeRound(roundId, {
        finalPrice,
        totalTrades: trades.length,
        netPnl: totalPnL,
        endedAt: new Date()
    });
    
    res.json({
        success: true,
        summary: {
            roundId,
            totalTrades: trades.length,
            netPnL: totalPnL,
            finalPrice
        }
    });
});
```

---

### Phase 3: Frontend Modifications

#### 3.1 Modified GameManager for Server Candles
```typescript
// src/managers/GameManager.ts (modified)
export class GameManager {
    private serverCandles: CandleData[] = [];
    private currentIndex = 0;
    private playbackTimer: NodeJS.Timeout | null = null;
    
    async startNewRound(): Promise<void> {
        try {
            // Get pre-generated candles from server
            const response = await api.post('/api/game/start');
            
            if (!response.data.success) {
                throw new Error(response.data.error);
            }
            
            // Store server-provided candles
            this.serverCandles = response.data.round.candles;
            this.currentRound = {
                roundId: response.data.round.id,
                seed: response.data.round.seed,
                config: response.data.round.config
            };
            
            // Reset state
            this.currentIndex = 0;
            this.candles = [];
            this.isActive = true;
            this.roundStartTime = Date.now();
            
            // Start playback
            this.startCandlePlayback();
            
        } catch (error) {
            console.error('Failed to start round:', error);
            this.onError(error.message);
        }
    }
    
    private startCandlePlayback(): void {
        // Clear any existing timer
        if (this.playbackTimer) {
            clearInterval(this.playbackTimer);
        }
        
        // Play candles at configured interval
        const interval = this.currentRound?.config.candleIntervalMs || 65;
        
        this.playbackTimer = setInterval(() => {
            if (this.currentIndex >= this.serverCandles.length) {
                // Round complete
                this.endRound();
                return;
            }
            
            // Get next candle from server data
            const candle = this.serverCandles[this.currentIndex];
            this.candles.push(candle);
            
            // Emit candle event
            this.onCandleGenerated(candle);
            
            // Update position P&L if active
            if (this.activePosition) {
                this.updatePositionPnL(candle);
            }
            
            this.currentIndex++;
            
        }, interval);
    }
    
    // No more local candle generation!
    // Remove generateCandle() method
    // Remove CandleGenerator dependency
}
```

---

### Phase 4: PnL Results Modal

#### 4.1 Modal Component
```typescript
// src/components/PnLResultsModal.tsx
import React, { useState, useEffect } from 'react';

interface Trade {
    direction: 'LONG' | 'SHORT';
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    size: number;
    duration: number; // milliseconds
}

interface PnLResultsModalProps {
    isOpen: boolean;
    trades: Trade[];
    netPnL: number;
    finalPrice: number;
    onClose: () => void;
    onNextRound: () => void;
}

export const PnLResultsModal: React.FC<PnLResultsModalProps> = ({
    isOpen,
    trades,
    netPnL,
    finalPrice,
    onClose,
    onNextRound
}) => {
    const [countdown, setCountdown] = useState(5);
    
    useEffect(() => {
        if (!isOpen) return;
        
        setCountdown(5);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onNextRound();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(timer);
    }, [isOpen]);
    
    if (!isOpen) return null;
    
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="glass-container pnl-modal" onClick={e => e.stopPropagation()}>
                <div className="glass-filter" />
                <div className="glass-overlay" />
                <div className="glass-specular" />
                
                <div className="glass-content">
                    {/* Header */}
                    <div className="modal-header">
                        <h2>Round Complete</h2>
                        <p className="final-price">Final Price: ${finalPrice.toFixed(2)}</p>
                    </div>
                    
                    {/* Main PnL Display */}
                    <div className="pnl-display">
                        <div className="pnl-label">Net P&L</div>
                        <div className={`pnl-amount ${netPnL >= 0 ? 'profit' : 'loss'}`}>
                            {netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)}
                        </div>
                    </div>
                    
                    {/* Trades Table */}
                    {trades.length > 0 && (
                        <div className="trades-section">
                            <h3>Trades ({trades.length})</h3>
                            <table className="trades-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Entry</th>
                                        <th>Exit</th>
                                        <th>P&L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trades.map((trade, i) => (
                                        <tr key={i}>
                                            <td className={trade.direction.toLowerCase()}>
                                                {trade.direction}
                                            </td>
                                            <td>${trade.entryPrice.toFixed(2)}</td>
                                            <td>${trade.exitPrice.toFixed(2)}</td>
                                            <td className={trade.pnl >= 0 ? 'profit' : 'loss'}>
                                                {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    {/* Countdown */}
                    <div className="countdown-section">
                        <button className="next-round-btn" onClick={onNextRound}>
                            Next Round in {countdown}s
                        </button>
                        <button className="close-btn" onClick={onClose}>
                            Review Chart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
```

#### 4.2 Modal Styles
```css
/* src/styles/PnLModal.css */
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
}

.pnl-modal {
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    padding: 2rem;
}

.modal-header {
    text-align: center;
    margin-bottom: 2rem;
}

.modal-header h2 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: rgba(255, 255, 255, 0.9);
}

.final-price {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
}

.pnl-display {
    text-align: center;
    margin: 2rem 0;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
}

.pnl-label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 0.5rem;
}

.pnl-amount {
    font-size: 3rem;
    font-weight: 700;
    letter-spacing: -1px;
}

.pnl-amount.profit {
    color: #00FF88;
    text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
}

.pnl-amount.loss {
    color: #FF4444;
    text-shadow: 0 0 20px rgba(255, 68, 68, 0.5);
}

.trades-section {
    margin: 2rem 0;
}

.trades-section h3 {
    font-size: 1rem;
    margin-bottom: 1rem;
    color: rgba(255, 255, 255, 0.8);
}

.trades-table {
    width: 100%;
    border-collapse: collapse;
}

.trades-table th {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
}

.trades-table td {
    padding: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.trades-table .long {
    color: #00FF88;
}

.trades-table .short {
    color: #FF4444;
}

.countdown-section {
    margin-top: 2rem;
    display: flex;
    gap: 1rem;
}

.next-round-btn {
    flex: 1;
    padding: 1rem;
    background: linear-gradient(135deg, #00FF88 0%, #00CC70 100%);
    border: none;
    border-radius: 8px;
    color: #000;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
}

.next-round-btn:hover {
    transform: scale(1.02);
}

.close-btn {
    padding: 1rem 2rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
}
```

---

### Phase 5: Integration & Timing

#### 5.1 Modified CandlestickChart Component
```typescript
// src/components/CandlestickChart.tsx (modified)
const CandlestickChart = () => {
    const [showPnLModal, setShowPnLModal] = useState(false);
    const [roundSummary, setRoundSummary] = useState(null);
    const gameManagerRef = useRef<GameManager>(null);
    
    useEffect(() => {
        const gameManager = new GameManager();
        
        // Listen for round complete
        gameManager.onRoundComplete = (summary) => {
            setRoundSummary(summary);
            setShowPnLModal(true);
        };
        
        gameManagerRef.current = gameManager;
    }, []);
    
    const handleNextRound = () => {
        setShowPnLModal(false);
        gameManagerRef.current?.startNewRound();
    };
    
    return (
        <>
            {/* Existing chart UI */}
            
            <PnLResultsModal
                isOpen={showPnLModal}
                trades={roundSummary?.trades || []}
                netPnL={roundSummary?.netPnL || 0}
                finalPrice={roundSummary?.finalPrice || 0}
                onClose={() => setShowPnLModal(false)}
                onNextRound={handleNextRound}
            />
        </>
    );
};
```

#### 5.2 Timing Optimization
```typescript
// Preload next round during current round
class GameManager {
    private nextRoundData: any = null;
    
    private async preloadNextRound(): Promise<void> {
        try {
            // Start loading next round data at 80% completion
            const response = await api.post('/api/game/prepare-next');
            this.nextRoundData = response.data.round;
        } catch (error) {
            console.error('Failed to preload next round:', error);
        }
    }
    
    async startNewRound(): Promise<void> {
        // Use preloaded data if available
        if (this.nextRoundData) {
            this.serverCandles = this.nextRoundData.candles;
            this.currentRound = this.nextRoundData;
            this.nextRoundData = null;
            // Start immediately
            this.startCandlePlayback();
        } else {
            // Fall back to normal loading
            await this.loadRoundFromServer();
        }
        
        // Preload next round at 25 seconds (83% through)
        setTimeout(() => this.preloadNextRound(), 25000);
    }
}
```

---

## Implementation Timeline

### Day 1: Backend Infrastructure
- [ ] Create missing database files
- [ ] Implement SQLite schema
- [ ] Add database connection class
- [ ] Create mock AptosService
- [ ] Test database operations

### Day 2: Server-Side Candle Generation
- [ ] Port CandleGenerator to backend
- [ ] Create CandleGenerationService
- [ ] Implement /api/game/start endpoint
- [ ] Add candle storage to database
- [ ] Test candle generation performance

### Day 3: Frontend Integration
- [ ] Modify GameManager for server candles
- [ ] Remove local candle generation
- [ ] Update API client
- [ ] Test round playback
- [ ] Verify timing accuracy

### Day 4: PnL Modal Implementation
- [ ] Create PnLResultsModal component
- [ ] Add glassmorphism styles
- [ ] Implement countdown timer
- [ ] Add trade summary table
- [ ] Test modal transitions

### Day 5: Polish & Optimization
- [ ] Implement round preloading
- [ ] Smooth transitions between rounds
- [ ] Add error handling
- [ ] Performance testing
- [ ] Final integration testing

---

## Technical Considerations

### Performance Targets
- Candle generation: < 50ms for 460 candles
- API response time: < 200ms
- Modal transition: < 100ms
- Memory usage: < 10MB per round

### Security Measures
- All prices verified server-side
- Trades validated against server candles
- No client-side price manipulation
- Rate limiting on API endpoints

### Error Handling
- Network failures during round start
- Database connection issues
- Invalid candle data
- Modal display errors

### Testing Strategy
1. Unit tests for candle generation
2. Integration tests for API endpoints
3. E2E tests for complete round flow
4. Performance benchmarks
5. Security penetration testing

---

## Next Steps After Implementation

1. **Aptos Integration** (Week 2)
   - Replace mock with real Aptos randomness
   - Add wallet authentication
   - Implement on-chain settlements

2. **Multiplayer Features** (Week 3)
   - Shared rounds with same seed
   - Real-time leaderboards
   - Live trade visualization

3. **Advanced Features** (Week 4)
   - Tournament mode
   - Historical replays
   - Advanced analytics

This plan provides a clear path to implement server-side candle generation with a polished PnL modal, eliminating the dead time between rounds while maintaining security and performance. 
