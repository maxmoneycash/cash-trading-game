# Cash Trading Game - Comprehensive Implementation Plan
## Based on Sam's PR Analysis & Technical Requirements

---

## Executive Summary

**DECISION: ACCEPT SAM'S PR** - The `feature/game_manager` branch provides exactly the foundation we need. Sam has solved the core architectural challenges (deterministic generation, database design, API structure) while keeping complexity manageable. This analysis provides the complete implementation roadmap to transform Sam's foundation into a production-ready trading game with real Aptos integration.

**Key Insight**: Sam's approach of deterministic seed-based generation + REST API + SQLite is far superior to our original complex WebSocket/Redis/Rust architecture. We can ship faster, debug easier, and scale incrementally.

---

## Current State Analysis

### What We Have (Main Branch)
```
src/
├── components/CandlestickChart.tsx    # Pure client-side game, hardcoded balance: 1000
├── hooks/useAptos.ts                  # Mock wallet integration (simulated-account-address)
├── hooks/useSocket.ts                 # WebSocket hooks (unused by main app)
├── hooks/useGameState.ts              # Game state management (unused by main app)
└── utils/generateBitcoinData.ts       # Static historical Bitcoin data

server/src/index.ts                    # Basic Socket.io server, in-memory state, no persistence
```

**Current System Limitations:**
- No user authentication or persistence
- No backend integration in main app
- Hardcoded balances and mock data
- No verifiable randomness
- No trade verification or settlement

### What Sam Built (feature/game_manager PR)
```
server/
├── database/
│   ├── connection.ts                  # SQLite connection with promisified methods
│   ├── schema.sql                     # Users, Rounds, Trades tables
│   └── game.db                        # SQLite database file
├── routes/game.ts                     # REST API for round management
└── services/AptosService.ts           # Mock Aptos service (256-bit seeds)

src/
├── managers/GameManager.ts            # Complete game lifecycle management
├── utils/CandleGenerator.ts           # Deterministic candle generation
├── services/api.ts                    # API service layer
└── components/GameManagerTest.tsx     # Test interface for new system
```

**Sam's Achievements:**
- ✅ **Deterministic Generation**: Same seed = identical candles always
- ✅ **Database Foundation**: Proper relational schema with foreign keys
- ✅ **REST API**: Simple HTTP endpoints instead of WebSocket complexity
- ✅ **Replay System**: URL-based replay for debugging (`?replay=roundId`)
- ✅ **Game Lifecycle**: Complete round management with state tracking
- ✅ **Mock Aptos Ready**: Easy to replace with real implementation

---

## Implementation Priority Matrix

### PHASE 1: PR Integration & Foundation (Week 1)

#### Day 1: PR Acceptance & Testing
**Objective**: Merge Sam's PR and verify all functionality works

```bash
# Step 1: Accept PR
git checkout main
git pull origin main  # Get latest changes
git merge feature/game_manager

# Step 2: Install dependencies
npm install
cd server && npm install && cd ..

# Step 3: Test Sam's implementation
npm run dev  # Start frontend
cd server && npm run dev  # Start backend

# Step 4: Verify functionality
# Visit http://localhost:3000?test=true
# Click "Test Game API" button
# Verify database creation and round generation
# Test replay system with URL parameters
```

**Success Criteria:**
- [ ] PR merges without conflicts
- [ ] Both frontend and backend start successfully
- [ ] GameManagerTest interface loads and functions
- [ ] Database tables are created automatically
- [ ] Mock Aptos service generates seeds
- [ ] Replay system works with URL parameters

**Risk Mitigation:**
- Keep original system accessible via default route
- Document any merge conflicts and resolution steps
- Create backup branch before merge

#### Day 2-3: Database Schema Enhancement
**Objective**: Extend Sam's schema for production authentication and financial tracking

**Current Sam's Schema:**
```sql
-- Sam's Users table (basic)
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    balance REAL DEFAULT 1000.0,  -- Hardcoded starting balance
    locked_balance REAL DEFAULT 0.0,
    total_pnl REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);
```

**Enhanced Production Schema:**
```sql
-- Enhanced Users table with authentication
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    aptos_address TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,  -- For signature verification
    
    -- Auto-generated username from address
    username TEXT GENERATED ALWAYS AS (
        'Player_' || substr(aptos_address, 3, 6)
    ) STORED,
    display_name TEXT,  -- User can customize this
    
    -- Financial Balances
    game_balance REAL DEFAULT 0.0,  -- In-game balance (not hardcoded)
    locked_balance REAL DEFAULT 0.0,  -- Funds locked in active trades
    lifetime_deposited REAL DEFAULT 0.0,  -- Total APT deposited
    lifetime_withdrawn REAL DEFAULT 0.0,  -- Total APT withdrawn
    lifetime_pnl REAL DEFAULT 0.0,  -- Lifetime profit/loss
    
    -- Authentication & Session Management
    last_challenge TEXT,  -- Last auth challenge sent
    challenge_expires_at DATETIME,  -- Challenge expiration
    session_token TEXT,  -- Current JWT token hash
    session_expires_at DATETIME,  -- Session expiration
    last_wallet_signature TEXT,  -- Last verified signature
    
    -- Game Statistics
    total_rounds_played INTEGER DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    best_round_pnl REAL DEFAULT 0.0,
    worst_round_pnl REAL DEFAULT 0.0,
    average_round_duration INTEGER DEFAULT 0,  -- in seconds
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    last_active DATETIME,
    
    -- Constraints
    CHECK (game_balance >= 0),
    CHECK (locked_balance >= 0),
    CHECK (lifetime_deposited >= 0),
    CHECK (lifetime_withdrawn >= 0)
);

-- Enhanced Rounds table with Aptos integration
CREATE TABLE rounds (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT NOT NULL,
    
    -- Aptos Blockchain Integration
    aptos_seed TEXT NOT NULL,  -- 256-bit hex seed from Aptos randomness
    aptos_block_height INTEGER,  -- Block where seed was generated
    aptos_transaction_hash TEXT,  -- Transaction that generated seed
    seed_verification_hash TEXT,  -- SHA256(seed) for quick verification
    
    -- Round Configuration
    round_type TEXT DEFAULT 'INDIVIDUAL' CHECK (round_type IN ('INDIVIDUAL', 'MULTIPLAYER')),
    duration_ms INTEGER DEFAULT 30000,  -- 30 second rounds
    candle_interval_ms INTEGER DEFAULT 65,  -- 65ms per candle
    total_candles INTEGER DEFAULT 460,  -- ~30 seconds worth
    initial_price REAL DEFAULT 100.0,
    
    -- Game Parameters (JSON configuration)
    config TEXT,  -- Volatility, house edge, liquidation params
    
    -- Round State
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'DISPUTED', 'CANCELLED')),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    final_price REAL,
    
    -- Round Results
    total_trades INTEGER DEFAULT 0,
    total_volume REAL DEFAULT 0.0,
    house_edge_realized REAL DEFAULT 0.0,  -- Actual house profit
    
    -- Multiplayer Support (future)
    max_participants INTEGER DEFAULT 1,
    current_participants INTEGER DEFAULT 0,
    
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, aptos_seed)  -- Prevent seed reuse per user
);

-- Enhanced Trades table with verification
CREATE TABLE trades (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    round_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    -- Trade Execution Details
    direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    size REAL NOT NULL,  -- Position size in game currency
    leverage REAL DEFAULT 1.0,  -- Future: leverage support
    
    -- Entry Details
    entry_price REAL NOT NULL,
    entry_candle_index INTEGER NOT NULL,
    entry_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    entry_server_time INTEGER NOT NULL,  -- Server milliseconds for verification
    
    -- Exit Details
    exit_price REAL,
    exit_candle_index INTEGER,
    exit_timestamp DATETIME,
    exit_server_time INTEGER,
    
    -- Financial Results
    gross_pnl REAL DEFAULT 0.0,  -- Before fees
    trading_fees REAL DEFAULT 0.0,  -- 0.2% of position size
    net_pnl REAL DEFAULT 0.0,  -- After fees
    
    -- Trade Status & Verification
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'LIQUIDATED')),
    entry_price_verified BOOLEAN DEFAULT FALSE,  -- Server verified entry price
    exit_price_verified BOOLEAN DEFAULT FALSE,   -- Server verified exit price
    settlement_status TEXT DEFAULT 'PENDING' CHECK (settlement_status IN ('PENDING', 'SETTLED', 'DISPUTED')),
    
    -- Risk Management
    max_drawdown REAL DEFAULT 0.0,  -- Worst PnL during trade
    time_in_trade INTEGER DEFAULT 0,  -- Milliseconds held
    
    FOREIGN KEY (round_id) REFERENCES rounds (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    
    -- Constraints
    CHECK (size > 0),
    CHECK (entry_price > 0),
    CHECK (leverage > 0)
);

-- Financial Transactions (Deposits/Withdrawals)
CREATE TABLE financial_transactions (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT NOT NULL,
    
    -- Transaction Details
    type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL')),
    amount REAL NOT NULL,  -- Amount in APT
    
    -- Aptos Blockchain Integration
    aptos_transaction_hash TEXT UNIQUE,  -- On-chain transaction
    aptos_block_height INTEGER,
    gas_used INTEGER,
    gas_price INTEGER,
    
    -- Status Tracking
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    confirmed_at DATETIME,  -- Blockchain confirmation
    
    -- Metadata
    request_ip TEXT,  -- For fraud detection
    user_agent TEXT,
    notes TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users (id),
    CHECK (amount > 0)
);

-- Settlement Records (End-of-round blockchain settlements)
CREATE TABLE settlements (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    round_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    -- Settlement Details
    gross_pnl REAL NOT NULL,  -- Total PnL before fees
    house_fees REAL NOT NULL,  -- House edge taken
    net_pnl REAL NOT NULL,  -- Final amount to settle
    
    -- Blockchain Integration
    aptos_settlement_hash TEXT,  -- Settlement transaction
    aptos_block_height INTEGER,
    
    -- Status
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED')),
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME,
    confirmed_at DATETIME,
    
    FOREIGN KEY (round_id) REFERENCES rounds (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(round_id, user_id)  -- One settlement per user per round
);

-- Performance Indexes
CREATE INDEX idx_users_address ON users(aptos_address);
CREATE INDEX idx_users_session ON users(session_token) WHERE session_token IS NOT NULL;
CREATE INDEX idx_rounds_status_user ON rounds(status, user_id);
CREATE INDEX idx_rounds_aptos ON rounds(aptos_transaction_hash);
CREATE INDEX idx_trades_round_user ON trades(round_id, user_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_settlement ON trades(settlement_status);
CREATE INDEX idx_financial_user_status ON financial_transactions(user_id, status);
CREATE INDEX idx_settlements_round ON settlements(round_id);
```

**Implementation Steps:**
1. Create migration script to enhance Sam's existing schema
2. Add database connection methods for new tables
3. Update TypeScript interfaces to match new schema
4. Test schema with sample data

#### Day 4-5: Authentication System Implementation
**Objective**: Replace mock authentication with real Aptos wallet integration

**Technical Considerations:**

**1. Wallet Integration Challenges:**
- **Multiple Wallet Support**: Petra, Martian, Pontem wallets have different APIs
- **Mobile Compatibility**: Wallet apps vs browser extensions
- **Connection Persistence**: Handle wallet disconnections gracefully
- **Network Switching**: Testnet vs mainnet wallet configurations

**2. Security Considerations:**
- **Challenge-Response**: Prevent replay attacks with time-limited challenges
- **Session Management**: Short-lived JWTs (15 minutes) with refresh tokens
- **Rate Limiting**: Prevent brute force attacks on auth endpoints
- **IP Tracking**: Log authentication attempts for fraud detection

**Frontend Wallet Service Implementation:**
```typescript
// src/services/WalletService.ts
interface WalletProvider {
  name: string;
  connect(): Promise<{address: string, publicKey: string}>;
  signMessage(message: string): Promise<string>;
  isInstalled(): boolean;
}

class PetraWalletProvider implements WalletProvider {
  name = 'Petra';
  
  isInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.aptos;
  }
  
  async connect(): Promise<{address: string, publicKey: string}> {
    if (!this.isInstalled()) {
      throw new Error('Petra Wallet not installed');
    }
    
    try {
      const response = await window.aptos.connect();
      return {
        address: response.address,
        publicKey: response.publicKey
      };
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('User rejected wallet connection');
      }
      throw new Error('Failed to connect to Petra Wallet');
    }
  }
  
  async signMessage(message: string): Promise<string> {
    try {
      const result = await window.aptos.signMessage({
        message,
        nonce: Date.now().toString()
      });
      return result.signature;
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('User rejected message signing');
      }
      throw new Error('Failed to sign message');
    }
  }
}

class MartianWalletProvider implements WalletProvider {
  name = 'Martian';
  
  isInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.martian;
  }
  
  async connect(): Promise<{address: string, publicKey: string}> {
    if (!this.isInstalled()) {
      throw new Error('Martian Wallet not installed');
    }
    
    const response = await window.martian.connect();
    return {
      address: response.address,
      publicKey: response.publicKey
    };
  }
  
  async signMessage(message: string): Promise<string> {
    const result = await window.martian.signMessage({
      message,
      nonce: Date.now().toString()
    });
    return result.signature;
  }
}

export class WalletService {
  private providers: WalletProvider[] = [
    new PetraWalletProvider(),
    new MartianWalletProvider()
  ];
  private currentProvider: WalletProvider | null = null;
  private currentWallet: {address: string, publicKey: string} | null = null;
  
  getAvailableWallets(): WalletProvider[] {
    return this.providers.filter(p => p.isInstalled());
  }
  
  async connectWallet(providerName?: string): Promise<{address: string, publicKey: string}> {
    const availableWallets = this.getAvailableWallets();
    
    if (availableWallets.length === 0) {
      throw new Error('No Aptos wallets found. Please install Petra or Martian Wallet.');
    }
    
    // Use specified provider or first available
    const provider = providerName 
      ? availableWallets.find(p => p.name === providerName)
      : availableWallets[0];
    
    if (!provider) {
      throw new Error(`Wallet ${providerName} not found or not installed`);
    }
    
    try {
      this.currentWallet = await provider.connect();
      this.currentProvider = provider;
      
      // Store in localStorage for persistence
      localStorage.setItem('connected_wallet', JSON.stringify({
        provider: provider.name,
        address: this.currentWallet.address
      }));
      
      return this.currentWallet;
    } catch (error) {
      console.error(`Failed to connect ${provider.name}:`, error);
      throw error;
    }
  }
  
  async authenticateUser(): Promise<{token: string, userId: string, user: any}> {
    if (!this.currentWallet || !this.currentProvider) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // Step 1: Request challenge from backend
      const challengeResponse = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          address: this.currentWallet.address,
          publicKey: this.currentWallet.publicKey
        })
      });
      
      if (!challengeResponse.ok) {
        throw new Error('Failed to get authentication challenge');
      }
      
      const { challenge, expires } = await challengeResponse.json();
      
      // Step 2: Sign challenge with wallet
      const signature = await this.currentProvider.signMessage(challenge);
      
      // Step 3: Verify signature with backend
      const authResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          address: this.currentWallet.address,
          publicKey: this.currentWallet.publicKey,
          challenge,
          signature
        })
      });
      
      if (!authResponse.ok) {
        const error = await authResponse.json();
        throw new Error(error.message || 'Authentication failed');
      }
      
      const authData = await authResponse.json();
      
      // Store authentication data
      localStorage.setItem('auth_token', authData.token);
      localStorage.setItem('user_id', authData.userId);
      localStorage.setItem('token_expires', authData.expiresAt);
      
      return authData;
      
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }
  
  // Session management
  getStoredAuth(): {token: string, userId: string} | null {
    const token = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id');
    const expires = localStorage.getItem('token_expires');
    
    if (token && userId && expires) {
      // Check if token is expired
      if (new Date(expires) > new Date()) {
        return { token, userId };
      } else {
        this.logout(); // Clear expired session
      }
    }
    
    return null;
  }
  
  async refreshSession(): Promise<{token: string, expiresAt: string}> {
    const currentAuth = this.getStoredAuth();
    if (!currentAuth) {
      throw new Error('No active session to refresh');
    }
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentAuth.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      this.logout();
      throw new Error('Session refresh failed');
    }
    
    const { token, expiresAt } = await response.json();
    
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token_expires', expiresAt);
    
    return { token, expiresAt };
  }
  
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('token_expires');
    localStorage.removeItem('connected_wallet');
    this.currentWallet = null;
    this.currentProvider = null;
  }
  
  isAuthenticated(): boolean {
    return this.getStoredAuth() !== null;
  }
  
  getCurrentWallet(): {address: string, publicKey: string} | null {
    return this.currentWallet;
  }
}
```

**Backend Authentication Implementation:**
```typescript
// server/routes/auth.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../database/connection';
import { AptosClient, HexString } from 'aptos';

const router = express.Router();
const aptosClient = new AptosClient(process.env.APTOS_NODE_URL!);

// POST /api/auth/challenge - Generate authentication challenge
router.post('/challenge', async (req, res) => {
  try {
    const { address, publicKey } = req.body;
    
    // Validate address format
    if (!address || !address.match(/^0x[a-fA-F0-9]{64}$/)) {
      return res.status(400).json({ error: 'Invalid Aptos address format' });
    }
    
    // Generate cryptographically secure challenge
    const challenge = `Sign this message to authenticate with Cash Trading Game.\n\nAddress: ${address}\nTimestamp: ${Date.now()}\nNonce: ${crypto.randomBytes(16).toString('hex')}`;
    
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    // Store challenge in database (or Redis for production)
    await db.updateUserChallenge(address, challenge, expires);
    
    res.json({
      challenge,
      expires: expires.toISOString()
    });
    
  } catch (error) {
    console.error('Challenge generation failed:', error);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

// POST /api/auth/verify - Verify signature and create session
router.post('/verify', async (req, res) => {
  try {
    const { address, publicKey, challenge, signature } = req.body;
    
    // Validate inputs
    if (!address || !publicKey || !challenge || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get stored challenge
    const user = await db.getUserByAddress(address);
    if (!user || user.last_challenge !== challenge) {
      return res.status(401).json({ error: 'Invalid or expired challenge' });
    }
    
    // Check challenge expiration
    if (!user.challenge_expires_at || new Date(user.challenge_expires_at) < new Date()) {
      return res.status(401).json({ error: 'Challenge expired' });
    }
    
    // Verify signature
    const isValidSignature = await verifyAptosSignature(
      challenge,
      signature,
      publicKey,
      address
    );
    
    if (!isValidSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Create or update user
    let finalUser;
    if (!user.id) {
      // New user
      finalUser = await db.createUser({
        aptosAddress: address,
        publicKey,
        lastWalletSignature: signature
      });
    } else {
      // Existing user - update login info
      await db.updateUserLogin(user.id, signature);
      finalUser = await db.getUserById(user.id);
    }
    
    // Generate session token
    const sessionPayload = {
      userId: finalUser.id,
      address: finalUser.aptos_address,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
    };
    
    const token = jwt.sign(sessionPayload, process.env.JWT_SECRET!);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    // Store session in database
    await db.updateUserSession(finalUser.id, token, expiresAt);
    
    res.json({
      userId: finalUser.id,
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: finalUser.id,
        address: finalUser.aptos_address,
        username: finalUser.username,
        displayName: finalUser.display_name,
        gameBalance: finalUser.game_balance,
        lockedBalance: finalUser.locked_balance,
        lifetimePnl: finalUser.lifetime_pnl
      }
    });
    
  } catch (error) {
    console.error('Authentication verification failed:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Signature verification function
async function verifyAptosSignature(
  message: string,
  signature: string,
  publicKey: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    // Create message bytes
    const messageBytes = new TextEncoder().encode(message);
    
    // Verify signature using Aptos SDK
    const pubKey = new HexString(publicKey);
    const sig = new HexString(signature);
    
    // Verify the signature matches the public key
    const isValidSig = await aptosClient.verifySignature({
      message: messageBytes,
      signature: sig.toUint8Array(),
      publicKey: pubKey.toUint8Array()
    });
    
    if (!isValidSig) return false;
    
    // Verify the public key corresponds to the expected address
    const derivedAddress = await aptosClient.getAddressFromPublicKey(pubKey);
    return derivedAddress.toString() === expectedAddress;
    
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export default router;
```

**Authentication Middleware:**
```typescript
// server/middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from '../database/connection';

interface AuthRequest extends Request {
  user?: {
    id: string;
    address: string;
    gameBalance: number;
    lockedBalance: number;
  };
}

export const authenticateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Check if session is still valid in database
    const user = await db.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (!user.session_token || user.session_token !== token) {
      return res.status(401).json({ error: 'Session invalid' });
    }
    
    if (!user.session_expires_at || new Date(user.session_expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Add user to request
    req.user = {
      id: user.id,
      address: user.aptos_address,
      gameBalance: user.game_balance,
      lockedBalance: user.locked_balance
    };
    
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Rate limiting for authentication endpoints
import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per IP per 15 minutes
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const challengeRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 challenges per IP per minute
  message: 'Too many challenge requests, please slow down',
});
```

#### Day 6-7: Real Aptos Integration
**Objective**: Replace Sam's mock AptosService with real blockchain integration

**Technical Considerations:**

**1. Aptos Randomness API Integration:**
- **Gas Costs**: Each randomness call costs ~2000 gas units (~$0.0002)
- **Latency**: Blockchain calls take 600-1000ms for finality
- **Rate Limits**: Aptos nodes have request rate limits
- **Error Handling**: Network failures, insufficient gas, node downtime

**2. Seed Generation Strategy:**
- **Pre-generation**: Generate seed before round starts (not during)
- **Verification**: Store seed hash for later verification
- **Fallback**: Have backup seed generation if Aptos fails

**Production Aptos Service:**
```typescript
// server/services/ProductionAptosService.ts
import { AptosClient, AptosAccount, HexString, BCS } from 'aptos';
import crypto from 'crypto';

export interface SeedData {
  seed: string;          // 256-bit hex seed
  blockHeight: number;   // Block where seed was generated
  transactionHash: string; // Transaction hash
  timestamp: number;     // Generation timestamp
  gasUsed: number;       // Gas consumed
  verificationHash: string; // SHA256(seed) for quick verification
}

export class ProductionAptosService {
  private client: AptosClient;
  private gameAccount: AptosAccount;
  private isInitialized: boolean = false;
  
  constructor() {
    const nodeUrl = process.env.APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1';
    this.client = new AptosClient(nodeUrl);
    
    // Load game account from environment
    const privateKeyHex = process.env.APTOS_GAME_PRIVATE_KEY;
    if (!privateKeyHex) {
      throw new Error('APTOS_GAME_PRIVATE_KEY environment variable required');
    }
    
    try {
      const privateKeyBytes = HexString.ensure(privateKeyHex).toUint8Array();
      this.gameAccount = new AptosAccount(privateKeyBytes);
      console.log('🔗 Aptos service initialized with account:', this.gameAccount.address().hex());
    } catch (error) {
      throw new Error(`Invalid APTOS_GAME_PRIVATE_KEY: ${error.message}`);
    }
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Verify account exists and has balance
      const accountData = await this.client.getAccount(this.gameAccount.address());
      console.log('✅ Game account verified:', accountData.address);
      
      // Check APT balance
      const balance = await this.getAccountBalance(this.gameAccount.address().hex());
      console.log(`💰 Game account balance: ${balance} APT`);
      
      if (balance < 1) {
        console.warn('⚠️ Low game account balance - may not be able to generate seeds');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Aptos service:', error);
      throw error;
    }
  }
  
  async generateRandomSeed(): Promise<SeedData> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      console.log('🎲 Generating random seed from Aptos...');
      
      // Create transaction payload for randomness
      const payload = {
        function: "0x1::randomness::u256_integer",
        type_arguments: [],
        arguments: []
      };
      
      // Build transaction
      const txn = await this.client.generateTransaction(
        this.gameAccount.address(),
        payload,
        {
          gas_unit_price: "100",  // 100 octas per gas unit
          max_gas_amount: "5000"  // Max 5000 gas units
        }
      );
      
      // Sign and submit
      const signedTxn = await this.client.signTransaction(this.gameAccount, txn);
      const pendingTxn = await this.client.submitTransaction(signedTxn);
      
      console.log('📝 Submitted randomness transaction:', pendingTxn.hash);
      
      // Wait for confirmation with timeout
      const confirmedTxn = await Promise.race([
        this.client.waitForTransaction(pendingTxn.hash),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 10000)
        )
      ]);
      
      // Get full transaction details
      const txDetails = await this.client.getTransactionByHash(pendingTxn.hash);
      
      // Extract seed from transaction
      const seed = this.extractSeedFromTransaction(txDetails);
      const verificationHash = crypto.createHash('sha256').update(seed).digest('hex');
      
      const seedData: SeedData = {
        seed: seed.startsWith('0x') ? seed : `0x${seed}`,
        blockHeight: parseInt(txDetails.version),
        transactionHash: pendingTxn.hash,
        timestamp: Date.now(),
        gasUsed: parseInt(txDetails.gas_used),
        verificationHash
      };
      
      console.log('✅ Generated Aptos seed:', {
        seed: seedData.seed.substring(0, 10) + '...',
        blockHeight: seedData.blockHeight,
        gasUsed: seedData.gasUsed
      });
      
      return seedData;
      
    } catch (error) {
      console.error('❌ Aptos seed generation failed:', error);
      
      // Fallback: generate cryptographically secure seed locally
      // This maintains game functionality if Aptos is down
      const fallbackSeed = `0x${crypto.randomBytes(32).toString('hex')}`;
      const verificationHash = crypto.createHash('sha256').update(fallbackSeed).digest('hex');
      
      console.warn('⚠️ Using fallback seed generation');
      
      return {
        seed: fallbackSeed,
        blockHeight: 0, // Indicates fallback
        transactionHash: 'fallback',
        timestamp: Date.now(),
        gasUsed: 0,
        verificationHash
      };
    }
  }
  
  private extractSeedFromTransaction(txDetails: any): string {
    // Method 1: Look for randomness events
    if (txDetails.events && txDetails.events.length > 0) {
      for (const event of txDetails.events) {
        if (event.type.includes('randomness') || event.type.includes('Random')) {
          if (event.data && event.data.value) {
            return event.data.value;
          }
        }
      }
    }
    
    // Method 2: Look in transaction payload/return value
    if (txDetails.payload && txDetails.payload.function === "0x1::randomness::u256_integer") {
      // Check if there's a return value or output
      if (txDetails.output && txDetails.output.length > 0) {
        return txDetails.output[0];
      }
    }
    
    // Method 3: Fallback to transaction hash
    console.warn('⚠️ Could not extract seed from randomness transaction, using tx hash');
    return txDetails.hash;
  }
  
  async getAccountBalance(address: string): Promise<number> {
    try {
      const resources = await this.client.getAccountResources({ accountAddress: address });
      
      const aptResource = resources.find(
        (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
      );
      
      if (aptResource) {
        const balance = (aptResource.data as { coin: { value: string } }).coin.value;
        return parseInt(balance) / 100000000; // Convert octas to APT
      }
      
      return 0;
    } catch (error) {
      console.error('Failed to get account balance:', error);
      return 0;
    }
  }
  
  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      const tx = await this.client.getTransactionByHash(txHash);
      return tx.success === true;
    } catch {
      return false;
    }
  }
  
  getNetworkInfo() {
    return {
      network: process.env.APTOS_NETWORK || 'mainnet',
      nodeUrl: this.client.nodeUrl,
      isTestnet: process.env.APTOS_NETWORK === 'testnet'
    };
  }
}

export const aptosService = new ProductionAptosService();
```

---

### PHASE 2: Production Features (Week 2)

#### Day 8-10: Frontend Integration
**Objective**: Connect Sam's GameManager to the main application

**Integration Challenges:**
1. **State Management**: Current app uses local React state, GameManager uses class-based state
2. **Chart Rendering**: Current app uses p5.js directly, need to bridge with GameManager
3. **User Experience**: Maintain smooth UX while adding authentication
4. **Backward Compatibility**: Keep original system working during transition

**Implementation Strategy:**
```typescript
// src/components/ProductionGameApp.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ProductionGameManager } from '../managers/ProductionGameManager';
import { WalletService } from '../services/WalletService';
import { CandleData } from '../managers/GameManager';

interface ProductionGameAppProps {
  // Props for customization
}

const ProductionGameApp: React.FC<ProductionGameAppProps> = () => {
  const gameManagerRef = useRef<ProductionGameManager | null>(null);
  const walletServiceRef = useRef<WalletService | null>(null);
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Game State
  const [gameState, setGameState] = useState<any>(null);
  const [currentCandle, setCurrentCandle] = useState<CandleData | null>(null);
  const [position, setPosition] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [pnl, setPnl] = useState(0);
  
  // UI State
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize services
  useEffect(() => {
    walletServiceRef.current = new WalletService();
    
    // Check for existing authentication
    const storedAuth = walletServiceRef.current.getStoredAuth();
    if (storedAuth) {
      initializeAuthenticatedUser(storedAuth);
    }
  }, []);
  
  const initializeAuthenticatedUser = async (authData: {token: string, userId: string}) => {
    try {
      setAuthLoading(true);
      
      // Get user profile
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get user profile');
      }
      
      const userData = await response.json();
      setUser(userData.user);
      setWalletAddress(userData.user.address);
      setBalance(userData.user.gameBalance);
      setIsAuthenticated(true);
      
      // Initialize GameManager with authenticated user
      gameManagerRef.current = new ProductionGameManager(authData.token);
      setupGameManagerCallbacks();
      
    } catch (error) {
      console.error('Failed to initialize authenticated user:', error);
      walletServiceRef.current?.logout();
      setError('Session expired. Please reconnect your wallet.');
    } finally {
      setAuthLoading(false);
    }
  };
  
  const handleWalletConnect = async (providerName: string) => {
    if (!walletServiceRef.current) return;
    
    try {
      setAuthLoading(true);
      setError(null);
      
      // Connect wallet
      const walletData = await walletServiceRef.current.connectWallet(providerName);
      setWalletAddress(walletData.address);
      
      // Authenticate user
      const authData = await walletServiceRef.current.authenticateUser();
      setUser(authData.user);
      setBalance(authData.user.gameBalance);
      setIsAuthenticated(true);
      setShowWalletModal(false);
      
      // Initialize GameManager
      gameManagerRef.current = new ProductionGameManager(authData.token);
      setupGameManagerCallbacks();
      
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };
  
  const setupGameManagerCallbacks = () => {
    if (!gameManagerRef.current) return;
    
    gameManagerRef.current.onCandleGenerated = (candle: CandleData) => {
      setCurrentCandle(candle);
    };
    
    gameManagerRef.current.onPositionUpdate = (updatedPosition: any) => {
      setPosition(updatedPosition);
      setPnl(updatedPosition.pnl);
    };
    
    gameManagerRef.current.onRoundComplete = (summary: any) => {
      setBalance(summary.newBalance);
      setPosition(null);
      setPnl(0);
    };
    
    gameManagerRef.current.onError = (error: string) => {
      setError(error);
    };
    
    // Update game state periodically
    const interval = setInterval(() => {
      if (gameManagerRef.current) {
        setGameState(gameManagerRef.current.getGameState());
      }
    }, 100);
    
    return () => clearInterval(interval);
  };
  
  const handleStartRound = async () => {
    if (!gameManagerRef.current) return;
    
    try {
      setError(null);
      await gameManagerRef.current.startAuthenticatedRound();
    } catch (error) {
      setError(error.message);
    }
  };
  
  const handleOpenPosition = async (direction: 'LONG' | 'SHORT') => {
    if (!gameManagerRef.current) return;
    
    try {
      const positionSize = balance * 0.2; // 20% of balance
      await gameManagerRef.current.openVerifiedPosition(direction, positionSize);
    } catch (error) {
      setError(error.message);
    }
  };
  
  const handleClosePosition = async () => {
    if (!gameManagerRef.current) return;
    
    try {
      await gameManagerRef.current.closePosition();
    } catch (error) {
      setError(error.message);
    }
  };
  
  // Render authentication UI if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthenticationScreen
        onConnect={handleWalletConnect}
        loading={authLoading}
        error={error}
        availableWallets={walletServiceRef.current?.getAvailableWallets() || []}
      />
    );
  }
  
  // Render main game interface
  return (
    <GameInterface
      user={user}
      balance={balance}
      pnl={pnl}
      gameState={gameState}
      currentCandle={currentCandle}
      position={position}
      onStartRound={handleStartRound}
      onOpenLong={() => handleOpenPosition('LONG')}
      onOpenShort={() => handleOpenPosition('SHORT')}
      onClosePosition={handleClosePosition}
      error={error}
    />
  );
};

export default ProductionGameApp;
```

#### Day 11-14: Financial Operations
**Objective**: Implement real money deposits, withdrawals, and balance management

**Technical Considerations:**

**1. Deposit Flow:**
- User initiates deposit through wallet
- Backend monitors blockchain for confirmation
- Update user balance after confirmation
- Handle failed/cancelled deposits

**2. Withdrawal Flow:**
- User requests withdrawal (must have sufficient balance)
- Backend queues withdrawal for processing
- Batch process withdrawals for gas efficiency
- Handle withdrawal failures and refunds

**3. Balance Management:**
- Separate game balance from wallet balance
- Lock funds during active trades
- Atomic balance updates (prevent race conditions)
- Audit trail for all balance changes

**Financial Endpoints Implementation:**
```typescript
// server/routes/financial.ts
import express from 'express';
import { authenticateUser } from '../middleware/auth';
import { db } from '../database/connection';
import { aptosService } from '../services/ProductionAptosService';

const router = express.Router();

// POST /api/financial/deposit - Initiate APT deposit
router.post('/deposit', authenticateUser, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = req.user!;
    
    // Validate amount
    if (!amount || amount <= 0 || amount > 10000) {
      return res.status(400).json({ error: 'Invalid deposit amount (0.01 - 10000 APT)' });
    }
    
    // Check daily deposit limit
    const todayDeposits = await db.getUserDailyDeposits(user.id);
    if (todayDeposits + amount > 1000) {
      return res.status(400).json({ error: 'Daily deposit limit exceeded (1000 APT)' });
    }
    
    // Create pending deposit record
    const deposit = await db.createFinancialTransaction({
      userId: user.id,
      type: 'DEPOSIT',
      amount,
      status: 'PENDING'
    });
    
    // Return deposit instructions
    res.json({
      depositId: deposit.id,
      instructions: {
        recipient: process.env.GAME_WALLET_ADDRESS,
        amount,
        memo: `DEPOSIT:${deposit.id}`,
        network: aptosService.getNetworkInfo().network
      },
      status: 'PENDING',
      message: 'Send APT to the provided address with the exact memo to complete deposit'
    });
    
  } catch (error) {
    console.error('Deposit initiation failed:', error);
    res.status(500).json({ error: 'Failed to initiate deposit' });
  }
});

// POST /api/financial/deposit/confirm - Confirm deposit with transaction hash
router.post('/deposit/confirm', authenticateUser, async (req, res) => {
  try {
    const { depositId, transactionHash } = req.body;
    const user = req.user!;
    
    // Get deposit record
    const deposit = await db.getFinancialTransaction(depositId);
    if (!deposit || deposit.user_id !== user.id || deposit.type !== 'DEPOSIT') {
      return res.status(404).json({ error: 'Deposit not found' });
    }
    
    if (deposit.status !== 'PENDING') {
      return res.status(400).json({ error: 'Deposit already processed' });
    }
    
    // Verify transaction on Aptos
    const isValid = await aptosService.verifyTransaction(transactionHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or failed transaction' });
    }
    
    // Get transaction details
    const txDetails = await aptosService.getTransactionDetails(transactionHash);
    
    // Verify amount and recipient
    if (!this.verifyDepositTransaction(txDetails, deposit.amount, process.env.GAME_WALLET_ADDRESS)) {
      return res.status(400).json({ error: 'Transaction verification failed' });
    }
    
    // Update deposit record
    await db.updateFinancialTransaction(depositId, {
      aptosTransactionHash: transactionHash,
      aptosBlockHeight: parseInt(txDetails.version),
      status: 'COMPLETED',
      processedAt: new Date()
    });
    
    // Update user balance
    await db.updateUserBalance(user.id, user.gameBalance + deposit.amount);
    await db.updateUserLifetimeDeposited(user.id, deposit.amount);
    
    // Get updated user data
    const updatedUser = await db.getUserById(user.id);
    
    res.json({
      success: true,
      deposit: {
        id: deposit.id,
        amount: deposit.amount,
        transactionHash,
        status: 'COMPLETED'
      },
      newBalance: updatedUser.game_balance
    });
    
  } catch (error) {
    console.error('Deposit confirmation failed:', error);
    res.status(500).json({ error: 'Failed to confirm deposit' });
  }
});

// POST /api/financial/withdraw - Request withdrawal
router.post('/withdraw', authenticateUser, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = req.user!;
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }
    
    // Check available balance
    const availableBalance = user.gameBalance - user.lockedBalance;
    if (amount > availableBalance) {
      return res.status(400).json({ error: 'Insufficient available balance' });
    }
    
    // Check daily withdrawal limit
    const todayWithdrawals = await db.getUserDailyWithdrawals(user.id);
    if (todayWithdrawals + amount > 500) {
      return res.status(400).json({ error: 'Daily withdrawal limit exceeded (500 APT)' });
    }
    
    // Check minimum withdrawal
    if (amount < 0.1) {
      return res.status(400).json({ error: 'Minimum withdrawal is 0.1 APT' });
    }
    
    // Create withdrawal request
    const withdrawal = await db.createFinancialTransaction({
      userId: user.id,
      type: 'WITHDRAWAL',
      amount,
      status: 'PENDING'
    });
    
    // Lock the funds immediately
    await db.updateUserLockedBalance(user.id, user.lockedBalance + amount);
    
    res.json({
      withdrawalId: withdrawal.id,
      amount,
      status: 'PENDING',
      estimatedProcessingTime: '1-24 hours',
      message: 'Withdrawal request submitted. Funds will be sent to your connected wallet address.'
    });
    
    // Queue for batch processing
    await queueWithdrawalForProcessing(withdrawal.id);
    
  } catch (error) {
    console.error('Withdrawal request failed:', error);
    res.status(500).json({ error: 'Failed to request withdrawal' });
  }
});

export default router;
```

#### Day 15-17: Trade Verification & Settlement
**Objective**: Implement server-side trade verification and settlement system

**Technical Considerations:**

**1. Trade Verification Challenges:**
- **Timing Attacks**: Clients might try to submit trades with favorable timing
- **Price Manipulation**: Clients might claim different prices than actual
- **Race Conditions**: Multiple trades at same candle index
- **Network Latency**: Client-server time synchronization

**2. Settlement Considerations:**
- **Atomic Operations**: All settlements must succeed or fail together
- **Gas Optimization**: Batch multiple user settlements in single transaction
- **Failure Recovery**: Handle failed settlements gracefully
- **Audit Trail**: Complete record of all settlement attempts

**Enhanced Trade Verification:**
```typescript
// server/routes/trade.ts
import express from 'express';
import { authenticateUser } from '../middleware/auth';
import { db } from '../database/connection';
import { CandleGenerator } from '../utils/CandleGenerator';

const router = express.Router();

// POST /api/trade/open - Open trading position with verification
router.post('/open', authenticateUser, async (req, res) => {
  try {
    const { roundId, direction, size, candleIndex, claimedPrice, clientTimestamp } = req.body;
    const user = req.user!;
    const serverTimestamp = Date.now();
    
    // Input validation
    if (!['LONG', 'SHORT'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid direction' });
    }
    
    if (!size || size <= 0 || size > user.gameBalance) {
      return res.status(400).json({ error: 'Invalid position size' });
    }
    
    // Get round and verify ownership
    const round = await db.getRoundById(roundId);
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }
    
    if (round.user_id !== user.id) {
      return res.status(403).json({ error: 'Not your round' });
    }
    
    if (round.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Round not active' });
    }
    
    // Check if user already has open position in this round
    const existingTrade = await db.getOpenTradeByRoundAndUser(roundId, user.id);
    if (existingTrade) {
      return res.status(400).json({ error: 'Position already open in this round' });
    }
    
    // Verify claimed price by regenerating candle
    const config = JSON.parse(round.config);
    const generator = new CandleGenerator(round.aptos_seed, config);
    const expectedCandle = generator.generateCandle(candleIndex);
    
    // Price verification with tolerance for floating point precision
    const priceTolerance = 0.001;
    if (Math.abs(expectedCandle.close - claimedPrice) > priceTolerance) {
      return res.status(400).json({ 
        error: 'Price verification failed',
        expected: expectedCandle.close,
        claimed: claimedPrice,
        difference: Math.abs(expectedCandle.close - claimedPrice)
      });
    }
    
    // Timing verification - prevent trades too far in the future
    const roundStartTime = new Date(round.started_at).getTime();
    const expectedCandleTime = roundStartTime + (candleIndex * config.candle_interval_ms);
    const timeDifference = Math.abs(serverTimestamp - expectedCandleTime);
    
    if (timeDifference > 5000) { // 5 second tolerance
      return res.status(400).json({ error: 'Trade timing verification failed' });
    }
    
    // Calculate required margin (10% of position size)
    const requiredMargin = size * 0.1;
    const availableBalance = user.gameBalance - user.lockedBalance;
    
    if (requiredMargin > availableBalance) {
      return res.status(400).json({ error: 'Insufficient balance for margin requirement' });
    }
    
    // Lock funds for margin
    await db.updateUserLockedBalance(user.id, user.lockedBalance + requiredMargin);
    
    // Create trade record
    const trade = await db.createTrade({
      roundId,
      userId: user.id,
      direction,
      size,
      entryPrice: expectedCandle.close, // Use server-verified price
      entryCandleIndex: candleIndex,
      entryServerTime: serverTimestamp,
      entryPriceVerified: true,
      tradingFees: size * 0.002 // 0.2% trading fee
    });
    
    // Log trade for monitoring
    console.log(`📈 Trade opened: ${user.id} ${direction} ${size} @ ${expectedCandle.close}`);
    
    res.json({
      trade: {
        id: trade.id,
        direction,
        size,
        entryPrice: expectedCandle.close,
        entryCandleIndex: candleIndex,
        status: 'OPEN',
        marginLocked: requiredMargin
      },
      newLockedBalance: user.lockedBalance + requiredMargin
    });
    
  } catch (error) {
    console.error('Trade opening failed:', error);
    res.status(500).json({ error: 'Failed to open trade' });
  }
});

// POST /api/trade/close - Close trading position with verification
router.post('/close', authenticateUser, async (req, res) => {
  try {
    const { tradeId, candleIndex, claimedPrice, clientTimestamp } = req.body;
    const user = req.user!;
    const serverTimestamp = Date.now();
    
    // Get trade and verify ownership
    const trade = await db.getTradeById(tradeId);
    if (!trade || trade.user_id !== user.id || trade.status !== 'OPEN') {
      return res.status(400).json({ error: 'Invalid trade' });
    }
    
    // Get round for verification
    const round = await db.getRoundById(trade.round_id);
    if (!round || round.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Round not active' });
    }
    
    // Verify exit price
    const config = JSON.parse(round.config);
    const generator = new CandleGenerator(round.aptos_seed, config);
    const expectedCandle = generator.generateCandle(candleIndex);
    
    const priceTolerance = 0.001;
    if (Math.abs(expectedCandle.close - claimedPrice) > priceTolerance) {
      return res.status(400).json({ 
        error: 'Exit price verification failed',
        expected: expectedCandle.close,
        claimed: claimedPrice
      });
    }
    
    // Calculate P&L
    const priceDifference = expectedCandle.close - trade.entry_price;
    const multiplier = trade.direction === 'LONG' ? 1 : -1;
    const grossPnl = priceDifference * multiplier * trade.size;
    const tradingFees = trade.size * 0.002; // 0.2% fee
    const netPnl = grossPnl - tradingFees;
    
    // Update trade record
    await db.closeTrade(tradeId, {
      exitPrice: expectedCandle.close,
      exitCandleIndex: candleIndex,
      exitServerTime: serverTimestamp,
      grossPnl,
      tradingFees,
      netPnl,
      exitPriceVerified: true,
      timeInTrade: serverTimestamp - trade.entry_server_time
    });
    
    // Calculate margin to unlock
    const marginLocked = trade.size * 0.1;
    
    // Update user balances atomically
    await db.transaction(async (trx) => {
      // Unlock margin
      await trx.updateUserLockedBalance(user.id, user.lockedBalance - marginLocked);
      
      // Apply P&L to balance
      await trx.updateUserBalance(user.id, user.gameBalance + netPnl);
      
      // Update lifetime stats
      await trx.updateUserLifetimePnl(user.id, user.lifetimePnl + netPnl);
      await trx.incrementUserTradeCount(user.id);
    });
    
    // Get updated user data
    const updatedUser = await db.getUserById(user.id);
    
    // Log trade closure
    console.log(`📊 Trade closed: ${user.id} ${direction} PnL: ${netPnl.toFixed(2)}`);
    
    res.json({
      trade: {
        id: trade.id,
        direction: trade.direction,
        size: trade.size,
        entryPrice: trade.entry_price,
        exitPrice: expectedCandle.close,
        grossPnl,
        tradingFees,
        netPnl,
        timeInTrade: serverTimestamp - trade.entry_server_time,
        status: 'CLOSED'
      },
      newBalance: updatedUser.game_balance,
      newLockedBalance: updatedUser.locked_balance
    });
    
  } catch (error) {
    console.error('Trade closing failed:', error);
    res.status(500).json({ error: 'Failed to close trade' });
  }
});

export default router;
```

---

### PHASE 3: Production Readiness (Week 3-4)

#### Smart Contract Integration
**Objective**: Deploy Move contracts for on-chain settlements

**Move Contract Design:**
```rust
// contracts/sources/CashTradingGame.move
module cash_trading_game::game {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    
    /// User account for game balances
    struct UserAccount has key {
        balance: u64,  // In octas (1 APT = 100,000,000 octas)
        locked_balance: u64,
        total_deposited: u64,
        total_withdrawn: u64,
        lifetime_pnl: i64,
    }
    
    /// Settlement batch for multiple users
    struct SettlementBatch has drop, store {
        round_id: vector<u8>,
        settlements: vector<UserSettlement>,
        total_house_edge: u64,
        timestamp: u64,
    }
    
    struct UserSettlement has drop, store {
        user: address,
        net_pnl: i64,  // Can be negative
        new_balance: u64,
    }
    
    /// Events
    struct DepositEvent has drop, store {
        user: address,
        amount: u64,
        new_balance: u64,
        timestamp: u64,
    }
    
    struct WithdrawalEvent has drop, store {
        user: address,
        amount: u64,
        new_balance: u64,
        timestamp: u64,
    }
    
    struct SettlementEvent has drop, store {
        round_id: vector<u8>,
        user: address,
        pnl: i64,
        new_balance: u64,
        timestamp: u64,
    }
    
    /// Initialize user account
    public entry fun initialize_account(user: &signer) {
        let user_addr = signer::address_of(user);
        
        if (!exists<UserAccount>(user_addr)) {
            move_to(user, UserAccount {
                balance: 0,
                locked_balance: 0,
                total_deposited: 0,
                total_withdrawn: 0,
                lifetime_pnl: 0,
            });
        }
    }
    
    /// Deposit APT into game account
    public entry fun deposit(user: &signer, amount: u64) acquires UserAccount {
        let user_addr = signer::address_of(user);
        
        // Ensure user account exists
        if (!exists<UserAccount>(user_addr)) {
            initialize_account(user);
        }
        
        // Transfer APT from user to contract
        let coins = coin::withdraw<AptosCoin>(user, amount);
        coin::deposit(@cash_trading_game, coins);
        
        // Update user balance
        let account = borrow_global_mut<UserAccount>(user_addr);
        account.balance = account.balance + amount;
        account.total_deposited = account.total_deposited + amount;
        
        // Emit event
        event::emit(DepositEvent {
            user: user_addr,
            amount,
            new_balance: account.balance,
            timestamp: timestamp::now_microseconds(),
        });
    }
    
    /// Process withdrawal
    public entry fun withdraw(user: &signer, amount: u64) acquires UserAccount {
        let user_addr = signer::address_of(user);
        
        // Check account exists and has sufficient balance
        assert!(exists<UserAccount>(user_addr), 1);
        let account = borrow_global_mut<UserAccount>(user_addr);
        
        let available_balance = account.balance - account.locked_balance;
        assert!(amount <= available_balance, 2);
        
        // Update balance
        account.balance = account.balance - amount;
        account.total_withdrawn = account.total_withdrawn + amount;
        
        // Transfer APT to user
        let coins = coin::withdraw<AptosCoin>(@cash_trading_game, amount);
        coin::deposit(user_addr, coins);
        
        // Emit event
        event::emit(WithdrawalEvent {
            user: user_addr,
            amount,
            new_balance: account.balance,
            timestamp: timestamp::now_microseconds(),
        });
    }
    
    /// Batch settle round results
    public entry fun settle_round(
        admin: &signer,
        round_id: vector<u8>,
        settlements: vector<UserSettlement>
    ) acquires UserAccount {
        // Only game admin can settle rounds
        assert!(signer::address_of(admin) == @cash_trading_game, 3);
        
        let total_house_edge = 0u64;
        let i = 0;
        
        while (i < vector::length(&settlements)) {
            let settlement = vector::borrow(&settlements, i);
            
            if (exists<UserAccount>(settlement.user)) {
                let account = borrow_global_mut<UserAccount>(settlement.user);
                
                // Apply P&L (can be negative)
                if (settlement.net_pnl >= 0) {
                    account.balance = account.balance + (settlement.net_pnl as u64);
                } else {
                    let loss = (-settlement.net_pnl as u64);
                    if (loss <= account.balance) {
                        account.balance = account.balance - loss;
                    } else {
                        // User balance goes to zero if loss exceeds balance
                        total_house_edge = total_house_edge + (loss - account.balance);
                        account.balance = 0;
                    }
                }
                
                // Update lifetime P&L
                account.lifetime_pnl = account.lifetime_pnl + settlement.net_pnl;
                
                // Emit settlement event
                event::emit(SettlementEvent {
                    round_id,
                    user: settlement.user,
                    pnl: settlement.net_pnl,
                    new_balance: account.balance,
                    timestamp: timestamp::now_microseconds(),
                });
            }
            
            i = i + 1;
        }
        
        // Emit batch settlement event
        event::emit(SettlementBatch {
            round_id,
            settlements,
            total_house_edge,
            timestamp: timestamp::now_microseconds(),
        });
    }
}
```

---

## Risk Analysis & Mitigation Strategies

### Technical Risks

#### 1. SQLite Performance Limits
**Risk**: SQLite may not handle high concurrent load
**Likelihood**: Medium (if we get >100 concurrent users)
**Impact**: High (database locks, slow queries)

**Mitigation Strategy:**
```typescript
// Implement connection pooling and query optimization
class DatabaseConnection {
  private pool: sqlite3.Database[] = [];
  private readonly poolSize = 5;
  
  constructor() {
    // Create connection pool
    for (let i = 0; i < this.poolSize; i++) {
      const db = new sqlite3.Database(dbPath);
      db.configure("busyTimeout", 30000); // 30 second timeout
      this.pool.push(db);
    }
  }
  
  async withConnection<T>(operation: (db: sqlite3.Database) => Promise<T>): Promise<T> {
    const db = this.pool.shift();
    if (!db) throw new Error('No database connections available');
    
    try {
      return await operation(db);
    } finally {
      this.pool.push(db);
    }
  }
}

// Migration path to PostgreSQL
const migrationPlan = {
  trigger: 'When SQLite shows performance issues or >500 concurrent users',
  steps: [
    '1. Set up PostgreSQL instance',
    '2. Create identical schema in PostgreSQL', 
    '3. Write data migration script',
    '4. Update connection.ts to use PostgreSQL',
    '5. Deploy with zero downtime using read replicas'
  ]
};
```

#### 2. Authentication Security
**Risk**: Wallet signature replay attacks, session hijacking
**Likelihood**: Medium (targeted attacks)
**Impact**: High (user account compromise)

**Mitigation Strategy:**
```typescript
// Enhanced security measures
const securityMeasures = {
  challengeGeneration: {
    entropy: 'crypto.randomBytes(32)', // 256-bit challenges
    expiration: '5 minutes maximum',
    oneTimeUse: 'Challenge invalidated after use',
    addressBinding: 'Challenge includes user address'
  },
  
  sessionManagement: {
    tokenExpiry: '15 minutes maximum',
    refreshTokens: 'Separate refresh token with longer expiry',
    ipBinding: 'Optional IP address validation',
    deviceFingerprinting: 'Browser fingerprint for additional security'
  },
  
  rateLimiting: {
    authAttempts: '10 per IP per 15 minutes',
    challengeRequests: '5 per IP per minute',
    tradeRequests: '100 per user per minute',
    globalRateLimit: '1000 requests per minute per server'
  }
};
```

#### 3. Aptos Integration Failures
**Risk**: Aptos node downtime, rate limits, gas price spikes
**Likelihood**: Low-Medium (blockchain infrastructure issues)
**Impact**: Medium (game temporarily unavailable)

**Mitigation Strategy:**
```typescript
// Robust Aptos integration with fallbacks
class ResilientAptosService {
  private primaryClient: AptosClient;
  private fallbackClients: AptosClient[] = [];
  private circuitBreaker: CircuitBreaker;
  
  constructor() {
    // Primary node
    this.primaryClient = new AptosClient(process.env.APTOS_PRIMARY_NODE!);
    
    // Fallback nodes
    const fallbackNodes = [
      'https://fullnode.mainnet.aptoslabs.com/v1',
      'https://aptos-mainnet.nodereal.io/v1',
      // Add more reliable nodes
    ];
    
    this.fallbackClients = fallbackNodes.map(url => new AptosClient(url));
    
    // Circuit breaker for automatic failover
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 60000 // 1 minute
    });
  }
  
  async generateRandomSeed(): Promise<SeedData> {
    // Try primary client first
    try {
      return await this.circuitBreaker.execute(() => 
        this.generateSeedFromClient(this.primaryClient)
      );
    } catch (primaryError) {
      console.warn('Primary Aptos client failed, trying fallbacks');
      
      // Try fallback clients
      for (const fallbackClient of this.fallbackClients) {
        try {
          return await this.generateSeedFromClient(fallbackClient);
        } catch (fallbackError) {
          console.warn('Fallback client failed:', fallbackError.message);
        }
      }
      
      // All clients failed - use secure fallback
      console.error('All Aptos clients failed, using cryptographic fallback');
      return this.generateFallbackSeed();
    }
  }
  
  private generateFallbackSeed(): SeedData {
    // Generate cryptographically secure seed when Aptos is unavailable
    const seed = `0x${crypto.randomBytes(32).toString('hex')}`;
    const verificationHash = crypto.createHash('sha256').update(seed).digest('hex');
    
    return {
      seed,
      blockHeight: 0, // Indicates fallback
      transactionHash: 'fallback',
      timestamp: Date.now(),
      gasUsed: 0,
      verificationHash
    };
  }
}
```

#### 4. Trade Timing & Fairness
**Risk**: Clients manipulating trade timing for advantage
**Likelihood**: High (sophisticated users will try)
**Impact**: Medium (unfair advantage, reduced house edge)

**Mitigation Strategy:**
```typescript
// Server-side timing enforcement
const tradeTimingValidation = {
  serverTimeAuthority: 'All trades timestamped by server, not client',
  candleIndexValidation: 'Verify candle index matches server time',
  futureTradesPrevention: 'Reject trades more than 1 second in future',
  pastTradesLimit: 'Accept trades up to 5 seconds in past (network latency)',
  
  implementation: `
    const roundStartTime = new Date(round.started_at).getTime();
    const expectedCandleTime = roundStartTime + (candleIndex * config.candle_interval_ms);
    const serverTime = Date.now();
    const timeDifference = serverTime - expectedCandleTime;
    
    // Reject if trade is too far in future or past
    if (timeDifference < -1000 || timeDifference > 5000) {
      throw new Error('Trade timing invalid');
    }
  `
};
```

---

## Synchronization Decision Analysis

### Individual Rounds vs Synchronized Rounds

#### **Phase 1: Individual Rounds (Recommended Start)**

**Implementation:**
```typescript
// Each user gets their own round with unique seed
const individualRoundFlow = {
  userStartsGame: 'User clicks "Start Round"',
  backendGeneratesSeed: 'Backend calls Aptos randomness API',
  uniqueSeedPerUser: 'Each user gets different seed',
  clientGeneratesCandles: 'Frontend generates candles from seed',
  noSynchronization: 'No coordination between users needed',
  
  advantages: [
    'Simple to implement - no WebSocket complexity',
    'Better performance - no network latency',
    'Easier debugging - each game is independent', 
    'Offline capable - can generate entire round locally',
    'Scalable - no synchronization bottlenecks'
  ],
  
  disadvantages: [
    'No shared experience - users see different charts',
    'No social features - cannot see other players trades',
    'Less engaging - missing FOMO and competition elements',
    'Harder to create tournaments or leaderboards'
  ]
};
```

#### **Phase 2: Synchronized Rounds (Future Enhancement)**

**Implementation:**
```typescript
// All users see same chart with shared seed
const synchronizedRoundFlow = {
  globalRoundStart: 'Server starts round for all users',
  sharedSeed: 'All users get same Aptos seed',
  precomputeCandles: 'Server generates all candles before round starts',
  webSocketDistribution: 'Stream candles to all users at precise intervals',
  sharedExperience: 'Everyone sees identical price movements',
  
  advantages: [
    'Shared experience - all users see same chart',
    'Social features - see other players trades in real-time',
    'More engaging - creates FOMO and excitement',
    'Tournament support - fair competition with same conditions',
    'Whale alerts - big trades visible to everyone'
  ],
  
  disadvantages: [
    'Complex implementation - WebSocket infrastructure needed',
    'Performance challenges - network latency affects UX',
    'Scaling difficulties - need to handle thousands of connections',
    'Single point of failure - if sync breaks, game breaks',
    'Higher server costs - need Redis and WebSocket servers'
  ]
};
```

**Migration Path:**
```typescript
// Database schema supports both approaches
const migrationStrategy = {
  phase1: {
    roundType: 'INDIVIDUAL',
    implementation: 'Each user gets unique seed',
    database: 'rounds.user_id = specific user',
    frontend: 'GameManager generates own candles'
  },
  
  phase2: {
    roundType: 'MULTIPLAYER', 
    implementation: 'Shared seed for all participants',
    database: 'rounds.user_id = null, round_participants table',
    frontend: 'WebSocket receives candles from server'
  },
  
  transition: 'User can choose individual or multiplayer rounds'
};
```

---

## Concrete Next Steps (Immediate Actions)

### Week 1 Action Items

#### Day 1: PR Acceptance
```bash
# 1. Backup current state
git checkout -b backup-before-gamemanager-merge
git checkout main

# 2. Merge Sam's PR
git merge feature/game_manager

# 3. Install dependencies
npm install
cd server && npm install

# 4. Test functionality
npm run dev  # Terminal 1
cd server && npm run dev  # Terminal 2

# 5. Verify test interface
# Visit http://localhost:3000?test=true
# Click "Test Game API"
# Verify database creation and seed generation
```

#### Day 2-3: Database Enhancement
```bash
# 1. Create migration script
touch server/database/migrations/001_enhance_schema.sql

# 2. Add authentication fields
# 3. Add financial transaction tables  
# 4. Add settlement tables
# 5. Test migration with sample data
```

#### Day 4-5: Authentication Implementation
```bash
# 1. Install wallet dependencies
npm install @aptos-labs/wallet-adapter-react
npm install @aptos-labs/wallet-adapter-petra
npm install @aptos-labs/wallet-adapter-martian

# 2. Implement WalletService
# 3. Add authentication routes
# 4. Add authentication middleware
# 5. Test wallet connection flow
```

#### Day 6-7: Aptos Integration
```bash
# 1. Set up Aptos environment variables
echo "APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1" >> .env
echo "APTOS_GAME_PRIVATE_KEY=your_private_key_here" >> .env
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env

# 2. Replace mock AptosService
# 3. Test real seed generation
# 4. Implement error handling and fallbacks
```

### Success Criteria & Testing

#### Functional Testing Checklist
- [ ] User can connect Petra wallet
- [ ] Authentication challenge/response works
- [ ] Real Aptos seeds are generated
- [ ] Candles are deterministically generated from seeds
- [ ] Trades are verified server-side
- [ ] Balances are tracked correctly
- [ ] Replay system works with real seeds
- [ ] Error handling works for all failure modes

#### Performance Testing
- [ ] Seed generation completes within 2 seconds
- [ ] Trade verification completes within 100ms
- [ ] Database queries complete within 50ms
- [ ] Frontend renders at 60fps with real data
- [ ] System handles 10 concurrent users without issues

#### Security Testing
- [ ] Invalid signatures are rejected
- [ ] Expired challenges are rejected
- [ ] Price manipulation attempts are blocked
- [ ] Session tokens expire correctly
- [ ] Rate limiting prevents abuse

---

## Final Assessment

**Sam's PR is exactly what we need** - it provides a solid, practical foundation that solves the core architectural challenges while avoiding the complexity trap of our original plans.

**Key Success Factors:**
1. **Accept the PR immediately** - don't overthink it
2. **Focus on real Aptos integration** - replace mocks with production code
3. **Implement authentication properly** - wallet-based user management
4. **Start with individual rounds** - add synchronization later
5. **Maintain backward compatibility** - keep original system during transition

This approach gives us the best chance of shipping a working game with real money quickly while maintaining a clear path to enhanced features.

*Document Version: 4.0 | Last Updated: Current Date*
*Comprehensive implementation plan based on Sam's PR analysis*
