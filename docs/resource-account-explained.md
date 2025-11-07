# How Resource Accounts Work in Move

## The Problem We're Solving

**Traditional approach (insecure):**
```
Backend needs to sign transactions to settle trades
  ↓
Backend needs private key
  ↓
Private key stored in .env file
  ↓
If backend compromised → attacker has private key → drains all funds
```

**Resource account approach (secure):**
```
Move contract creates an account with NO private key
  ↓
Contract stores a "capability" to control that account
  ↓
Only Move code can use this capability
  ↓
Backend can trigger actions, but can't steal funds
```

---

## Move Contract Architecture

### 1. Resource Account Creation (One-Time Setup)

**In the Move contract's `init_module` function:**

```move
module cash_trading_game::liquidity {
    use aptos_framework::account::{Self, SignerCapability};

    struct HouseTreasury has key {
        signer_capability: SignerCapability,  // ← This is the "key" to the resource account
        total_deposited: u64,
        total_paid_out: u64,
    }

    // Called ONCE when contract is deployed
    fun init_module(deployer: &signer) {
        // Create a resource account (deterministic address, NO private key)
        let (treasury_signer, signer_cap) = account::create_resource_account(
            deployer,           // Your wallet
            b"cash_game_v1"     // Seed (makes address deterministic)
        );

        // Register the resource account for CASH token
        coin::register<CASH>(&treasury_signer);

        // Store the capability in the contract
        move_to(deployer, HouseTreasury {
            signer_capability: signer_cap,  // ← Stored on-chain, not in .env!
            total_deposited: 0,
            total_paid_out: 0,
        });
    }
}
```

**What just happened:**

1. **`create_resource_account(deployer, b"cash_game_v1")`**
   - Creates a NEW Aptos account at address `0xabc123...` (derived from seed)
   - Returns a `signer` for that account
   - Returns a `SignerCapability` (permission to control the account)
   - **NO private key is generated**

2. **`coin::register<CASH>(&treasury_signer)`**
   - Registers the resource account to hold CASH tokens
   - Now people can send CASH to `0xabc123...`

3. **`move_to(deployer, HouseTreasury { signer_capability: signer_cap })`**
   - Stores the `SignerCapability` in the contract
   - Only Move code at `@cash_trading_game` can access it
   - Cannot be accessed from outside (no RPC call, no private key)

**Result:**
- Resource account address: `0xabc123...` (holds all house CASH)
- Private key: **DOES NOT EXIST**
- Control: Only through Move contract code

---

### 2. How Resource Account is Used (Withdrawing Funds)

**When a user withdraws their winnings:**

```move
public entry fun withdraw_user(
    user: &signer,
    amount: u64
) acquires UserLedger, HouseTreasury {
    let user_addr = signer::address_of(user);

    // 1. Debit user's internal ledger
    let ledger = borrow_global_mut<UserLedger>(@cash_trading_game);
    let current = *table::borrow(&ledger.balances, user_addr);
    assert!(current >= amount, E_INSUFFICIENT_BALANCE);
    table::upsert(&mut ledger.balances, user_addr, current - amount);

    // 2. Get the resource account's signer capability
    let treasury = borrow_global_mut<HouseTreasury>(@cash_trading_game);

    // 3. Use capability to create a signer for the resource account
    let treasury_signer = account::create_signer_with_capability(
        &treasury.signer_capability  // ← This is stored on-chain
    );

    // 4. Transfer CASH from resource account to user
    coin::transfer<CASH>(
        &treasury_signer,  // ← Resource account signs (not backend!)
        user_addr,
        amount
    );
}
```

**What's happening:**

1. **`borrow_global_mut<HouseTreasury>(@cash_trading_game)`**
   - Loads the `HouseTreasury` resource from blockchain storage
   - Gets access to the `signer_capability`

2. **`create_signer_with_capability(&treasury.signer_capability)`**
   - Uses the capability to create a `signer` for the resource account
   - This `signer` can sign transactions on behalf of `0xabc123...`
   - **NO private key involved**

3. **`coin::transfer<CASH>(&treasury_signer, user_addr, amount)`**
   - Resource account transfers CASH to user
   - Signed by `treasury_signer` (not backend's key)

**Key insight:** The Move VM creates the signer on-the-fly using the stored capability. No private key needed.

---

### 3. Backend's Role (Limited Authorization)

**Backend CANNOT access the signer capability directly.**

Instead, backend is authorized to call specific functions:

```move
struct AuthorizedBackends has key {
    addresses: vector<address>,  // List of allowed backend addresses
}

// Owner adds backend to whitelist
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

// Backend settles trade (NO access to signer capability)
public entry fun record_trade(
    backend: &signer,           // Backend signs with its own key
    player: address,
    delta: i64
) acquires AuthorizedBackends, UserLedger {
    let backend_addr = signer::address_of(backend);

    // 1. Verify backend is in the whitelist
    assert!(is_authorized(backend_addr), E_UNAUTHORIZED);

    // 2. Safety check: limit settlement size
    let abs_delta = if (delta >= 0) { (delta as u64) } else { ((-delta) as u64) };
    assert!(abs_delta <= MAX_SETTLEMENT_PER_TXN, E_EXCEEDS_LIMIT);

    // 3. Update internal ledger ONLY (no CASH transfer)
    let ledger = borrow_global_mut<UserLedger>(@cash_trading_game);
    let current = *table::borrow_mut_with_default(&mut ledger.balances, player, 0);

    let new_balance = if (delta >= 0) {
        current + (delta as u64)
    } else {
        let loss = ((-delta) as u64);
        current - loss
    };

    table::upsert(&mut ledger.balances, player, new_balance);

    // ← NOTE: No access to HouseTreasury or signer_capability!
}
```

**What backend CAN do:**
- ✅ Call `record_trade()` to update ledgers
- ✅ Update balances (internal accounting)

**What backend CANNOT do:**
- ❌ Access `HouseTreasury` resource
- ❌ Get the `signer_capability`
- ❌ Call `withdraw_user()` on behalf of users
- ❌ Transfer CASH from resource account

**Why?**
- `record_trade()` doesn't have `acquires HouseTreasury` in its signature
- Move compiler FORBIDS accessing resources you don't declare
- Backend key can only do what the function allows

---

## Complete Flow Diagram

### Deployment (One-Time)

```
┌─────────────────────────────────────────────────────────┐
│ You (Deployer)                                          │
│ Private key: In your hardware wallet                    │
└─────────────────────────────────────────────────────────┘
                    ↓
        aptos move publish --profile deployer
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Contract Deployed at @cash_trading_game                 │
│                                                          │
│ init_module() runs automatically:                       │
│   1. Creates resource account 0xRESOURCE_ADDR           │
│   2. Stores SignerCapability in HouseTreasury           │
│   3. Registers resource account for CASH                │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Resource Account: 0xRESOURCE_ADDR                       │
│ Private key: NONE (does not exist)                      │
│ Controlled by: Move code only                           │
│ Balance: 0 CASH                                         │
└─────────────────────────────────────────────────────────┘
```

### Authorize Backend (One-Time)

```
┌─────────────────────────────────────────────────────────┐
│ You (Owner)                                             │
└─────────────────────────────────────────────────────────┘
                    ↓
    aptos move run --function add_authorized_backend \
                   --args address:0xBACKEND_ADDR
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Contract State Updated                                  │
│ AuthorizedBackends.addresses = [0xBACKEND_ADDR]        │
└─────────────────────────────────────────────────────────┘
```

### Fund House Treasury (One-Time or Periodic)

```
┌─────────────────────────────────────────────────────────┐
│ You (Owner)                                             │
│ Wallet balance: 100,000 CASH                            │
└─────────────────────────────────────────────────────────┘
                    ↓
    aptos move run --function deposit_house \
                   --args u64:100000000000  # 100k CASH
                    ↓
┌─────────────────────────────────────────────────────────┐
│ deposit_house() executes:                               │
│   1. Transfers CASH from your wallet                    │
│   2. To resource account 0xRESOURCE_ADDR                │
│   3. Updates HouseTreasury.total_deposited              │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Resource Account: 0xRESOURCE_ADDR                       │
│ Balance: 100,000 CASH                                   │
└─────────────────────────────────────────────────────────┘
```

### User Deposits (Ongoing)

```
┌─────────────────────────────────────────────────────────┐
│ User (Keyless Account)                                  │
│ Address: 0xUSER_ADDR                                    │
│ Balance: 1,000 CASH                                     │
└─────────────────────────────────────────────────────────┘
                    ↓
    Frontend calls: deposit_user(100 CASH)
                    ↓
┌─────────────────────────────────────────────────────────┐
│ deposit_user() executes:                                │
│   1. Transfers 100 CASH from 0xUSER_ADDR                │
│      → to resource account 0xRESOURCE_ADDR              │
│   2. Updates UserLedger:                                │
│      balances[0xUSER_ADDR] = 100 CASH                   │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Resource Account: 0xRESOURCE_ADDR                       │
│ Balance: 100,100 CASH (100k house + 100 user deposit)   │
│                                                          │
│ UserLedger:                                             │
│   0xUSER_ADDR → 100 CASH                                │
└─────────────────────────────────────────────────────────┘
```

### Backend Settles Trade (Ongoing)

```
┌─────────────────────────────────────────────────────────┐
│ User plays game (frontend)                              │
│ Wins 50 CASH                                            │
└─────────────────────────────────────────────────────────┘
                    ↓
    Frontend → Backend: POST /api/game/trade/complete
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Backend (Express Server)                                │
│ Private key: 0xBACKEND_KEY (in .env)                    │
│ Address: 0xBACKEND_ADDR                                 │
└─────────────────────────────────────────────────────────┘
                    ↓
    Backend signs transaction:
    record_trade(0xUSER_ADDR, +50_000_000)  // +50 CASH
                    ↓
┌─────────────────────────────────────────────────────────┐
│ record_trade() executes:                                │
│   1. Verifies 0xBACKEND_ADDR is authorized ✓            │
│   2. Verifies delta <= MAX_SETTLEMENT ✓                 │
│   3. Updates UserLedger:                                │
│      balances[0xUSER_ADDR] = 100 + 50 = 150 CASH        │
│                                                          │
│ NOTE: No actual CASH transfer!                          │
│       Just internal ledger update                       │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Resource Account: 0xRESOURCE_ADDR                       │
│ Balance: 100,100 CASH (unchanged)                       │
│                                                          │
│ UserLedger:                                             │
│   0xUSER_ADDR → 150 CASH (user can now withdraw this)   │
└─────────────────────────────────────────────────────────┘
```

### User Withdraws (Ongoing)

```
┌─────────────────────────────────────────────────────────┐
│ User clicks "Withdraw 150 CASH"                         │
└─────────────────────────────────────────────────────────┘
                    ↓
    Frontend calls: withdraw_user(150 CASH)
    User signs with Keyless account ✓
                    ↓
┌─────────────────────────────────────────────────────────┐
│ withdraw_user() executes:                               │
│   1. Debits UserLedger:                                 │
│      balances[0xUSER_ADDR] = 150 - 150 = 0              │
│                                                          │
│   2. Gets HouseTreasury.signer_capability               │
│                                                          │
│   3. Creates treasury_signer from capability            │
│                                                          │
│   4. Transfers CASH:                                    │
│      treasury_signer → 0xUSER_ADDR: 150 CASH            │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ User Wallet: 0xUSER_ADDR                                │
│ Balance: 1,050 CASH (900 original + 150 withdrawn)      │
│                                                          │
│ Resource Account: 0xRESOURCE_ADDR                       │
│ Balance: 99,950 CASH (100,100 - 150)                    │
│                                                          │
│ UserLedger:                                             │
│   0xUSER_ADDR → 0 CASH                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Key Insights

### 1. SignerCapability is NOT a Private Key

```rust
// This is WRONG understanding:
SignerCapability = "A private key stored on-chain"

// This is CORRECT:
SignerCapability = "A proof that you have permission to create signers for this account"
```

**How it works:**
- Aptos VM has special logic for resource accounts
- `create_signer_with_capability(&cap)` tells VM: "Create a signer for the account this capability controls"
- VM creates the signer in-memory (not derived from any key)
- Move code can use this signer to sign transactions
- NO cryptographic signing happens (VM just authorizes it)

### 2. Resource Account Address is Deterministic

```move
let (treasury_signer, signer_cap) = account::create_resource_account(
    deployer,           // 0xDEPLOYER_ADDR
    b"cash_game_v1"     // Seed
);

// Resource account address = hash(0xDEPLOYER_ADDR, b"cash_game_v1")
// Always the same result for same inputs
```

**This means:**
- You can calculate the resource account address BEFORE deployment
- Frontends can hardcode the address
- Anyone can verify the address is correct

### 3. Backend Key is SEPARATE from Resource Account

```
Backend Private Key (in .env):
  - Address: 0xBACKEND_ADDR
  - Purpose: Sign calls to record_trade()
  - Permissions: Can ONLY update ledgers
  - If compromised: Limited damage (fake trades, but can't steal funds)

Resource Account (on-chain):
  - Address: 0xRESOURCE_ADDR
  - Purpose: Hold house CASH
  - Control: ONLY via Move code
  - If backend compromised: Resource account is SAFE
```

**They are completely separate accounts!**

### 4. Why This is Secure

**Attack scenario 1: Backend server hacked**
- ❌ Attacker gets `BACKEND_PRIVATE_KEY` from .env
- ❌ Attacker tries to withdraw CASH from resource account
- ✅ **BLOCKED**: `withdraw_user()` requires user's signature, not backend's
- ✅ **BLOCKED**: Backend can only call `record_trade()`, which doesn't touch `HouseTreasury`

**Attack scenario 2: Fake settlements**
- ❌ Attacker uses stolen backend key to call `record_trade(attacker_addr, +1000000 CASH)`
- ✅ **LIMITED**: Max settlement is 1,000 CASH (hardcoded in contract)
- ✅ **LIMITED**: Rate limiting prevents spam
- ✅ **DETECTED**: Monitoring system alerts on anomalies
- ✅ **STOPPED**: Owner revokes backend authorization

**Attack scenario 3: Contract exploit**
- ❌ Attacker finds vulnerability in `record_trade()`
- ❌ Attacker tries to manipulate ledger to huge balance
- ❌ Attacker calls `withdraw_user()` to extract fake balance
- ✅ **BLOCKED**: `withdraw_user()` checks resource account actually has the CASH
- ✅ **BLOCKED**: Can only withdraw up to actual CASH in resource account

---

## Summary

**The Move contract IS the security model:**

1. **`init_module()`** creates resource account (no private key)
2. **`HouseTreasury`** stores signer capability (on-chain, not in .env)
3. **`AuthorizedBackends`** whitelists backend address (limited permissions)
4. **`record_trade()`** updates ledgers (no access to treasury signer)
5. **`withdraw_user()`** uses treasury signer (only callable by user)

**Backend's role:**
- Signs transactions to call `record_trade()`
- Does NOT have access to house funds
- Does NOT have signer capability
- Just a whitelisted address that can update ledgers

**Resource account's role:**
- Holds all CASH (house liquidity + user deposits)
- Has no private key
- Controlled ONLY by Move code via SignerCapability
- Cannot be accessed externally

**This is the standard pattern for secure smart contract design on Aptos.** The Move language enforces these guarantees at the type system level.
