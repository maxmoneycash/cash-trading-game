# 🏦 Treasury Funding Guide

## THE PROBLEM

**Error:** `Insufficient balance to withdraw or transfer`

### What's Happening:

1. **Game Start:** Player sends bet (e.g., 0.5 APT) → Treasury
2. **Game End:** Player wins profit (e.g., 3.7 APT)
3. **Payout Attempt:** Treasury tries to pay `bet + profit` (4.2 APT total)
4. **❌ FAILS:** Treasury only has 0.5 APT (the original bet)!

**The treasury is like a casino with no bankroll.**

---

## THE FIX

### Step 1: Find the Treasury Address

1. Go to: https://explorer.aptoslabs.com/account/0xac90639e0d28963f6d370fbb363d9a120b5ed00660cd276b4b1a58d499ceee34/resources?network=devnet

2. Find the resource: `0xac90639e0d28963f6d370fbb363d9a120b5ed00660cd276b4b1a58d499ceee34::game::GameTreasury`

3. Look at `signer_cap` → `account` field - that's the treasury address

**OR** calculate it programmatically:
```typescript
// Treasury is a resource account created with seed "treasury"
const treasuryAddress = deriveResourceAccountAddress(
  "0xac90639e0d28963f6d370fbb363d9a120b5ed00660cd276b4b1a58d499ceee34",
  "treasury" // seed from game.move line 86
);
```

### Step 2: Fund the Treasury

**Option A: Using Petra Wallet**
1. Copy the treasury address from Step 1
2. Send 100-500 APT to that address
3. This creates a bankroll for player payouts

**Option B: Using Aptos CLI**
```bash
aptos account transfer \
  --account <TREASURY_ADDRESS_FROM_STEP_1> \
  --amount 50000000000 \
  --url https://fullnode.devnet.aptoslabs.com
```
(50000000000 octas = 500 APT)

---

## WHY THIS IS NEEDED

### Casino Economics:

**Normal Casino:**
- House bankroll: $1,000,000
- Player bets: $100
- Player wins: House pays $200 from bankroll ✅

**Your Current Setup:**
- House bankroll: $0 ❌
- Player deposits: $100 → treasury
- Player wins: House tries to pay $200 from $100 ❌ **FAILS**

### After Funding:

**Fixed Setup:**
- House bankroll: $500 (in treasury)
- Player deposits: $100 → treasury (now $600 total)
- Player wins: House pays $200 from $600 ✅ **SUCCESS**

---

## LONG-TERM SOLUTIONS

### Option 1: Pre-Fund Treasury (Current Fix)
- Send APT to treasury before launch
- **Pros:** Simple, works immediately
- **Cons:** Requires capital, manual process

### Option 2: Cap Max Payout
Modify contract to limit max payout to bet amount:
```move
let payout = if (is_profit) {
    // Cap profit at bet amount (2x max payout)
    let capped_profit = if (amount > bet_amount) { bet_amount } else { amount };
    bet_amount + capped_profit
} else {
    // Loss case stays the same
    if (amount >= bet_amount) { 0 } else { bet_amount - amount }
};
```

### Option 3: House Edge / Fees
Take a small fee on wins to build treasury over time:
```move
let house_fee = (profit * 5) / 100; // 5% fee
let payout = bet_amount + profit - house_fee;
```

---

## IMMEDIATE ACTION NEEDED

1. **Find treasury address** (Step 1 above)
2. **Send 100-500 APT** to treasury
3. **Test the game** - payouts should work now!

---

## MONITORING

Check treasury balance anytime:
```bash
aptos move view \
  --function-id 0xac90639e0d28963f6d370fbb363d9a120b5ed00660cd276b4b1a58d499ceee34::game::get_treasury_balance \
  --url https://fullnode.devnet.aptoslabs.com
```

**Rule of thumb:** Keep treasury balance > 10x average bet to handle big wins.

---

## PNL FIX APPLIED

Also increased leverage from 20% to 200% (2x), so:
- Balance: 100 APT
- Position: 200 APT (2x leverage)
- Price move: $3 gain
- **PnL: $6 APT** (was $0.60, now 10x bigger!)
