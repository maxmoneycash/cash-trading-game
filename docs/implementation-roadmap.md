# Implementation Roadmap: From Here to Working Game

## Current State ✅

**What you already have:**
1. ✅ Keyless authentication working (`src/hooks/usePasskey.ts`)
2. ✅ Express backend with game routes (`server/`)
3. ✅ Frontend game interface (`src/components/AptosCandlestickChart.tsx`)
4. ✅ Database tracking rounds/trades (`server/database/`)
5. ✅ CASH token deployed on mainnet
   - Address: `0x61ed8b048636516b4eaf4c74250fa4f9440d9c3e163d96aeb863fe658a4bdc67::CASH::CASH`
   - Decimals: 6

**What's missing:**
- ❌ Move contract for game logic
- ❌ Backend integration with blockchain
- ❌ Deposit/withdraw UI
- ❌ Settlement integration

---

## Implementation Steps (7 Tasks)

### Task 1: Write Move Contract ⏱️ 1-2 hours

**File:** `contracts/sources/liquidity.move`

Create the contract with:
- Resource account for house treasury (NO private key)
- User ledger tracking
- Authorized backend whitelist
- Deposit/withdraw/settlement functions

**I can write this for you right now.** The contract structure is already designed in `docs/security-and-implementation-details.md`.

**Deliverable:** Complete `liquidity.move` file ready to deploy

---

### Task 2: Deploy Contract to Devnet ⏱️ 30 mins

**Steps:**

1. **Create deployment account** (if you don't have one):
   ```bash
   aptos init --profile devnet --network devnet
   aptos account fund-with-faucet --profile devnet
   ```

2. **Update Move.toml**:
   ```toml
   [package]
   name = "CashTradingGame"
   version = "1.0.0"

   [addresses]
   cash_trading_game = "0xYOUR_DEVNET_ADDRESS"
   cash = "0x61ed8b048636516b4eaf4c74250fa4f9440d9c3e163d96aeb863fe658a4bdc67"

   [dependencies.AptosFramework]
   git = "https://github.com/aptos-labs/aptos-core.git"
   rev = "mainnet"
   subdir = "aptos-move/framework/aptos-framework"
   ```

3. **Deploy**:
   ```bash
   cd contracts
   aptos move compile --named-addresses cash_trading_game=devnet
   aptos move publish --profile devnet
   ```

4. **Note the deployed address** - you'll need it for backend config

**Deliverable:** Contract deployed, resource account created

---

### Task 3: Authorize Backend & Fund House ⏱️ 15 mins

1. **Generate backend keypair**:
   ```bash
   aptos key generate --output-file backend-key.json
   ```

2. **Authorize backend**:
   ```bash
   aptos move run \
     --function-id 0xYOUR_CONTRACT::liquidity::add_authorized_backend \
     --args address:0xBACKEND_ADDRESS \
     --profile devnet
   ```

3. **Get CASH tokens for testing**:
   - Option A: If CASH exists on devnet, get from faucet
   - Option B: Use APT for testing first, deploy CASH later

4. **Fund house treasury**:
   ```bash
   aptos move run \
     --function-id 0xYOUR_CONTRACT::liquidity::deposit_house \
     --args u64:100000000000 \
     --profile devnet
   ```

**Deliverable:** Backend authorized, house funded with test tokens

---

### Task 4: Create Backend Aptos Service ⏱️ 1 hour

**File:** `server/src/services/aptosCash.ts`

Replace mock `AptosService.ts` with real implementation:

```typescript
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

const NETWORK = process.env.APTOS_NETWORK || Network.DEVNET;
const MODULE_ADDRESS = process.env.MODULE_ADDRESS!;
const CASH_TYPE = process.env.CASH_TYPE || '0x1::aptos_coin::AptosCoin'; // Use APT for testing
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY!;

export class AptosCashService {
  private aptos: Aptos;
  private backendAccount: Account;

  constructor() {
    const config = new AptosConfig({ network: NETWORK });
    this.aptos = new Aptos(config);

    this.backendAccount = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(BACKEND_PRIVATE_KEY)
    });

    console.log('🔗 Aptos Service initialized');
    console.log('🔑 Backend address:', this.backendAccount.accountAddress.toString());
    console.log('📦 Module address:', MODULE_ADDRESS);
    console.log('💰 Token type:', CASH_TYPE);
  }

  // Settle a trade (backend signs, resource account pays)
  async recordTrade(playerAddress: string, deltaOctas: number): Promise<string> {
    try {
      const txn = await this.aptos.transaction.build.simple({
        sender: this.backendAccount.accountAddress,
        data: {
          function: `${MODULE_ADDRESS}::liquidity::record_trade`,
          typeArguments: [CASH_TYPE],
          functionArguments: [playerAddress, deltaOctas]
        }
      });

      const response = await this.aptos.signAndSubmitTransaction({
        signer: this.backendAccount,
        transaction: txn
      });

      await this.aptos.waitForTransaction({ transactionHash: response.hash });

      console.log(`✅ Trade settled: player=${playerAddress}, delta=${deltaOctas}, tx=${response.hash}`);
      return response.hash;

    } catch (error: any) {
      console.error('❌ Trade settlement failed:', error);
      throw new Error(`Settlement failed: ${error.message}`);
    }
  }

  // Get user's on-chain balance
  async getUserBalance(playerAddress: string): Promise<number> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::liquidity::get_user_balance`,
          functionArguments: [playerAddress]
        }
      });

      return Number(result[0]);

    } catch (error: any) {
      console.error('❌ Failed to get balance:', error);
      return 0;
    }
  }

  // Get house treasury balance
  async getHouseBalance(): Promise<number> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::liquidity::get_treasury_balance`,
          functionArguments: []
        }
      });

      return Number(result[0]);

    } catch (error: any) {
      console.error('❌ Failed to get house balance:', error);
      return 0;
    }
  }
}

export const aptosCashService = new AptosCashService();
```

**Update `.env`:**
```env
# Aptos Configuration
APTOS_NETWORK=devnet
MODULE_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
CASH_TYPE=0x1::aptos_coin::AptosCoin
BACKEND_PRIVATE_KEY=0xYOUR_BACKEND_PRIVATE_KEY
```

**Deliverable:** Real Aptos service replacing mock implementation

---

### Task 5: Update Backend Trade Settlement ⏱️ 30 mins

**File:** `server/routes/game.ts`

**Find the `/trade/complete` endpoint** (around line 227) and update it:

```typescript
import { aptosCashService } from '../services/aptosCash';

router.post('/trade/complete', async (req, res) => {
  try {
    const {
      roundId,
      playerAddress,  // 🆕 Add this
      size,
      entryPrice,
      exitPrice,
      entryCandleIndex,
      exitCandleIndex
    } = req.body;

    // Existing validation...
    const round = await db.getRoundById(roundId);
    if (!round) {
      return res.status(404).json({ success: false, error: 'Round not found' });
    }

    // Calculate P&L
    const priceDelta = exitPrice - entryPrice;
    const pnl = (priceDelta / entryPrice) * size;
    const pnlOctas = Math.floor(pnl * 1_000_000); // CASH has 6 decimals

    console.log(`💰 Trade P&L: ${pnl.toFixed(6)} CASH (${pnlOctas} micro-CASH)`);

    // 🆕 Settle on-chain
    let txHash;
    try {
      txHash = await aptosCashService.recordTrade(playerAddress, pnlOctas);
    } catch (error: any) {
      console.error('⚠️ On-chain settlement failed, storing pending:', error);
      // Store as pending settlement for retry
      txHash = null;
    }

    // Store trade in database
    await db.insertTrade({
      roundId,
      playerAddress,
      size,
      entryPrice,
      exitPrice,
      pnl,
      settlementTxHash: txHash,
      status: txHash ? 'settled' : 'pending'
    });

    // Get updated balance
    const newBalance = await aptosCashService.getUserBalance(playerAddress);

    res.json({
      success: true,
      trade: {
        pnl,
        pnlOctas,
        settlementTxHash: txHash,
        newBalance
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to complete trade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete trade',
      details: error.message
    });
  }
});

// 🆕 Add balance endpoint
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

**Deliverable:** Backend auto-settles trades on-chain after each game

---

### Task 6: Add Deposit/Withdraw to Frontend ⏱️ 1 hour

**File:** `src/hooks/usePasskey.ts`

Add these functions (around line 320):

```typescript
// Deposit CASH into game contract
export async function depositCash(amount: number) {
  if (!passkeyAccount) {
    throw new Error('Not connected with passkey');
  }

  const amountOctas = Math.floor(amount * 1_000_000); // CASH has 6 decimals

  try {
    const txn = await passkeyAccount.signAndSubmitTransaction({
      function: `${MODULE_ADDRESS}::liquidity::deposit_user`,
      typeArguments: [CASH_TYPE],
      arguments: [amountOctas]
    });

    await aptosClient.waitForTransaction({ transactionHash: txn.hash });

    console.log(`✅ Deposited ${amount} CASH, tx: ${txn.hash}`);
    return txn.hash;

  } catch (error: any) {
    console.error('❌ Deposit failed:', error);
    throw new Error(`Deposit failed: ${error.message}`);
  }
}

// Withdraw CASH from game contract
export async function withdrawCash(amount: number) {
  if (!passkeyAccount) {
    throw new Error('Not connected with passkey');
  }

  const amountOctas = Math.floor(amount * 1_000_000);

  try {
    const txn = await passkeyAccount.signAndSubmitTransaction({
      function: `${MODULE_ADDRESS}::liquidity::withdraw_user`,
      typeArguments: [CASH_TYPE],
      arguments: [amountOctas]
    });

    await aptosClient.waitForTransaction({ transactionHash: txn.hash });

    console.log(`✅ Withdrew ${amount} CASH, tx: ${txn.hash}`);
    return txn.hash;

  } catch (error: any) {
    console.error('❌ Withdrawal failed:', error);
    throw new Error(`Withdrawal failed: ${error.message}`);
  }
}

// Get user's game balance (from contract ledger)
export async function getGameBalance(address: string): Promise<number> {
  try {
    const response = await fetch(`/api/game/balance/${address}`);
    const data = await response.json();
    return data.balance / 1_000_000; // Convert to CASH
  } catch (error) {
    console.error('❌ Failed to get game balance:', error);
    return 0;
  }
}
```

**Add constants at top of file:**
```typescript
const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS || '';
const CASH_TYPE = import.meta.env.VITE_CASH_TYPE || '0x1::aptos_coin::AptosCoin';
```

**Deliverable:** Deposit/withdraw functions ready to use

---

### Task 7: Create Deposit/Withdraw UI ⏱️ 1-2 hours

**File:** `src/components/wallet/WalletPicker.tsx`

Add a "Manage Balance" tab:

```typescript
function ManageBalanceTab() {
  const { passkeyAddress } = usePasskeyContext();
  const [walletBalance, setWalletBalance] = useState(0);
  const [gameBalance, setGameBalance] = useState(0);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    async function loadBalances() {
      if (!passkeyAddress) return;

      // Get wallet CASH balance
      const cashBalance = await getCashBalance(passkeyAddress);
      setWalletBalance(cashBalance);

      // Get game contract balance
      const contractBalance = await getGameBalance(passkeyAddress);
      setGameBalance(contractBalance);
    }

    loadBalances();
    const interval = setInterval(loadBalances, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [passkeyAddress]);

  async function handleDeposit() {
    if (!depositAmount || isNaN(Number(depositAmount))) return;

    setIsDepositing(true);
    try {
      await depositCash(Number(depositAmount));
      alert(`✅ Deposited ${depositAmount} CASH`);
      setDepositAmount('');

      // Refresh balances
      const cashBalance = await getCashBalance(passkeyAddress);
      setWalletBalance(cashBalance);
      const contractBalance = await getGameBalance(passkeyAddress);
      setGameBalance(contractBalance);

    } catch (error: any) {
      alert(`❌ Deposit failed: ${error.message}`);
    } finally {
      setIsDepositing(false);
    }
  }

  async function handleWithdraw() {
    if (!withdrawAmount || isNaN(Number(withdrawAmount))) return;

    setIsWithdrawing(true);
    try {
      await withdrawCash(Number(withdrawAmount));
      alert(`✅ Withdrew ${withdrawAmount} CASH`);
      setWithdrawAmount('');

      // Refresh balances
      const cashBalance = await getCashBalance(passkeyAddress);
      setWalletBalance(cashBalance);
      const contractBalance = await getGameBalance(passkeyAddress);
      setGameBalance(contractBalance);

    } catch (error: any) {
      alert(`❌ Withdrawal failed: ${error.message}`);
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <div className="manage-balance-tab">
      <h3>Manage Balance</h3>

      {/* Balances */}
      <div className="balances">
        <div className="balance-item">
          <span className="label">Wallet Balance:</span>
          <span className="amount">{walletBalance.toFixed(6)} CASH</span>
        </div>
        <div className="balance-item">
          <span className="label">Game Balance:</span>
          <span className="amount">{gameBalance.toFixed(6)} CASH</span>
        </div>
      </div>

      {/* Deposit */}
      <div className="deposit-section">
        <h4>Deposit to Game</h4>
        <input
          type="number"
          placeholder="Amount (CASH)"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          disabled={isDepositing}
        />
        <button onClick={handleDeposit} disabled={isDepositing}>
          {isDepositing ? 'Depositing...' : 'Deposit'}
        </button>
      </div>

      {/* Withdraw */}
      <div className="withdraw-section">
        <h4>Withdraw from Game</h4>
        <input
          type="number"
          placeholder="Amount (CASH)"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          disabled={isWithdrawing}
        />
        <button onClick={handleWithdraw} disabled={isWithdrawing}>
          {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
        </button>
      </div>

      {/* Receive CASH */}
      <div className="receive-section">
        <h4>Receive CASH</h4>
        <p>Send CASH to this address:</p>
        <div className="address-box">
          <code>{passkeyAddress}</code>
          <button onClick={() => navigator.clipboard.writeText(passkeyAddress)}>
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Update WalletPicker to add the tab:**
```typescript
const [activeTab, setActiveTab] = useState<'connect' | 'balance'>('connect');

return (
  <div className="wallet-picker">
    <div className="tabs">
      <button onClick={() => setActiveTab('connect')}>Connect</button>
      <button onClick={() => setActiveTab('balance')}>Balance</button>
    </div>

    {activeTab === 'connect' && <ConnectTab />}
    {activeTab === 'balance' && <ManageBalanceTab />}
  </div>
);
```

**Deliverable:** Full deposit/withdraw UI with balance display

---

### Task 8: Update Game to Use On-Chain Balance ⏱️ 30 mins

**File:** `src/components/AptosCandlestickChart.tsx`

Update trade completion:

```typescript
async function onTradeComplete(trade: Trade) {
  const { entryPrice, exitPrice, size, roundId } = trade;

  // Show optimistic update
  const estimatedPnl = ((exitPrice - entryPrice) / entryPrice) * size;
  setBalance(prev => prev + estimatedPnl);

  try {
    // Backend settles on-chain
    const response = await fetch('/api/game/trade/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roundId,
        playerAddress: passkeyAddress, // 🆕 Send player address
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
      setBalance(result.trade.newBalance / 1_000_000);
      console.log('✅ Trade settled on-chain:', result.trade.settlementTxHash);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('❌ Settlement failed:', error);
    // Revert optimistic update
    setBalance(prev => prev - estimatedPnl);
    showError('Settlement failed. Please try again.');
  }
}
```

**Deliverable:** Game uses real on-chain balance

---

## Testing Checklist

Once all tasks are complete:

1. ✅ **User can log in with Google** (Keyless)
2. ✅ **User sees their Aptos address**
3. ✅ **User can copy address to receive CASH**
4. ✅ **User can deposit CASH into game contract** (signs once)
5. ✅ **User sees game balance update**
6. ✅ **User plays a game** (no popups during gameplay)
7. ✅ **Backend settles trade automatically** (no user signature)
8. ✅ **Game balance updates after trade**
9. ✅ **User can withdraw CASH back to wallet** (signs once)
10. ✅ **User sees withdrawal in wallet**

---

## Timeline Estimate

| Task | Time | Cumulative |
|------|------|------------|
| 1. Write Move contract | 1-2 hrs | 2 hrs |
| 2. Deploy to devnet | 30 mins | 2.5 hrs |
| 3. Authorize & fund | 15 mins | 2.75 hrs |
| 4. Backend Aptos service | 1 hr | 3.75 hrs |
| 5. Update trade settlement | 30 mins | 4.25 hrs |
| 6. Add deposit/withdraw functions | 1 hr | 5.25 hrs |
| 7. Create deposit/withdraw UI | 1-2 hrs | 7 hrs |
| 8. Update game to use balance | 30 mins | 7.5 hrs |

**Total: ~7-8 hours of focused work**

Could be done in:
- 1 full day (8 hours)
- 2 half days (4 hours each)
- 1 week working 1-2 hours/day

---

## What You Need to Decide

Before we start:

1. **Test on devnet or mainnet first?**
   - Devnet: Free testing, but CASH might not exist there
   - Mainnet: Real CASH, but costs real money

2. **Use CASH or APT for initial testing?**
   - CASH: Real token, but need to acquire it
   - APT: Easy to get from faucet on devnet

3. **Want me to write the Move contract now?**
   - I can create `contracts/sources/liquidity.move` with all the code

**My recommendation:**
- Start with **devnet + APT** for testing
- Once everything works, deploy to **mainnet with CASH**
- This lets you iterate quickly without spending money

---

## Ready to Start?

I can write the Move contract right now if you want to get started. Just say the word!
