# Cash Trading Game - Testing & Implementation Plan

## Current Architecture

### Game Flow
1. **Round Start**: Player initiates game with bet amount and seed
2. **Trading Phase**: 30-second trading window with instant off-chain trades
3. **Settlement**: Final P&L calculated and settled on-chain

### Smart Contract Functions
- `process_game_payout()`: Single transaction for entire game settlement
  - Handles both profits and losses
  - Transfers funds between player and treasury
  - Emits GamePayoutEvent

## Testing Plan

### Prerequisites
1. **Devnet Setup**
   ```bash
   # Ensure Aptos CLI is configured for devnet
   aptos config set-global-config --network devnet
   ```

2. **Wallet Setup**
   - Petra Wallet connected to devnet
   - Passkey authentication configured
   - Test accounts funded with devnet APT

### Test Scenarios

#### Scenario 1: Basic Game Flow
```bash
# 1. Fund test account
curl -X POST https://faucet.devnet.aptoslabs.com/mint \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_ADDRESS", "amount": 10000000000}'

# 2. Monitor game events
npm run dev
# Open browser console to track:
# - Game start transaction
# - Off-chain trade execution
# - Settlement transaction
```

#### Scenario 2: P&L Verification
- **Win Case**: Player profits 0.5 APT
  - Initial bet: 1 APT
  - Expected payout: 1.5 APT from treasury

- **Loss Case**: Player loses 0.3 APT
  - Initial bet: 1 APT
  - Expected return: 0.7 APT from treasury

- **Total Loss**: Player loses entire bet
  - Initial bet: 1 APT
  - Expected return: 0 APT

#### Scenario 3: Multiple Players
- Simulate concurrent games
- Verify treasury balance management
- Test settlement ordering

## Implementation Strategy for Instant Off-Chain Trading

### Current Issues
1. Trades are visual only, not recorded
2. Settlement requires all trade data
3. No verification mechanism

### Proposed Solution

#### 1. Off-Chain Trade Recording
```typescript
// In useP5Chart.ts - Record each trade locally
interface TradeRecord {
  id: string;
  timestamp: number;
  action: 'buy' | 'sell';
  price: number;
  quantity: number;
  pnl: number;
}

const tradeHistory: TradeRecord[] = [];

// On position open
const recordTradeOpen = (price: number) => {
  const trade: TradeRecord = {
    id: generateTradeId(),
    timestamp: Date.now(),
    action: 'buy',
    price,
    quantity: betAmount,
    pnl: 0
  };
  tradeHistory.push(trade);
};

// On position close
const recordTradeClose = (exitPrice: number, pnl: number) => {
  const trade: TradeRecord = {
    id: generateTradeId(),
    timestamp: Date.now(),
    action: 'sell',
    price: exitPrice,
    quantity: betAmount,
    pnl
  };
  tradeHistory.push(trade);
};
```

#### 2. Batch Settlement On-Chain
```typescript
// In AptosCandlestickChart.tsx
const settleRoundOnChain = async () => {
  // Aggregate all trades
  const totalPnL = tradeHistory.reduce((sum, trade) => sum + trade.pnl, 0);

  // Single on-chain transaction
  await processGamePayout(
    betAmount,
    gameSeed,
    totalPnL > 0,  // is_profit
    Math.abs(totalPnL)  // pnl_amount
  );

  // Clear trade history
  tradeHistory.length = 0;
};
```

#### 3. Trade Verification (Optional)
```move
// In smart contract - add trade hash verification
struct TradeHash has drop {
    hash: vector<u8>,  // SHA256 of serialized trades
}

public entry fun process_game_payout_with_verification(
    account: &signer,
    bet_amount: u64,
    seed: vector<u8>,
    is_profit: bool,
    pnl_amount: u64,
    trade_hash: vector<u8>  // For audit trail
) {
    // Store hash for verification
    // Process payout as normal
}
```

## Testing Commands

### Local Development
```bash
# Start development server
npm run dev

# Run tests
npm test

# Check Aptos connection
npm run check:aptos
```

### Contract Interaction
```bash
# Deploy contract (if needed)
aptos move publish --package-dir contracts \
  --named-addresses cash_trading_game=default

# View treasury balance
aptos account balance --account TREASURY_ADDRESS

# Monitor events
aptos events list --account cash_trading_game \
  --event-handle-struct 0x1::game::EventHandles \
  --field-name game_payout_events
```

## Verification Checklist

- [ ] Player can connect with Petra wallet
- [ ] Player can connect with passkeys
- [ ] Devnet APT funding works
- [ ] Game starts with on-chain transaction
- [ ] Trades execute instantly (off-chain)
- [ ] P&L displays correctly per trade
- [ ] Round settlement processes on-chain
- [ ] Winning player receives correct payout
- [ ] Losing player pays correct amount
- [ ] Treasury balance updates correctly
- [ ] Events emit properly
- [ ] Multiple concurrent games work

## Next Steps

1. **Implement trade recording** in useP5Chart.ts
2. **Add settlement aggregation** in AptosCandlestickChart.tsx
3. **Test with multiple accounts** on devnet
4. **Add monitoring dashboard** for treasury balance
5. **Implement trade verification** (optional, for audit)

## Environment Variables
```env
# .env.local
VITE_APTOS_NETWORK=devnet
VITE_MODULE_ADDRESS=YOUR_MODULE_ADDRESS
VITE_TREASURY_ADDRESS=YOUR_TREASURY_ADDRESS
```