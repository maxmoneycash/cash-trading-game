# Session-Based Architecture for Cash Trading Game

## Problem with Current Design

**Current Flow (BAD UX):**
```
User clicks "Start Game"
  → Transaction popup #1 (Face ID) ❌
  → Funds locked in escrow
  → Play game (unrealized P&L)
  → Transaction popup #2 (Face ID) ❌
  → Funds released, balance updates

Play 5 games = 10 transaction popups 😱
```

**Issues:**
1. ❌ Transaction popup interrupts gameplay
2. ❌ User confused: "What am I signing?"
3. ❌ Funds locked during game (can't leave)
4. ❌ Balance only updates at end
5. ❌ Terrible mobile UX

---

## New Session-Based Design

**New Flow (GOOD UX):**
```
User deposits 10 APT (Face ID once) ✅
  ↓
Play unlimited games with NO popups:
  - Game 1: Bet 1 APT → Win 0.5 APT (Balance: 10.5)
  - Game 2: Bet 2 APT → Lose 0.8 APT (Balance: 9.7)
  - Game 3: Bet 0.5 APT → Win 2 APT (Balance: 11.7)
  ↓
Withdraw 11.7 APT when done (Face ID once) ✅
```

**Benefits:**
1. ✅ No transaction popups during gameplay
2. ✅ Balance updates after each game instantly
3. ✅ User controls when to deposit/withdraw
4. ✅ Can play unlimited games on one deposit
5. ✅ Perfect mobile UX

---

## Contract Architecture

See: `contracts/sources/game_v3_session.move`

### Key Concepts:

**1. Session Balance**
- User deposits APT → stored in contract
- Games deduct/add to this balance
- No escrow, no locks
- Withdraw anytime

**2. Settlement Methods (Choose One)**

We have 3 options for how games settle:

### Option A: Fully Off-Chain + Batch Settle (BEST UX)

```
Games happen entirely off-chain:
  1. User plays 10 games in browser (instant, no blockchain)
  2. Frontend tracks: [+0.5, -0.3, +1.2, -0.1, ...]
  3. User clicks "Sync to Blockchain"
  4. ONE transaction settles all 10 games at once
  5. Or auto-sync every 10 games in background
```

**Implementation:**
```typescript
// Games tracked in localStorage/memory
const completedGames = [
  { bet: 1, pnl: 0.5, seed: "abc123" },
  { bet: 2, pnl: -0.3, seed: "def456" },
  // ... 10 games
];

// Batch settle (one transaction)
await contract.batch_settle_games(
  userAddress,
  completedGames.map(g => g.bet),
  completedGames.map(g => g.pnl),
  completedGames.map(g => g.seed)
);
```

**Pros:**
- ✅ Unlimited games with zero transactions
- ✅ Perfect UX (no interruptions)
- ✅ Cheapest (batch multiple games)
- ✅ User controls when to settle

**Cons:**
- ⚠️ Balance shows "pending settlement" for unsynced games
- ⚠️ Need to handle "what if user closes browser before syncing?"

---

### Option B: Auto-Settle Each Game in Background (GOOD UX)

```
Each game auto-settles silently:
  1. User finishes game
  2. Passkey auto-signs transaction in background (no popup)
  3. Balance updates on-chain immediately
  4. User sees instant update
```

**Implementation:**
```typescript
// When game ends
const pnl = calculatePnL(entryPrice, exitPrice, betAmount);

// Settle silently (with passkeys + userVerification: "discouraged")
await passkeyAccount.signAndSubmitTransaction({
  function: `${MODULE_ADDRESS}::game_v3_session::settle_game`,
  arguments: [userAddress, betAmount, pnl, seed],
});

// Update UI optimistically while transaction confirms
updateBalanceOptimistically(pnl);
```

**Pros:**
- ✅ Each game settles immediately
- ✅ On-chain balance always accurate
- ✅ No user interaction needed (passkey auto-signs)
- ✅ Simpler than batching

**Cons:**
- ⚠️ One transaction per game (more expensive if playing 100 games)
- ⚠️ Need passkey with session auth to avoid Face ID each time

---

### Option C: Hybrid (Optimistic UI + Background Batch)

```
Best of both worlds:
  1. Games settle instantly in UI (optimistic)
  2. Every 5 games, auto-batch settle in background
  3. User never waits or sees popups
  4. On-chain syncs periodically
```

**Implementation:**
```typescript
let pendingGames = [];

async function onGameEnd(gameResult) {
  // Update UI immediately (optimistic)
  updateBalanceOptimistically(gameResult.pnl);

  // Queue for settlement
  pendingGames.push(gameResult);

  // Batch settle every 5 games
  if (pendingGames.length >= 5) {
    await batchSettleInBackground(pendingGames);
    pendingGames = [];
  }
}

// Also settle on page unload
window.addEventListener('beforeunload', () => {
  if (pendingGames.length > 0) {
    batchSettleInBackground(pendingGames);
  }
});
```

**Pros:**
- ✅ Instant UI updates
- ✅ Efficient batching
- ✅ Auto-syncs periodically
- ✅ Handles edge cases (page close)

**Cons:**
- ⚠️ Most complex to implement
- ⚠️ Need to handle "what if batch fails?"

---

## Implementation Roadmap

### Phase 1: Deploy New Contract ✅
- [x] Write `game_v3_session.move`
- [ ] Test contract locally
- [ ] Deploy to devnet
- [ ] Verify deposit/withdraw works

### Phase 2: Update Frontend
- [ ] Add "Deposit" modal (one-time)
- [ ] Update balance to read from session
- [ ] Implement one of the settlement options above
- [ ] Add "Withdraw" button

### Phase 3: Session Auth (Remove Face ID Prompts)
- [ ] Implement session-based passkey auth
- [ ] Set `userVerification: "discouraged"` after first auth
- [ ] Auto-sign transactions in background
- [ ] Show "Session Active" indicator

### Phase 4: Polish
- [ ] Add pending balance indicator
- [ ] Handle network errors gracefully
- [ ] Add "Sync Now" button for manual sync
- [ ] Optimize gas costs

---

## Which Settlement Option Should You Use?

**Recommendation: Start with Option B (Auto-Settle), upgrade to Option C later**

**Why Option B first:**
1. Simplest to implement
2. No need to manage pending state
3. On-chain balance always correct
4. Can upgrade to batching later

**Then add Option C features:**
1. Add optimistic UI
2. Add batching when profitable (gas costs vs UX)
3. Keep auto-settle as fallback

---

## Next Steps

1. **Test the new contract:**
   ```bash
   cd contracts
   aptos move test
   aptos move publish --profile devnet
   ```

2. **Update frontend:**
   - Add deposit flow
   - Switch to `settle_game()` instead of `start_game()` + `complete_game()`
   - Update balance reads

3. **Choose settlement method** and I'll help implement it

Which option resonates with you? I recommend **Option B → Option C** progression.
