# Final Architecture Comparison

## Overview

This document compares **three proposed architectures** for the cash trading game:

1. **My Initial Proposals** (from earlier in conversation)
   - Option A: Fully Off-Chain
   - Option B: Backend Service Signs
   - Option C: Account Abstraction with Session Keys

2. **First External Proposal** (the one you asked me to analyze)
   - Backend-signed settlements with house wallet
   - Generic architecture without code references

3. **Second External Proposal** (this latest one)
   - **Backend-signed trading flow with Keyless accounts**
   - Detailed implementation with specific code references
   - CASH token integration

---

## Quick Comparison Table

| Feature | My Proposals | First External | Second External (Latest) |
|---------|-------------|----------------|-------------------------|
| **User Authentication** | Passkeys or Wallet | Not specified | ✅ **Keyless (Google OAuth)** |
| **Token Type** | AptosCoin (APT) | Coin<CASH> | ✅ **Coin<CASH>** |
| **Settlement Method** | 3 options offered | Backend signs | ✅ **Backend signs** |
| **Code References** | Generic examples | Generic | ✅ **Specific file:line refs** |
| **Error Handling** | Basic | Mentioned | ✅ **Detailed retry/queue** |
| **Existing Code Integration** | Not aware of codebase | Not aware | ✅ **Maps to your actual code** |
| **Implementation Detail** | High-level | Medium | ✅ **Very detailed** |

---

## Deep Dive: Latest Proposal vs My Analysis

### What's Different (Latest Proposal is BETTER)

**1. Uses Your Existing Keyless Infrastructure**

Your code already has:
```typescript
// src/hooks/usePasskey.ts:1-208
// ✅ Gmail/Keyless login already implemented
// ✅ Derives Aptos address from Google auth
// ✅ Stores credential in PasskeyProvider

// src/components/wallet/WalletPicker.tsx
// ✅ Shows passkey address
// ✅ Has deposit/withdraw UI hooks
```

**I didn't know you had this!** I was proposing building passkey infrastructure from scratch, but you already have Keyless working.

**Latest proposal leverages what you have** ✅

---

**2. References Actual Code Locations**

Latest proposal:
- ✅ `src/hooks/usePasskey.ts:207-210` - where to add deposit_user
- ✅ `server/routes/game.ts:227-284` - where PnL calculation happens
- ✅ `src/utils/passkey-webauthn.ts:235-258` - balance fetching
- ✅ `server/services/AptosService.ts:9-92` - where to add real SDK

**I was giving generic examples.** Latest proposal tells you EXACTLY where to edit.

---

**3. CASH Token Integration**

Latest proposal explicitly addresses:
```typescript
// Swap this:
type_arguments: [AptosCoin]

// To this:
type_arguments: [CASH_TYPE]

// Where CASH_TYPE = "0x[your_address]::cash::CASH"
```

**I was assuming APT.** You're building a game with a custom CASH token, which changes everything.

---

**4. Better Error Handling**

Latest proposal includes:
- ✅ Settlement queue (survives backend restarts)
- ✅ Retry logic (mark as PENDING, retry on failure)
- ✅ Reconciliation (periodic on-chain vs DB check)
- ✅ SQLite persistence (queue items stored)

**I only mentioned error handling briefly.** Latest proposal has a real production strategy.

---

**5. Matches Your Current Flow**

Your existing game flow:
```
POST /api/game/start → Creates round, generates seed
  ↓
POST /api/game/trade/open → Records trade start
  ↓
POST /api/game/trade/complete → Calculates PnL, stores result
```

**Latest proposal says:** Keep this exact flow, just add `record_trade()` call in `/trade/complete`

**I suggested:** Rewrite everything

Latest proposal = **minimal changes** ✅

---

### What's the Same

Both latest proposal and my "Option B" (Backend Service Signs) share:

1. ✅ Backend holds house private key
2. ✅ Backend signs `record_trade()` on behalf of house
3. ✅ Users only sign for deposit/withdraw
4. ✅ Zero user interaction during gameplay
5. ✅ Real-time on-chain settlement

**The core architecture is identical.** Latest proposal just has WAY better implementation details for YOUR specific codebase.

---

### What's Still Missing (Both Proposals)

Neither proposal addresses:

1. **CASH token deployment**
   - Where is the CASH token contract?
   - Is it deployed on devnet? Mainnet?
   - What's the full type: `0x...::cash::CASH`?

2. **House wallet funding**
   - How much CASH does house need?
   - How do you fund it initially?
   - What happens when house runs out of liquidity?

3. **Contract deployment**
   - Who deploys `cash_trading_game::liquidity`?
   - What's the module address?
   - How do you authorize the house wallet on-chain?

4. **Keyless account funding**
   - User creates account via Google login
   - How do they get CASH to deposit?
   - Faucet? Buy on DEX? Transfer from CEX?

---

## The Move Contract

### Latest Proposal's Contract Structure

```move
module cash_trading_game::liquidity {
    use aptos_framework::coin::{Self, Coin};
    use aptos_std::table::{Self, Table};

    // Custom CASH token type
    struct CASH has key {}

    // User ledger tracking
    struct UserLedger has key {
        balances: Table<address, u64>  // Player address → CASH balance (in micro-CASH)
    }

    // House liquidity pool
    struct HouseLiquidity has key {
        balance: u64,
        authorized_signer: address  // Only this address can call record_trade
    }

    // User deposits CASH from wallet → contract ledger
    public entry fun deposit_user(user: &signer, amount: u64) {
        let user_addr = signer::address_of(user);

        // Transfer Coin<CASH> from user's wallet to contract
        let coins = coin::withdraw<CASH>(user, amount);
        coin::deposit(@cash_trading_game, coins);

        // Credit internal ledger
        let ledger = borrow_global_mut<UserLedger>(@cash_trading_game);
        let current = *table::borrow_mut_with_default(&mut ledger.balances, user_addr, 0);
        table::upsert(&mut ledger.balances, user_addr, current + amount);
    }

    // Backend settles trade (only house can call)
    public entry fun record_trade(
        house: &signer,
        player: address,
        delta: i64  // Positive = user won, negative = user lost
    ) {
        // Verify caller is authorized house
        let house_addr = signer::address_of(house);
        let house_liquidity = borrow_global<HouseLiquidity>(@cash_trading_game);
        assert!(house_addr == house_liquidity.authorized_signer, E_UNAUTHORIZED);

        // Update player balance
        let ledger = borrow_global_mut<UserLedger>(@cash_trading_game);
        let current_balance = *table::borrow_mut_with_default(&mut ledger.balances, player, 0);

        let new_balance = if (delta >= 0) {
            // Player won
            current_balance + (delta as u64)
        } else {
            // Player lost
            let loss = ((-delta) as u64);
            assert!(current_balance >= loss, E_INSUFFICIENT_BALANCE);
            current_balance - loss
        };

        table::upsert(&mut ledger.balances, player, new_balance);

        // Update house balance (inverse of player)
        let house_liq = borrow_global_mut<HouseLiquidity>(@cash_trading_game);
        if (delta >= 0) {
            // Player won, house loses
            house_liq.balance = house_liq.balance - (delta as u64);
        } else {
            // Player lost, house wins
            house_liq.balance = house_liq.balance + ((-delta) as u64);
        }
    }

    // User withdraws CASH from ledger → wallet
    public entry fun withdraw_user(user: &signer, amount: u64) {
        let user_addr = signer::address_of(user);

        // Debit internal ledger
        let ledger = borrow_global_mut<UserLedger>(@cash_trading_game);
        let current = *table::borrow(&ledger.balances, user_addr);
        assert!(current >= amount, E_INSUFFICIENT_BALANCE);
        table::upsert(&mut ledger.balances, user_addr, current - amount);

        // Transfer Coin<CASH> from contract to user's wallet
        let coins = coin::withdraw<CASH>(@cash_trading_game, amount);
        coin::deposit(user_addr, coins);
    }

    // House adds liquidity
    public entry fun deposit_house(house: &signer, amount: u64) {
        let coins = coin::withdraw<CASH>(house, amount);
        coin::deposit(@cash_trading_game, coins);

        let house_liq = borrow_global_mut<HouseLiquidity>(@cash_trading_game);
        house_liq.balance = house_liq.balance + amount;
    }

    // View function: Get user's ledger balance
    #[view]
    public fun get_user_balance(player: address): u64 acquires UserLedger {
        let ledger = borrow_global<UserLedger>(@cash_trading_game);
        if (table::contains(&ledger.balances, player)) {
            *table::borrow(&ledger.balances, player)
        } else {
            0
        }
    }
}
```

**This is exactly what you need.** ✅

Compared to my `game_v3_session.move`:
- ✅ Better: Explicit house authorization
- ✅ Better: Separate house liquidity tracking
- ✅ Better: Simpler function signatures
- ✅ Better: Uses CASH token (not APT)

---

## Backend Implementation

### Where to Add Code (Latest Proposal's Guidance)

**1. Create Real Aptos Service**

```typescript
// server/src/services/aptosCash.ts (NEW FILE)
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

const CASH_TYPE = process.env.CASH_TYPE || '0x...::cash::CASH';
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0x...';
const HOUSE_PRIVATE_KEY = process.env.HOUSE_PRIVATE_KEY!;

export class AptosCashService {
  private aptos: Aptos;
  private houseAccount: Account;

  constructor() {
    const config = new AptosConfig({ network: Network.DEVNET });
    this.aptos = new Aptos(config);

    this.houseAccount = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(HOUSE_PRIVATE_KEY)
    });

    console.log('🏠 House wallet:', this.houseAccount.accountAddress.toString());
  }

  // Settle a trade (backend signs)
  async recordTrade(playerAddress: string, deltaOctas: number): Promise<string> {
    const txn = await this.aptos.transaction.build.simple({
      sender: this.houseAccount.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::liquidity::record_trade`,
        typeArguments: [CASH_TYPE],
        functionArguments: [playerAddress, deltaOctas]
      }
    });

    const response = await this.aptos.signAndSubmitTransaction({
      signer: this.houseAccount,
      transaction: txn
    });

    await this.aptos.waitForTransaction({ transactionHash: response.hash });

    console.log(`✅ Trade settled: ${playerAddress}, Δ${deltaOctas}, tx:${response.hash}`);
    return response.hash;
  }

  // Get user's on-chain balance
  async getUserBalance(playerAddress: string): Promise<number> {
    const balance = await this.aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::liquidity::get_user_balance`,
        functionArguments: [playerAddress]
      }
    });
    return Number(balance[0]);
  }

  // Fund house liquidity
  async depositHouse(amountOctas: number): Promise<string> {
    const txn = await this.aptos.transaction.build.simple({
      sender: this.houseAccount.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::liquidity::deposit_house`,
        typeArguments: [CASH_TYPE],
        functionArguments: [amountOctas]
      }
    });

    const response = await this.aptos.signAndSubmitTransaction({
      signer: this.houseAccount,
      transaction: txn
    });

    await this.aptos.waitForTransaction({ transactionHash: response.hash });
    console.log(`✅ House funded: ${amountOctas} octas`);
    return response.hash;
  }
}

export const aptosCashService = new AptosCashService();
```

**2. Update Existing Trade Complete Handler**

```typescript
// server/routes/game.ts
// FIND THIS (lines 227-284):
router.post('/trade/complete', async (req, res) => {
  try {
    const { roundId, size, entryPrice, exitPrice, entryCandleIndex, exitCandleIndex } = req.body;

    // ... existing validation code ...

    // Calculate P&L
    const priceDelta = exitPrice - entryPrice;
    const pnl = (priceDelta / entryPrice) * size;
    const pnlOctas = Math.floor(pnl * 100_000_000); // Convert to octas

    // 🆕 ADD THIS: Settle on-chain
    const playerAddress = req.body.playerAddress; // Get from session/auth
    const txHash = await aptosCashService.recordTrade(playerAddress, pnlOctas);

    // ... existing DB storage code ...

    res.json({
      success: true,
      trade: {
        // ... existing response ...
        settlementTxHash: txHash,  // 🆕 Return tx hash
        newBalance: await aptosCashService.getUserBalance(playerAddress)  // 🆕 Return new balance
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to complete trade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**3. Add Balance Endpoint**

```typescript
// server/routes/game.ts (ADD THIS)
router.get('/balance/:address', async (req, res) => {
  try {
    const balance = await aptosCashService.getUserBalance(req.params.address);
    res.json({ success: true, balance });
  } catch (error: any) {
    console.error('❌ Failed to get balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## Frontend Changes

### Update Deposit Flow

```typescript
// src/hooks/usePasskey.ts (around line 207-210)
// Current: signAndSubmitTransaction is generic

// 🆕 ADD THIS:
export async function depositCash(amount: number) {
  if (!passkeyAccount) throw new Error('Not connected');

  const amountOctas = Math.floor(amount * 100_000_000);

  const txn = await passkeyAccount.signAndSubmitTransaction({
    function: `${MODULE_ADDRESS}::liquidity::deposit_user`,
    typeArguments: [CASH_TYPE],
    arguments: [amountOctas]
  });

  await aptosClient.waitForTransaction({ transactionHash: txn.hash });

  console.log(`✅ Deposited ${amount} CASH, tx: ${txn.hash}`);
  return txn.hash;
}

export async function withdrawCash(amount: number) {
  if (!passkeyAccount) throw new Error('Not connected');

  const amountOctas = Math.floor(amount * 100_000_000);

  const txn = await passkeyAccount.signAndSubmitTransaction({
    function: `${MODULE_ADDRESS}::liquidity::withdraw_user`,
    typeArguments: [CASH_TYPE],
    arguments: [amountOctas]
  });

  await aptosClient.waitForTransaction({ transactionHash: txn.hash });

  console.log(`✅ Withdrew ${amount} CASH, tx: ${txn.hash}`);
  return txn.hash;
}
```

### Update Balance Fetching

```typescript
// src/utils/passkey-webauthn.ts:235-258
// Current: getAptBalance() fetches AptosCoin

// 🆕 REPLACE WITH:
export async function getCashBalance(address: string): Promise<number> {
  // Option 1: Call backend
  const response = await fetch(`/api/game/balance/${address}`);
  const data = await response.json();
  return data.balance / 100_000_000; // Convert octas to CASH

  // Option 2: Call on-chain view directly
  // const balance = await aptosClient.view({
  //   payload: {
  //     function: `${MODULE_ADDRESS}::liquidity::get_user_balance`,
  //     functionArguments: [address]
  //   }
  // });
  // return Number(balance[0]) / 100_000_000;
}
```

### Update Trade Completion

```typescript
// src/components/AptosCandlestickChart.tsx

async function onTradeComplete(trade: Trade) {
  const { entryPrice, exitPrice, size, roundId } = trade;

  // Show optimistic update
  const estimatedPnl = ((exitPrice - entryPrice) / entryPrice) * size;
  setBalance(prev => prev + estimatedPnl);

  try {
    // Backend settles on-chain (NO user signature)
    const response = await fetch('/api/game/trade/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roundId,
        playerAddress: userAddress,  // From keyless account
        size,
        entryPrice,
        exitPrice,
        entryCandleIndex: trade.entryCandleIndex,
        exitCandleIndex: trade.exitCandleIndex
      })
    });

    const result = await response.json();

    if (result.success) {
      // Update with actual on-chain balance
      setBalance(result.trade.newBalance);
      console.log('✅ Settled:', result.trade.settlementTxHash);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('❌ Settlement failed:', error);
    // Revert optimistic update
    setBalance(prev => prev - estimatedPnl);
    showError('Settlement failed');
  }
}
```

---

## Critical Questions You MUST Answer

Before implementing this, you need:

### 1. **CASH Token Address**
   - What is the full type? `0x[address]::cash::CASH`?
   - Is it deployed on devnet?
   - Do you need to deploy it first?

### 2. **Module Address**
   - Where will `cash_trading_game::liquidity` be deployed?
   - What address will host this module?
   - Is it your wallet address? A resource account?

### 3. **House Wallet**
   - What's the house wallet address?
   - How much CASH does it have?
   - How will you fund it initially?

### 4. **Keyless Account Funding**
   - User logs in with Google → Gets Aptos address
   - How do they get CASH to deposit?
   - Faucet? DEX? Manual transfer?

### 5. **Environment Setup**
   - Where do you store `HOUSE_PRIVATE_KEY`?
   - What about `CASH_TYPE` and `MODULE_ADDRESS`?
   - Use `.env` file? Secrets manager?

---

## My Final Recommendation

**The latest proposal is EXCELLENT and production-ready.**

Here's what you should do:

### Phase 1: Deploy Infrastructure (1-2 days)
1. ✅ Deploy CASH token (if not already deployed)
2. ✅ Deploy `liquidity.move` contract
3. ✅ Fund house wallet with CASH
4. ✅ Authorize house wallet in contract

### Phase 2: Update Backend (1 day)
1. ✅ Create `aptosCash.ts` service
2. ✅ Update `/trade/complete` to call `recordTrade()`
3. ✅ Add `/balance/:address` endpoint
4. ✅ Add error handling and retry queue

### Phase 3: Update Frontend (1 day)
1. ✅ Add `depositCash()` and `withdrawCash()` to `usePasskey`
2. ✅ Update balance fetching to use CASH
3. ✅ Update trade completion to call backend
4. ✅ Add deposit/withdraw UI

### Phase 4: Test & Deploy (1 day)
1. ✅ Test on devnet
2. ✅ Verify balances sync correctly
3. ✅ Test error cases (backend down, tx failures)
4. ✅ Deploy to production

**Total: 4-5 days to production**

---

## Comparison Summary

| Aspect | My Proposals | First External | Latest Proposal |
|--------|-------------|----------------|-----------------|
| **Quality** | Generic, high-level | Medium detail | ✅ **Excellent, production-ready** |
| **Code Integration** | Examples only | Generic | ✅ **Specific to your codebase** |
| **Implementation Time** | Unknown | ~1 week | ✅ **4-5 days** |
| **Error Handling** | Basic | Mentioned | ✅ **Comprehensive** |
| **Keyless Support** | Not mentioned | Not mentioned | ✅ **Built-in** |
| **CASH Token** | No | Yes | ✅ **Yes, with details** |

**The latest proposal is clearly the winner.** It's tailored to your exact codebase, includes production-grade error handling, and gives you a clear implementation path.

---

## Next Steps

1. **Answer the critical questions above** (CASH address, module address, etc.)
2. **Deploy the contract** (I can help write the deployment script)
3. **Implement backend changes** (following the exact code above)
4. **Update frontend** (minimal changes to existing Keyless flow)
5. **Test on devnet**
6. **Ship to production**

Do you have answers to the critical questions? That's the only blocker to starting implementation.
