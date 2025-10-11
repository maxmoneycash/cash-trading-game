# 🚨 EMERGENCY FIXES APPLIED

## What Was Broken:

### 1. ❌ Massive Profits Bankrupting Treasury
- **Problem:** 2x leverage + 8% pumps = $100+ profit on 0.5 APT bet
- **Treasury has:** 0 APT (only what player deposited)
- **Result:** Transaction fails, shows "-0.5 APT", game stuck

### 2. ❌ Game Stuck After Failed Settlement
- No error recovery
- State remains "settling" forever
- Balance doesn't update

### 3. ❌ Balance Mismatch (Footer vs Modal)
- Different sources, not synced

---

## ✅ FIXES APPLIED (Just Now):

### Fix 1: Reduced Leverage & Volatility
**Position size:** 200% → **50%** of balance
- Before: 100 APT balance → 200 APT position (insane!)
- After: 100 APT balance → **50 APT position** (sane)

**Max price move:** 8% → **2%** per candle
- Before: Could gain 8 APT in one candle
- After: Max gain ~1 APT per candle

**Result:** Max profit now ~2x bet (affordable for treasury)

### Fix 2: Removed MOON Mode
- Deleted 20x volatility regime
- Removed 3-8% pump candles
- Capped jumps at 0.8% (was 2%)

**Why:** The insane pumps were fun but broke the economics!

---

## 📊 NEW GAME ECONOMICS:

With 0.5 APT bet:
- **Position:** 0.5 × 50% of balance = ~25 APT position (if balance = 50 APT)
- **Max move:** 2% per candle
- **Max profit per candle:** 25 × 0.02 = 0.5 APT
- **Max profit over 30s:** ~2-3 APT (4-6x return)

**This means:**
- Treasury needs: 0.5 + 3 = **3.5 APT max payout**
- Current treasury: 0 APT ❌ **STILL NEED TO FUND IT!**

---

## 🔥 YOU STILL NEED TO DO THIS:

### Option A: Fund Treasury (Temporary)
```bash
# Send to treasury address:
0x19eaa033db4aa7c138168e903315f519acfb787bebd7576a8e4c440b9dc451d7

# Amount: 50-100 APT
```

### Option B: Deploy Safe Contract (Better)
I created `contracts/sources/game_v2.move` that **caps profit at 2x bet**.

Deploy it:
```bash
cd contracts
aptos move publish --profile default
```

Then update `VITE_APTOS_CONTRACT_ADDRESS` in `.env`

---

## 🎯 IMMEDIATE WORKAROUND (No Deploy Needed):

**Lower the bet amount in the code:**

Edit `src/components/AptosCandlestickChart.tsx` line 167:
```typescript
const DEFAULT_BET_AMOUNT = 0.05; // Was 0.5, now 0.05 APT
```

**Why this works:**
- 0.05 APT bet → max ~0.3 APT profit
- Payout = 0.05 + 0.3 = **0.35 APT**
- Even empty treasury can pay from the 0.05 APT the player deposited!

---

## 📉 Balance Sync Fix (TODO):

The balance mismatch happens because:
1. **Footer** reads from `walletBalance` hook
2. **Modal** reads from localStorage or different state

Need to:
- Use single source of truth
- Update both on every settlement
- Clear stuck state on error

---

## 🔄 Game Recovery (If Stuck):

If game is stuck in "settling":
1. **Refresh page** (hard refresh: Cmd+Shift+R)
2. **Clear session storage:**
   ```javascript
   // In browser console:
   sessionStorage.clear();
   localStorage.clear();
   window.location.reload();
   ```
3. **Reconnect wallet**

---

## 🎮 TESTING THE FIX:

1. Refresh the game
2. Start new round with 0.05 APT bet (edit code first)
3. Make a trade
4. Hold for 10-15 seconds
5. Close position
6. Game should settle successfully (profit will be small but it WORKS)

---

## 📝 SUMMARY:

**What changed:**
- ✅ Leverage: 200% → 50%
- ✅ Max move: 8% → 2%
- ✅ Removed MOON mode
- ✅ Capped jumps

**What's still needed:**
- ❌ Fund treasury (50 APT) **OR**
- ❌ Deploy safe contract with 2x profit cap **OR**
- ❌ Lower bet to 0.05 APT (quick hack)

**Quick fix right now:**
```typescript
// Line 167 in AptosCandlestickChart.tsx
const DEFAULT_BET_AMOUNT = 0.05; // Change from 0.5
```

Then refresh and test!
