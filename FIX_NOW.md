# 🚨 IMMEDIATE FIX REQUIRED

## THE EXACT PROBLEM

**Treasury Address:** `0x19eaa033db4aa7c138168e903315f519acfb787bebd7576a8e4c440b9dc451d7`

**Current Balance:** `ZERO APT` (CoinStore doesn't exist = never received funds)

**What's Failing:**
- Your last game tried to pay out **4.198 APT**
- Treasury has **0 APT**
- Transaction fails with "Insufficient balance"

---

## FIX IN 2 STEPS (DO NOW)

### Step 1: Send APT to Treasury

**Using Petra Wallet:**
1. Copy this address: `0x19eaa033db4aa7c138168e903315f519acfb787bebd7576a8e4c440b9dc451d7`
2. Click "Send" in Petra
3. Paste the address
4. Send **100 APT** (or more)
5. Confirm transaction

**Using Aptos CLI:**
```bash
aptos account transfer \
  --account 0x19eaa033db4aa7c138168e903315f519acfb787bebd7576a8e4c440b9dc451d7 \
  --amount 10000000000 \
  --url https://fullnode.devnet.aptoslabs.com
```

### Step 2: Verify Treasury Has Funds

Check balance here:
https://explorer.aptoslabs.com/account/0x19eaa033db4aa7c138168e903315f519acfb787bebd7576a8e4c440b9dc451d7?network=devnet

You should see ~100 APT balance.

---

## WHY THIS HAPPENED

The contract **does** register the treasury for APT (line 89 in game.move):
```move
coin::register<AptosCoin>(&treasury_signer);
```

BUT registration only creates the CoinStore - it doesn't add funds!

**It's like opening a bank account with $0 balance.**

The treasury needs liquidity to pay winners, just like a casino needs a bankroll.

---

## AFTER FUNDING

Once the treasury has APT:
1. Your stuck game should be able to complete
2. Click "Approve" on the pending transaction
3. You'll receive your payout (4.198 APT)
4. Future games will work normally

**How long will 100 APT last?**
- Average bet: 0.5 APT
- Average payout: ~1.5 APT (3x bet on big wins)
- 100 APT bankroll = ~67 player wins before needing refill

---

## BETTER LONG-TERM FIX

### Option A: Add House Edge (Recommended)

Modify `complete_game` to take a 5% fee:
```move
let payout = if (is_profit) {
    let fee = (amount * 5) / 100;  // 5% house edge
    bet_amount + amount - fee
} else {
    if (amount >= bet_amount) { 0 } else { bet_amount - amount }
};
```

This builds treasury balance over time!

### Option B: Cap Max Profit

Limit max payout to 2x bet:
```move
let max_profit = bet_amount; // Can't win more than 2x
let capped_amount = if (amount > max_profit) { max_profit } else { amount };
```

### Option C: Require Treasury Minimum

Add a check before allowing games:
```move
let treasury_balance = coin::balance<AptosCoin>(treasury_address);
assert!(treasury_balance >= MIN_TREASURY_BALANCE, E_TREASURY_LOW);
```

---

## PNL FIX ALSO APPLIED

Changed leverage from 20% → 200% (2x):
- Before: 100 APT balance → 20 APT position → tiny PnL
- After: 100 APT balance → 200 APT position → **10x bigger PnL!**

Price move of $3 now generates **6 APT profit** instead of 0.6 APT.

---

## ACTION ITEMS

- [ ] Send 100 APT to treasury: `0x19eaa033db4aa7c138168e903315f519acfb787bebd7576a8e4c440b9dc451d7`
- [ ] Verify balance on explorer
- [ ] Retry your stuck transaction
- [ ] Test a new game
- [ ] (Later) Add house edge or profit cap to contract
