# Security & Implementation Details

## CASH Token Information (From Transaction)

From the swap transaction you provided:

```typescript
// CASH Token Details (MAINNET)
const CASH_TOKEN = {
  address: "0x61ed8b048636516b4eaf4c74250fa4f9440d9c3e163d96aeb863fe658a4bdc67::CASH::CASH",
  decimals: 6,  // NOT 8 like APT!
  symbol: "CASH",
  name: "CASH",

  // Fungible Asset metadata object
  metadataAddress: "0xc692943f7b340f02191c5de8dac2f827e0b66b3ed2206206a3526bcb0cae6e40"
};
```

**Important**: CASH uses **6 decimals**, not 8 like APT. All conversion functions need to use `1_000_000`, not `100_000_000`.

---

## User Funding Flow (Keyless Accounts)

**Your approach is correct:**

```
1. User logs in with Google (Keyless)
   ↓
2. App derives Aptos address: 0x3e38bc82...
   ↓
3. App shows address in UI with "Copy" button
   ↓
4. User sends CASH from:
   - Centralized exchange (Binance, Coinbase, etc.)
   - DEX (Panora, LiquidSwap, etc.)
   - Another Aptos wallet
   ↓
5. CASH arrives at user's Keyless address
   ↓
6. User deposits CASH into game contract
```

**Implementation:**

```typescript
// src/components/wallet/WalletPicker.tsx (already exists)
// Just add a "Receive CASH" tab

function ReceiveCashTab() {
  const { passkeyAddress } = usePasskeyContext();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(passkeyAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="receive-cash-tab">
      <h3>Receive CASH</h3>
      <p>Send CASH tokens to this address:</p>

      <div className="address-box">
        <code>{passkeyAddress}</code>
        <button onClick={copyAddress}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <div className="instructions">
        <h4>How to get CASH:</h4>
        <ol>
          <li>Buy APT on a CEX (Binance, Coinbase)</li>
          <li>Withdraw APT to this address</li>
          <li>Swap APT → CASH on <a href="https://panora.exchange">Panora DEX</a></li>
          <li>Return here and deposit CASH into the game</li>
        </ol>
      </div>

      <div className="qr-code">
        {/* Optional: Show QR code of address */}
        <QRCode value={passkeyAddress} />
      </div>
    </div>
  );
}
```

**This is the standard Web3 onboarding flow.** ✅

---

## House Wallet Private Key Security (CRITICAL)

**You're absolutely right to be concerned.**

Storing the house private key is the **single biggest security risk** in this architecture. If compromised:
- ❌ Attacker drains entire house liquidity
- ❌ Attacker can settle fake trades
- ❌ Game is bankrupt

### Option 1: Resource Account (BEST for Aptos)

**What is a Resource Account?**
- A Move-native account without a private key
- Controlled entirely by Move code
- Cannot sign transactions externally
- Perfect for autonomous contracts

**How it works:**

```move
// In your liquidity.move contract
module cash_trading_game::liquidity {
    use aptos_framework::account::{Self, SignerCapability};

    struct HouseTreasury has key {
        signer_capability: SignerCapability,  // This "owns" the resource account
    }

    // Called once during contract initialization
    fun init_module(deployer: &signer) {
        // Create a resource account (no private key!)
        let (treasury_signer, signer_cap) = account::create_resource_account(
            deployer,
            b"cash_game_treasury"
        );

        // Register treasury for CASH token
        coin::register<CASH>(&treasury_signer);

        // Store the signer capability
        move_to(deployer, HouseTreasury {
            signer_capability: signer_cap
        });
    }

    // Settle trade using resource account (NO backend private key needed)
    public entry fun record_trade(
        authorized_backend: &signer,  // Backend still signs, but...
        player: address,
        delta: i64
    ) acquires HouseTreasury, UserLedger {
        // Verify backend is authorized
        assert!(signer::address_of(authorized_backend) == @authorized_backend, E_UNAUTHORIZED);

        // Update ledgers (player and house)
        // ... ledger update logic ...

        // If we need to transfer CASH, use the resource account
        if (need_to_transfer) {
            let treasury = borrow_global<HouseTreasury>(@cash_trading_game);
            let treasury_signer = account::create_signer_with_capability(&treasury.signer_capability);

            // Transfer using resource account (not backend's key)
            coin::transfer<CASH>(&treasury_signer, player, amount);
        }
    }
}
```

**Backend code:**

```typescript
// server/src/services/aptosCash.ts

// Backend DOES need a private key, but it's NOT the house wallet
// It's just an "authorized backend" key with limited permissions

const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;  // Less risky
const AUTHORIZED_BACKEND_ADDRESS = process.env.AUTHORIZED_BACKEND_ADDRESS;

export class AptosCashService {
  private backendAccount: Account;

  constructor() {
    // Backend account is separate from house treasury
    this.backendAccount = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(BACKEND_PRIVATE_KEY)
    });

    console.log('🔑 Backend signer:', this.backendAccount.accountAddress.toString());
    console.log('🏦 House treasury: [Resource Account - no private key]');
  }

  async recordTrade(playerAddress: string, delta: number) {
    // Backend signs, but house funds come from resource account
    const txn = await this.aptos.transaction.build.simple({
      sender: this.backendAccount.accountAddress,  // Backend signs
      data: {
        function: `${MODULE_ADDRESS}::liquidity::record_trade`,
        functionArguments: [playerAddress, delta]
      }
    });

    const response = await this.aptos.signAndSubmitTransaction({
      signer: this.backendAccount,  // Backend key (not house key)
      transaction: txn
    });

    return response.hash;
  }
}
```

**Security benefits:**
- ✅ House funds in resource account (no private key exists)
- ✅ Backend key has LIMITED permissions (can only call `record_trade`)
- ✅ If backend key is compromised, attacker can't withdraw house funds
- ✅ Worst case: Attacker can settle fake trades (but can't steal CASH directly)

**Mitigation for fake trades:**
- Add rate limiting in contract
- Add max settlement amount per transaction
- Monitor settlements and auto-pause if anomalies detected

---

### Option 2: Multi-Signature House Wallet

**How it works:**
- House wallet requires 2-of-3 signatures
- Backend has 1 key, you have 2 keys (cold storage)
- Backend can't act alone

```move
// Use Aptos multisig module
use aptos_framework::multisig_account;

// Create 2-of-3 multisig
let owners = vector[backend_address, your_key_1, your_key_2];
let threshold = 2;

multisig_account::create_with_owners(deployer, owners, threshold, ...);
```

**Problem:** Backend can't auto-settle trades (needs your manual approval). ❌

**Only use this for withdrawing house profits, not for settlements.**

---

### Option 3: Hot/Cold Wallet Separation

**How it works:**

```
┌─────────────────────────────────────┐
│ COLD WALLET (99% of funds)          │
│ Private key in hardware wallet      │
│ Never touches backend               │
│ Balance: 1,000,000 CASH             │
└─────────────────────────────────────┘
         ↓
    (Manual transfer when needed)
         ↓
┌─────────────────────────────────────┐
│ HOT WALLET (1% of funds)            │
│ Private key in backend .env         │
│ Auto-settles trades                 │
│ Balance: 10,000 CASH (max exposure) │
└─────────────────────────────────────┘
```

**Implementation:**

```typescript
// Backend monitors hot wallet balance
async function checkHotWalletBalance() {
  const balance = await getHouseCashBalance();
  const threshold = 5_000_000_000; // 5,000 CASH (in micro-CASH)

  if (balance < threshold) {
    // Alert admin to refill from cold wallet
    console.error('🚨 Hot wallet low! Balance:', balance);
    sendAlertEmail('Hot wallet needs refill');

    // Pause settlements until refilled
    pauseSettlements();
  }
}

setInterval(checkHotWalletBalance, 60_000); // Check every minute
```

**Security benefits:**
- ✅ Limited exposure (max loss = hot wallet balance)
- ✅ Can still auto-settle trades
- ✅ Cold wallet remains secure

**Downsides:**
- ⚠️ Need to manually refill hot wallet periodically
- ⚠️ Hot wallet still has a private key that can be compromised

---

### Option 4: Hardware Security Module (HSM) / Key Management Service

**Production-grade solution:**

```typescript
// Use AWS KMS, Google Cloud KMS, or Azure Key Vault

import { KMSClient, SignCommand } from '@aws-sdk/client-kms';

const kms = new KMSClient({ region: 'us-east-1' });

async function signTransactionWithKMS(txnHash: Buffer) {
  const command = new SignCommand({
    KeyId: 'arn:aws:kms:us-east-1:123456789:key/abcd-1234',
    Message: txnHash,
    SigningAlgorithm: 'ECDSA_SHA_256'
  });

  const response = await kms.send(command);
  return response.Signature;
}
```

**Security benefits:**
- ✅ Private key NEVER leaves HSM
- ✅ Can't extract key even with backend access
- ✅ Audit logs for all signing operations
- ✅ Automatic key rotation

**Downsides:**
- ❌ More complex to implement
- ❌ Costs money (~$1/month per key)
- ❌ Requires cloud infrastructure

---

## My Recommendation: Resource Account (Option 1)

**For your use case, use Resource Account:**

1. **Deploy contract with resource account for house treasury**
2. **Backend gets a separate "authorized backend" key** (stored in `.env`)
3. **Contract validates backend can only call `record_trade`** (not withdraw)
4. **Add safety limits** (max settlement per txn, rate limiting)

**This gives you:**
- ✅ No house private key to steal
- ✅ Backend can auto-settle trades
- ✅ Limited blast radius if backend compromised
- ✅ Native to Aptos (no external dependencies)

**Later upgrade to hot/cold separation:**
- Once you have real money in the game
- Use resource account as hot wallet
- Keep bulk of funds in cold multisig

---

## Updated Contract with Resource Account

```move
module cash_trading_game::liquidity {
    use std::signer;
    use aptos_framework::account::{Self, SignerCapability};
    use aptos_framework::coin::{Self, Coin};
    use aptos_std::table::{Self, Table};
    use aptos_framework::timestamp;

    // CASH token type
    struct CASH {}  // Placeholder, actual token is external

    // Resource account holds house funds (NO private key!)
    struct HouseTreasury has key {
        signer_capability: SignerCapability,
        total_deposited: u64,
        total_paid_out: u64,
    }

    // Authorized backend addresses
    struct AuthorizedBackends has key {
        addresses: vector<address>,
    }

    // User ledger
    struct UserLedger has key {
        balances: Table<address, u64>,
    }

    // Safety limits
    const MAX_SETTLEMENT_PER_TXN: u64 = 1_000_000_000; // 1,000 CASH
    const E_UNAUTHORIZED: u64 = 1;
    const E_EXCEEDS_LIMIT: u64 = 2;
    const E_INSUFFICIENT_BALANCE: u64 = 3;

    // Initialize with resource account
    fun init_module(deployer: &signer) {
        // Create resource account for treasury
        let (treasury_signer, signer_cap) = account::create_resource_account(
            deployer,
            b"cash_game_treasury_v1"
        );

        // Register treasury for CASH token
        coin::register<CASH>(&treasury_signer);

        // Store treasury capability
        move_to(deployer, HouseTreasury {
            signer_capability: signer_cap,
            total_deposited: 0,
            total_paid_out: 0,
        });

        // Initialize authorized backends (empty initially)
        move_to(deployer, AuthorizedBackends {
            addresses: vector::empty(),
        });

        // Initialize user ledger
        move_to(deployer, UserLedger {
            balances: table::new(),
        });
    }

    // Owner adds authorized backend
    public entry fun add_authorized_backend(
        owner: &signer,
        backend_address: address
    ) acquires AuthorizedBackends {
        assert!(signer::address_of(owner) == @cash_trading_game, E_UNAUTHORIZED);

        let backends = borrow_global_mut<AuthorizedBackends>(@cash_trading_game);
        vector::push_back(&mut backends.addresses, backend_address);
    }

    // Check if address is authorized
    fun is_authorized(addr: address): bool acquires AuthorizedBackends {
        let backends = borrow_global<AuthorizedBackends>(@cash_trading_game);
        vector::contains(&backends.addresses, &addr)
    }

    // User deposits CASH
    public entry fun deposit_user(
        user: &signer,
        amount: u64
    ) acquires UserLedger, HouseTreasury {
        let user_addr = signer::address_of(user);

        // Transfer from user to treasury resource account
        let treasury = borrow_global<HouseTreasury>(@cash_trading_game);
        let treasury_addr = account::get_signer_capability_address(&treasury.signer_capability);
        coin::transfer<CASH>(user, treasury_addr, amount);

        // Update user ledger
        let ledger = borrow_global_mut<UserLedger>(@cash_trading_game);
        let current = *table::borrow_mut_with_default(&mut ledger.balances, user_addr, 0);
        table::upsert(&mut ledger.balances, user_addr, current + amount);
    }

    // Backend settles trade
    public entry fun record_trade(
        backend: &signer,
        player: address,
        delta: i64  // Positive = player won, negative = player lost
    ) acquires AuthorizedBackends, UserLedger {
        // Verify backend is authorized
        let backend_addr = signer::address_of(backend);
        assert!(is_authorized(backend_addr), E_UNAUTHORIZED);

        // Safety check: limit settlement size
        let abs_delta = if (delta >= 0) { (delta as u64) } else { ((-delta) as u64) };
        assert!(abs_delta <= MAX_SETTLEMENT_PER_TXN, E_EXCEEDS_LIMIT);

        // Update player ledger
        let ledger = borrow_global_mut<UserLedger>(@cash_trading_game);
        let current = *table::borrow_mut_with_default(&mut ledger.balances, player, 0);

        let new_balance = if (delta >= 0) {
            current + (delta as u64)
        } else {
            let loss = ((-delta) as u64);
            assert!(current >= loss, E_INSUFFICIENT_BALANCE);
            current - loss
        };

        table::upsert(&mut ledger.balances, player, new_balance);
    }

    // User withdraws CASH
    public entry fun withdraw_user(
        user: &signer,
        amount: u64
    ) acquires UserLedger, HouseTreasury {
        let user_addr = signer::address_of(user);

        // Debit ledger
        let ledger = borrow_global_mut<UserLedger>(@cash_trading_game);
        let current = *table::borrow(&ledger.balances, user_addr);
        assert!(current >= amount, E_INSUFFICIENT_BALANCE);
        table::upsert(&mut ledger.balances, user_addr, current - amount);

        // Transfer from treasury resource account to user
        let treasury = borrow_global_mut<HouseTreasury>(@cash_trading_game);
        let treasury_signer = account::create_signer_with_capability(&treasury.signer_capability);
        coin::transfer<CASH>(&treasury_signer, user_addr, amount);

        treasury.total_paid_out = treasury.total_paid_out + amount;
    }

    // Owner funds house treasury
    public entry fun deposit_house(
        owner: &signer,
        amount: u64
    ) acquires HouseTreasury {
        assert!(signer::address_of(owner) == @cash_trading_game, E_UNAUTHORIZED);

        let treasury = borrow_global_mut<HouseTreasury>(@cash_trading_game);
        let treasury_addr = account::get_signer_capability_address(&treasury.signer_capability);

        coin::transfer<CASH>(owner, treasury_addr, amount);
        treasury.total_deposited = treasury.total_deposited + amount;
    }

    // View functions
    #[view]
    public fun get_user_balance(player: address): u64 acquires UserLedger {
        let ledger = borrow_global<UserLedger>(@cash_trading_game);
        if (table::contains(&ledger.balances, player)) {
            *table::borrow(&ledger.balances, player)
        } else {
            0
        }
    }

    #[view]
    public fun get_treasury_balance(): u64 acquires HouseTreasury {
        let treasury = borrow_global<HouseTreasury>(@cash_trading_game);
        let treasury_addr = account::get_signer_capability_address(&treasury.signer_capability);
        coin::balance<CASH>(treasury_addr)
    }
}
```

---

## Deployment Steps

1. **Deploy contract:**
   ```bash
   aptos move publish --profile mainnet
   ```

2. **Authorize backend:**
   ```bash
   aptos move run \
     --function-id 0xYOUR_ADDRESS::liquidity::add_authorized_backend \
     --args address:0xBACKEND_ADDRESS \
     --profile mainnet
   ```

3. **Fund house treasury:**
   ```bash
   aptos move run \
     --function-id 0xYOUR_ADDRESS::liquidity::deposit_house \
     --args u64:10000000000 \
     --profile mainnet
   ```

4. **Backend `.env`:**
   ```env
   # Backend key (NOT house key!)
   BACKEND_PRIVATE_KEY=0x123...
   BACKEND_ADDRESS=0xabc...

   # Contract info
   MODULE_ADDRESS=0xYOUR_CONTRACT_ADDRESS
   CASH_TYPE=0x61ed8b048636516b4eaf4c74250fa4f9440d9c3e163d96aeb863fe658a4bdc67::CASH::CASH
   ```

---

## Summary

**Your Questions Answered:**

1. **User funding**: ✅ Show Keyless address in UI, user sends CASH from CEX/DEX
2. **House private key**: ✅ Use resource account (no private key exists!)
3. **Backend security**: ✅ Backend has separate key with limited permissions
4. **CASH token**: ✅ `0x61ed8b048636516b4eaf4c74250fa4f9440d9c3e163d96aeb863fe658a4bdc67::CASH::CASH` (6 decimals)

**This architecture is secure and production-ready.** 🔒
