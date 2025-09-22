# Smart Contract Implementation

## Overview

The Cash Trading Game smart contract is implemented in Move and provides a complete on-chain gaming system with deterministic candle generation, trade tracking, and PnL calculation.

## Contract Features

### ✅ **Implemented:**
- Player initialization and state tracking
- Game round creation with deterministic seeds
- Trade recording and PnL calculation  
- Event emission for frontend integration
- View functions for reading contract state
- Withdrawal system (prepared for APT integration)

### 🔄 **APT Transfer Mode:**
- Currently **disabled** for testing without requiring APT balance
- Easy to enable by uncommenting the `coin::transfer` lines
- All amounts calculated in octas (1 APT = 100,000,000 octas)

## Contract Structure

### Core Structs

```move
struct GameRound {
    id: u64,
    player: address,
    seed: vector<u8>,
    bet_amount: u64,
    candle_config: CandleConfig,
    start_time: u64,
    end_time: u64,
    final_price: u64,
    pnl: i64,
    status: u8, // 0: active, 1: completed, 2: liquidated
}

struct PlayerState {
    active_rounds: vector<u64>,
    total_winnings: u64,
    total_losses: u64,
    games_played: u64,
    last_round_id: u64,
}

struct CandleConfig {
    initial_price_fp: u64,
    total_candles: u64,
    interval_ms: u64,
    fairness_version: u8,
    start_at_ms: u64,
}
```

### Key Functions

#### Entry Functions (Require Wallet Signature)
- `initialize_player()` - Set up player state
- `start_game(bet_amount, seed)` - Begin new trading round
- `complete_game(round_id, final_price, trades)` - Finish round with PnL
- `record_trade(round_id, action, price, amount)` - Log individual trades
- `withdraw_winnings(amount)` - Withdraw APT earnings

#### View Functions (Read-Only)
- `get_player_state(address)` - Get player statistics
- `get_game_round(address)` - Get active round details
- `get_game_state()` - Get global game statistics

## TypeScript Integration

### GameContract Class

```typescript
const contract = new GameContract(Network.DEVNET);

// Start a game
await contract.startGame(signAndSubmitTransaction, 0.1, seedHex);

// Complete a game
await contract.completeGame(signAndSubmitTransaction, roundId, finalPrice, trades);

// Read player state
const state = await contract.getPlayerState(playerAddress);
```

### Event Listening

The contract emits events for:
- `GameStartEvent` - When round begins
- `GameEndEvent` - When round completes
- `TradeEvent` - For each trade recorded

## Testing Flow

Visit `http://localhost:5173/?aptos=true` and use the Smart Contract Test section:

1. **🚀 Initialize Player** - Set up your player state
2. **🎮 Start Game** - Create new round with random seed
3. **🏁 Complete Game** - Finish with mock trades
4. **🔄 Refresh** - Update display with latest data

## Integration with Game Logic

### Seed Generation
- Frontend generates 256-bit random seed
- Seed is stored on-chain for fairness verification
- Same seed + config = identical candle sequence

### Trade Tracking
- Each buy/sell action recorded on-chain
- PnL calculated from trade sequence
- Final balance determines win/loss

### Deterministic Replay
- Any round can be replayed with stored seed
- Contract state proves game fairness
- Historical verification possible

## Deployment

### Prerequisites
```bash
# Install Aptos CLI
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3

# Initialize project
cd contracts
aptos init --network devnet
```

### Deploy Contract
```bash
cd contracts
aptos move publish --named-addresses cash_trading_game=your-address
```

### Update Frontend
```typescript
// Set deployed contract address
process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = "0x_deployed_address"
```

## Security Features

### Move Language Benefits
- **Memory Safety** - No buffer overflows or use-after-free
- **Resource Safety** - Prevents double-spending via linear types
- **Formal Verification** - Mathematical proofs of correctness

### Game Fairness
- **Deterministic Generation** - Same seed = same outcome
- **On-Chain Seeds** - Cannot be manipulated after commitment
- **Public Verification** - Anyone can verify game outcomes

### Access Control
- **Player Ownership** - Only round owner can complete games
- **State Validation** - Prevents invalid state transitions
- **Event Auditing** - Complete transaction history

## Gas Optimization

### Efficient Data Structures
- Minimal storage for game state
- Vector operations for trade lists
- Fixed-size integers where possible

### Batch Operations
- Complete game with all trades at once
- Single transaction for round lifecycle
- Event emission for efficient indexing

## Future Enhancements

### Planned Features
- Multi-round tournaments
- Leaderboard system
- Referral rewards
- Governance token integration

### Scalability
- Layer 2 integration for high-frequency trading
- State channels for real-time updates
- Cross-chain bridge support

## Troubleshooting

### Common Issues

**"Player not initialized"**
- Run `Initialize Player` first
- Check wallet connection

**"No active game round"**
- Start new game before completing
- Only one active round per player

**"Transaction failed"**
- Check wallet has sufficient gas
- Verify contract address is correct
- Ensure proper network (devnet/testnet)

### Debug Tools

**View Transaction:**
```
https://explorer.aptoslabs.com/txn/TX_HASH?network=devnet
```

**Check Account Resources:**
```
https://explorer.aptoslabs.com/account/YOUR_ADDRESS?network=devnet
```

## API Reference

See `GameContract.ts` for complete TypeScript interface with:
- Type definitions for all structs
- Async methods for all contract functions  
- Utility functions for hex/byte conversion
- Error handling and event parsing

The smart contract provides a complete foundation for the cash trading game with proper on-chain state management, fairness guarantees, and efficient gas usage.