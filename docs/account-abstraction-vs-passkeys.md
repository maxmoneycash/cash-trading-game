# Account Abstraction vs Passkeys for Real-Time Settlement

## Your Goal
> "I want each line segment or trade to have a real-time transaction right after the user finishes their trade. When they let go of the screen, settle that trade immediately. No popups."

**Perfect UX Flow:**
```
User draws line on chart
  ↓
User releases screen → Trade completes
  ↓
Transaction auto-signs (NO POPUP) ✅
  ↓
Balance updates on-chain in ~1 second ✅
  ↓
User continues playing seamlessly ✅
```

You can achieve this with **either** approach below.

---

## Option A: Account Abstraction with Session Keys

### What Aptos Account Abstraction Actually Does

Account abstraction lets you replace Aptos's default signature verification with **custom authentication logic**.

Instead of:
```
Transaction → Check signature against account's public key → Execute
```

You can do:
```
Transaction → Call YOUR custom Move function → Your logic decides if valid → Execute
```

### How It Enables Session-Based Signing

You can write a custom authenticator that:

```move
// Your custom authentication module
module my_game::session_auth {
    struct SessionKey has store {
        public_key: vector<u8>,
        expiry: u64,
        permissions: vector<FunctionInfo>, // Only allow certain functions
    }

    struct SessionStore has key {
        sessions: Table<address, SessionKey>,
    }

    /// Custom authenticator function
    public fun authenticate(
        account: signer,
        auth_data: AbstractionAuthData
    ): signer {
        let player = signer::address_of(&account);

        // Check if this is a session key signature
        let session = borrow_session(player);

        // Verify:
        // 1. Session hasn't expired
        assert!(timestamp::now() < session.expiry, E_SESSION_EXPIRED);

        // 2. Transaction function is in allowed list
        assert!(is_function_allowed(auth_data, &session.permissions), E_UNAUTHORIZED);

        // 3. Signature is valid for this session key
        assert!(verify_session_signature(auth_data, session), E_INVALID_SIG);

        // Return the signer (authentication succeeded)
        account
    }
}
```

Then register it:
```move
account_abstraction::add_authentication_function(
    &user_signer,
    // Use session_auth::authenticate instead of default verification
    function_info<my_game::session_auth::authenticate>()
);
```

### Flow with Account Abstraction

```
1. User visits game → Face ID prompt (ONCE)
   ↓
2. Frontend generates temporary keypair (session key)
   ↓
3. User signs with master key: "Authorize this session key for 30 min"
   ↓
4. Contract stores: SessionKey { pubkey, expiry, permissions }
   ↓
5. User plays game:
   - Draw line → Release screen
   - Frontend signs transaction with SESSION KEY (not master key)
   - Contract's authenticate() function validates session key
   - NO Face ID prompt needed ✅
   ↓
6. Session expires → Repeat step 1
```

**Pros:**
- ✅ Very secure (on-chain session management)
- ✅ Fine-grained permissions (only allow game functions)
- ✅ Can revoke sessions on-chain
- ✅ True account-level authorization

**Cons:**
- ❌ Complex to implement (need custom Move module)
- ❌ More transactions (create session, use session, revoke session)
- ❌ Session key management (generate, store, rotate)
- ❌ Overkill for a simple game

---

## Option B: Passkeys with Session-Based Auth (SIMPLER)

### How Passkeys Enable Session Signing

WebAuthn (passkeys) already has built-in session authentication:

```typescript
// First authentication of session (Face ID prompt)
const credential = await navigator.credentials.get({
  publicKey: {
    challenge: new Uint8Array([...]),
    rpId: "yourgame.com",
    userVerification: "required", // ← Face ID PROMPT
    timeout: 60000,
  }
});

// Subsequent authentications in same session (NO prompt)
const credential2 = await navigator.credentials.get({
  publicKey: {
    challenge: new Uint8Array([...]),
    rpId: "yourgame.com",
    userVerification: "discouraged", // ← NO PROMPT (browser caches auth)
    timeout: 60000,
  }
});
```

The browser automatically handles:
- ✅ Session caching (no Face ID after first)
- ✅ Secure key storage (hardware-backed)
- ✅ Timeout management (sessions expire)

### Flow with Passkeys

```
1. User visits game → Face ID prompt (ONCE)
   ↓
2. Passkey authentication succeeds
   ↓
3. Browser caches authentication state
   ↓
4. User plays game:
   - Draw line → Release screen
   - Frontend signs transaction with passkey
   - userVerification: "discouraged" (use cached auth)
   - NO Face ID prompt ✅
   ↓
5. Session expires (browser decides, usually 5-30 min) → Repeat step 1
```

**Pros:**
- ✅ Simple to implement (already built into browsers)
- ✅ Zero custom contract code needed
- ✅ Works with existing game_v3_session.move contract
- ✅ Hardware-backed security (Secure Enclave)
- ✅ Cross-device sync (iCloud Keychain, etc)

**Cons:**
- ⚠️ Less control over session duration (browser decides)
- ⚠️ Can't enforce per-function permissions on-chain
- ⚠️ Session state is client-side (not on-chain)

---

## Comparison for Your Use Case

| Feature | Account Abstraction | Passkeys + Session Auth |
|---------|---------------------|------------------------|
| **No popups after first auth** | ✅ Yes | ✅ Yes |
| **Real-time per-trade settlement** | ✅ Yes | ✅ Yes |
| **Implementation complexity** | ❌ High (custom Move module) | ✅ Low (use existing code) |
| **Session control** | ✅ On-chain, fine-grained | ⚠️ Browser-controlled |
| **Works with existing contract** | ⚠️ Need new contract | ✅ Yes (game_v3_session.move) |
| **Cost** | ❌ Extra transactions for sessions | ✅ No extra transactions |
| **Mobile UX** | ✅ Excellent | ✅ Excellent |
| **Time to implement** | ~1-2 weeks | ~1-2 days |

---

## Recommendation: Start with Passkeys, Upgrade Later if Needed

**For your game, I strongly recommend: Passkeys + Session Auth**

Why?
1. **You already have the infrastructure** (passkey code we built)
2. **Achieves the same UX** (no popups during gameplay)
3. **10x simpler** than building account abstraction
4. **Works with game_v3_session.move** (no contract rewrite needed)
5. **You can always upgrade to account abstraction later** if you need fine-grained permissions

---

## Implementation: Real-Time Per-Trade Settlement with Passkeys

Here's exactly how to implement your desired flow:

### 1. Update passkey-webauthn.ts for Session Mode

```typescript
// src/utils/passkey-webauthn.ts

let isSessionActive = false;
let sessionStartTime = 0;
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function signTransactionWithPasskey(
  transaction: any,
  passkeyCredential: any
): Promise<AccountAuthenticator> {

  // Determine if we need user verification
  const needsVerification = !isSessionActive ||
    (Date.now() - sessionStartTime > SESSION_DURATION_MS);

  const userVerification = needsVerification ? "required" : "discouraged";

  // If this is the first transaction, mark session as active
  if (needsVerification && !isSessionActive) {
    console.log("🔐 Starting new passkey session (Face ID required)");
  }

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: rawTxnBytes,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: passkeyCredential.rawId,
          type: "public-key",
        }],
        userVerification, // ← KEY SETTING
        timeout: 60000,
      },
    });

    // Session is now active
    if (needsVerification) {
      isSessionActive = true;
      sessionStartTime = Date.now();
      console.log("✅ Passkey session active (no more Face ID for 30 min)");
    }

    // ... rest of signing logic
  } catch (error) {
    // Session might have expired, reset
    isSessionActive = false;
    throw error;
  }
}
```

### 2. Update Chart Component for Per-Trade Settlement

```typescript
// src/components/AptosCandlestickChart.tsx

async function onTradeComplete(trade: Trade) {
  const { entryPrice, exitPrice, betAmount } = trade;

  // Calculate P&L
  const pnl = (exitPrice - entryPrice) * (betAmount / entryPrice);
  const pnlOctas = Math.floor(pnl * 100_000_000);

  // Show optimistic UI update
  setBalance(prev => prev + pnlOctas);
  showTradeResult(pnl); // Confetti, etc.

  try {
    // Settle on-chain IMMEDIATELY (no popup after first time)
    await settleTradeOnChain(betAmount, pnlOctas, trade.seed);

    console.log("✅ Trade settled on-chain");
  } catch (error) {
    console.error("❌ Settlement failed:", error);
    // Revert optimistic update
    setBalance(prev => prev - pnlOctas);
    showError("Settlement failed. Please try again.");
  }
}

async function settleTradeOnChain(
  betAmount: number,
  pnl: number,
  seed: string
) {
  if (!passkeyAccount) {
    throw new Error("Not authenticated");
  }

  // This will use session auth (no Face ID after first)
  const txn = await passkeyAccount.signAndSubmitTransaction({
    function: `${MODULE_ADDRESS}::game_v3_session::settle_game`,
    arguments: [
      userAddress,
      betAmount,
      pnl,
      Array.from(new TextEncoder().encode(seed))
    ],
  });

  await aptosClient.waitForTransaction({ transactionHash: txn.hash });
}
```

### 3. Add Session Status Indicator

```typescript
// Show user when session is active
function SessionIndicator() {
  const [sessionActive, setSessionActive] = useState(false);

  return sessionActive ? (
    <div className="session-active">
      🟢 Trading Session Active (no prompts)
    </div>
  ) : (
    <div className="session-inactive">
      ⚪ First trade will require Face ID
    </div>
  );
}
```

---

## Your New Flow (With This Implementation)

```
User visits game
  ↓
User draws first line → releases screen
  ↓
Face ID prompt (ONLY ONCE) ✅
  ↓
Trade settles on-chain (~1 sec)
  ↓
Balance updates: 10 APT → 10.5 APT ✅
  ↓
User draws second line → releases screen
  ↓
NO Face ID prompt ✅ (session active)
  ↓
Trade settles on-chain (~1 sec)
  ↓
Balance updates: 10.5 APT → 11.2 APT ✅
  ↓
[Play 100 more trades with ZERO prompts]
  ↓
Session expires after 30 min → Next trade requires Face ID
```

---

## When to Consider Account Abstraction

Upgrade to account abstraction if you need:
1. **Fine-grained permissions**: "Session key can only call settle_game(), not withdraw()"
2. **On-chain session revocation**: "Invalidate all sessions from contract"
3. **Programmable restrictions**: "Max 1 APT per trade during session"
4. **Multi-device sessions**: "Authorize my phone and tablet separately"

For a fast-paced trading game, passkeys are perfect. Save account abstraction for when you need enterprise-grade authorization.

---

## Next Steps

Want me to implement the passkey session approach? It's:
1. ✅ Simpler than account abstraction
2. ✅ Achieves your exact UX goal
3. ✅ Works with existing contract
4. ✅ Can be done in a few hours

Or do you want to explore account abstraction further?
