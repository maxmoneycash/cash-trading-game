# 🚀 CASH Trading Game - Mainnet Quickstart

## ⚡ **Get Running in 10 Minutes**

### **Step 1: Generate Keys (2 minutes)**

```bash
# Generate deployer key (your main account)
aptos key generate --output-file deployer.key --assume-yes

# Generate backend key (separate for security)  
aptos key generate --output-file backend.key --assume-yes

# Show the addresses (save these!)
echo "Deployer Address:" $(aptos key extract-public-key --private-key-file deployer.key | aptos key derive-address)
echo "Backend Address:" $(aptos key extract-public-key --private-key-file backend.key | aptos key derive-address)
```

### **Step 2: Get CASH Tokens (5 minutes)**

Since CASH is mainnet-only, you need real tokens:

1. **Buy APT** on exchange (Binance, Coinbase, OKX)
2. **Send APT to your deployer address** (from Step 1)
3. **Swap APT → CASH** on [Panora DEX](https://panora.exchange)
   - You need ~10,000 CASH for house funding + gas
   - Minimum: 5,000 CASH

### **Step 3: Deploy Contract (2 minutes)**

```bash
# Set your keys (replace with actual keys from Step 1)
export DEPLOYER_PRIVATE_KEY="0xYOUR_DEPLOYER_KEY_FROM_deployer.key"
export BACKEND_PRIVATE_KEY="0xYOUR_BACKEND_KEY_FROM_backend.key" 
export INITIAL_HOUSE_FUNDING="5000"  # Start with 5k CASH

# Deploy to mainnet
./scripts/mainnet-deploy.sh
```

### **Step 4: Start Backend (1 minute)**

```bash
# Copy the contract address from deployment output
cp .env.mainnet server/.env

# Edit server/.env and update:
# CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS

# Start server
cd server
npm install
npm run dev
```

### **Step 5: Start Frontend & Play!**

```bash
# In new terminal
npm install  
npm run dev

# Open http://localhost:5173
# Connect with Google (Keyless)
# Copy your address and send yourself CASH tokens
# Deposit and play!
```

---

## 🎮 **User Transaction Experience**

### **What Changed with Backend Settlement:**

#### ❌ **Before (APT System):**
```
1. User signs DEPOSIT transaction
2. User plays game (no transactions)
3. 🚨 User signs SETTLEMENT transaction (popup!)
4. User signs WITHDRAW transaction
```

#### ✅ **After (CASH System):**
```
1. User signs DEPOSIT transaction  
2. User plays game (no transactions)
3. ✨ Backend settles automatically (NO USER POPUP!)
4. User signs WITHDRAW transaction
```

### **Transaction Popups Now:**
- **DEPOSIT**: User signs (1 popup)
- **GAMEPLAY**: Zero popups - seamless experience!
- **SETTLEMENT**: Backend handles (0 popups)
- **WITHDRAW**: User signs (1 popup)

**Result: 66% fewer transaction popups!**

---

## 🔍 **Verify It's Working**

### Check Contract Status:
```bash
curl http://localhost:3001/api/game/treasury/status
```

### Check Your CASH Balance:
```bash  
curl "http://localhost:3001/api/game/balance/cash?address=YOUR_KEYLESS_ADDRESS"
```

### Test Settlement:
```bash
curl -X POST http://localhost:3001/api/game/settlement/manual \
  -H "Content-Type: application/json" \
  -d '{"playerAddress": "YOUR_ADDRESS", "deltaCAH": 10.5}'
```

---

## 🎯 **What You'll See**

1. **Smooth Deposits**: One-click CASH deposits with clear balance display
2. **Seamless Gameplay**: No transaction interruptions during trades
3. **Automatic Settlement**: Balances update without user interaction
4. **Modern UI**: CASH balance display with funding instructions

---

## 🆘 **If Something Goes Wrong**

### **"Backend Not Authorized" Error:**
```bash
# Re-authorize backend (use your deployer key)
aptos move run \
  --function-id CONTRACT_ADDRESS::cash_liquidity::add_authorized_backend \
  --args address:BACKEND_ADDRESS u64:10 u64:60
```

### **"Insufficient Treasury" Error:**
```bash  
# Add more CASH to treasury
aptos move run \
  --function-id CONTRACT_ADDRESS::cash_liquidity::deposit_house \
  --args u64:5000000000  # 5,000 CASH in micro-CASH
```

### **"CASH Balance Zero" Error:**
- Check you sent CASH (not APT) to your keyless address
- CASH decimals = 6 (not 8)
- Use Panora DEX to swap APT → CASH

---

## 🎉 **You're Live!**

Your CASH trading game is now running on **Aptos Mainnet** with:
- ✅ Real CASH token integration  
- ✅ Secure resource account treasury
- ✅ Automated backend settlement
- ✅ Minimal user transaction friction

**Game URL**: http://localhost:5173
**Backend**: http://localhost:3001
**Treasury**: Funded and operational

**Ready to trade with CASH! 💰**
