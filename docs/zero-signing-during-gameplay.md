# Zero User Signing During Gameplay

## The Real Problem

**What you want:**
```
User plays game → Draws line → Releases screen
  ↓
Trade settles on-chain automatically
  ↓
NO user interaction, NO signing, NO popups
  ↓
Balance updates in real-time
```

**What I was proposing (WRONG):**
- Passkey with cached auth still requires user presence for each transaction
- "No Face ID popup" ≠ "No user signing"
- User is still involved in the signing process

**The real question:** How do transactions get signed WITHOUT the user?

---

## The 3 Real Solutions

### Option 1: Fully Off-Chain (Simplest, Best UX)

Games happen entirely off-chain. Blockchain is only touched for deposit/withdraw.

**Architecture:**
```
┌─────────────────────────────────────────┐
│ User deposits 10 APT (ONE signature)   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ ALL GAMES HAPPEN OFF-CHAIN              │
│                                         │
│ • Games stored in browser localStorage │
│ • Balance updates instantly in UI      │
│ • Zero blockchain transactions         │
│ • Play 1000 games with zero cost       │
│                                         │
│ Periodic sync (optional):              │
│ • Every 10 games, submit merkle root   │
│ • Or batch settle on page close        │
│ • Or never settle (just for fun)       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ User withdraws final balance            │
│ (ONE signature)                         │
└─────────────────────────────────────────┘
```

**Contract:**
```move
// User's session balance
struct UserSession {
    balance: u64,  // Can play with this off-chain
}

// User can withdraw their balance anytime
public entry fun withdraw(user: &signer, amount: u64) {
    // ... transfer from session to wallet
}

// Optional: Submit proof of games for verification
public entry fun submit_game_proof(
    user: &signer,
    game_results: vector<GameResult>,
    merkle_proof: vector<u8>
) {
    // Verify games were valid
    // Update balance accordingly
}
```

**Pros:**
- ✅ ZERO transactions during gameplay
- ✅ Instant gameplay (no blockchain latency)
- ✅ Free to play (no gas costs per game)
- ✅ Works offline
- ✅ Best possible UX

**Cons:**
- ⚠️ Balance isn't "real-time on-chain" (only synced periodically)
- ⚠️ Need to handle "user closes browser before syncing"
- ⚠️ Requires trust or cryptographic proofs

**When to use:** When UX > strict on-chain verification

---

### Option 2: Backend Service Signs for User

Backend server holds keys and signs transactions on user's behalf.

**Architecture:**
```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────>│   Backend    │────────>│  Blockchain  │
│              │  POST   │              │  Sign   │              │
│  User plays  │  trade  │ Backend signs│  & Send │  Settlement  │
│              │  result │  with its key│   Txn   │   happens    │
└──────────────┘         └──────────────┘         └──────────────┘
```

**Contract (with authorization):**
```move
// Backend is authorized to settle for users
struct GameBackend has key {
    backend_address: address,
}

public entry fun authorize_backend(user: &signer) {
    // User signs ONCE to authorize backend
    let backend_addr = @game_backend;
    // Store authorization...
}

public entry fun settle_game_for_user(
    backend: &signer,  // Backend signs
    player: address,   // Settlement is for this player
    bet_amount: u64,
    pnl: i64,
    seed: vector<u8>
) {
    // Verify caller is authorized backend
    assert!(signer::address_of(backend) == @game_backend, E_UNAUTHORIZED);

    // Update player's balance
    let session = borrow_mut_session(player);
    session.balance = calculate_new_balance(session.balance, pnl);
}
```

**Frontend:**
```typescript
async function onTradeComplete(trade) {
  // Send to backend (no signing by user)
  const response = await fetch('/api/settle-trade', {
    method: 'POST',
    body: JSON.stringify({
      userAddress,
      betAmount: trade.betAmount,
      pnl: trade.pnl,
      seed: trade.seed,
      signature: await signProof(trade) // Prove it's really the user
    })
  });

  // Backend handles blockchain interaction
  const { txHash } = await response.json();

  // Update UI
  updateBalance(trade.pnl);
}
```

**Backend:**
```typescript
// Backend server
const backendAccount = Account.fromPrivateKey({
  privateKey: new Ed25519PrivateKey(BACKEND_PRIVATE_KEY)
});

app.post('/api/settle-trade', async (req, res) => {
  const { userAddress, betAmount, pnl, seed } = req.body;

  // Backend signs and submits transaction
  const txn = await backendAccount.signAndSubmitTransaction({
    function: `${MODULE}::settle_game_for_user`,
    arguments: [userAddress, betAmount, pnl, seed]
  });

  res.json({ txHash: txn.hash });
});
```

**Pros:**
- ✅ User never signs during gameplay
- ✅ Real-time on-chain settlement
- ✅ Simple frontend (no key management)
- ✅ Backend can validate game logic

**Cons:**
- ❌ Requires running a backend server
- ❌ Backend holds keys (security concern)
- ❌ Backend could cheat/steal (needs safeguards)
- ❌ Centralization

**When to use:** When you want real-time on-chain + willing to run infrastructure

---

### Option 3: Account Abstraction with Session Keys

User authorizes a temporary key that frontend can use to sign WITHOUT user interaction.

**How it works:**
```
1. User creates account → Gets address 0xABC...

2. User authorizes session key (ONE signature):
   "I authorize key 0xDEF... to call settle_game() for 30 minutes"

3. Frontend generates keypair and stores in localStorage:
   sessionKey = {
     privateKey: "0x123...",  // ← Frontend can sign with this
     publicKey: "0xDEF...",
     permissions: ["settle_game"],  // Can ONLY call this function
     expiry: Date.now() + 30*60*1000
   }

4. User plays games:
   - Frontend signs transactions with sessionKey.privateKey
   - NO user interaction needed
   - Contract validates: "Is this sessionKey authorized?"
   - Transaction executes

5. Session expires → User re-authorizes (ONE signature)
```

**Contract:**
```move
module game::session_auth {
    struct SessionKey has store {
        public_key: vector<u8>,
        expiry_timestamp: u64,
        allowed_functions: vector<String>,  // ["settle_game"]
    }

    struct SessionStore has key {
        sessions: Table<address, SessionKey>,
    }

    // User calls this ONCE to create session
    public entry fun create_session(
        user: &signer,
        session_public_key: vector<u8>,
        duration_seconds: u64
    ) {
        let player = signer::address_of(user);
        let store = borrow_global_mut<SessionStore>(@game);

        table::upsert(&mut store.sessions, player, SessionKey {
            public_key: session_public_key,
            expiry_timestamp: timestamp::now() + duration_seconds,
            allowed_functions: vector[string::utf8(b"settle_game")],
        });
    }

    // Custom authenticator (registered via account_abstraction)
    public fun authenticate(
        account: signer,
        auth_data: AbstractionAuthData
    ): signer {
        let player = signer::address_of(&account);

        // Get session key
        let session = get_session(player);

        // Verify session is valid
        assert!(timestamp::now() < session.expiry_timestamp, E_SESSION_EXPIRED);

        // Verify signature matches session key
        let sig_valid = ed25519::verify_signature(
            auth_data.signature,
            session.public_key,
            auth_data.message
        );
        assert!(sig_valid, E_INVALID_SIGNATURE);

        // Verify function is allowed
        let function_name = get_function_name(auth_data);
        assert!(vector::contains(&session.allowed_functions, &function_name), E_UNAUTHORIZED);

        // Return authenticated signer
        account
    }
}
```

**Frontend:**
```typescript
// ONE-TIME setup when user first plays
async function initializeSession() {
  // Generate session keypair
  const sessionKey = new Ed25519PrivateKey(randomBytes(32));
  const sessionPubKey = sessionKey.publicKey();

  // User signs ONCE to authorize this session key
  await userWallet.signAndSubmitTransaction({
    function: `${MODULE}::create_session`,
    arguments: [
      sessionPubKey.toUint8Array(),
      1800  // 30 minutes
    ]
  });

  // Store session key in localStorage
  localStorage.setItem('sessionKey', sessionKey.toString());
}

// During gameplay - NO USER INTERACTION
async function settleTradeAutomatically(trade) {
  // Load session key from localStorage
  const sessionKeyHex = localStorage.getItem('sessionKey');
  const sessionKey = new Ed25519PrivateKey(sessionKeyHex);

  // Create session account
  const sessionAccount = Account.fromPrivateKey({ privateKey: sessionKey });

  // Sign and submit transaction (NO USER PROMPT)
  const txn = await sessionAccount.signAndSubmitTransaction({
    function: `${MODULE}::settle_game`,
    arguments: [userAddress, trade.betAmount, trade.pnl, trade.seed]
  });

  // Done! User never knew a transaction happened
  console.log("✅ Trade settled:", txn.hash);
}
```

**Pros:**
- ✅ User never signs during gameplay
- ✅ Real-time on-chain settlement
- ✅ Fully decentralized (no backend)
- ✅ Secure (session key has limited permissions)
- ✅ Session key can't steal funds (only settle games)

**Cons:**
- ⚠️ Complex to implement (custom Move module + account abstraction)
- ⚠️ Session key stored in browser (cleared if cookies cleared)
- ⚠️ Need to re-authorize every 30 min

**When to use:** When you want decentralized + real-time on-chain + zero user signing

---

## Comparison Table

| Approach | User Signs During Gameplay? | Real-Time On-Chain? | Complexity | Decentralized? |
|----------|---------------------------|-------------------|-----------|---------------|
| **Off-Chain Games** | ❌ No | ⚠️ Only on sync | ✅ Low | ✅ Yes |
| **Backend Service** | ❌ No | ✅ Yes | ⚠️ Medium | ❌ No |
| **Account Abstraction** | ❌ No | ✅ Yes | ❌ High | ✅ Yes |

---

## My Recommendation for Your Game

**Start with Option 1 (Off-Chain), optionally add Option 2 (Backend) later**

**Why Off-Chain First:**
1. ✅ Simplest to implement (works with game_v3_session.move)
2. ✅ Best UX (instant, free gameplay)
3. ✅ No infrastructure needed
4. ✅ Can add real-time settlement later if needed

**Implementation:**
```typescript
// Games happen entirely in browser
const games = JSON.parse(localStorage.getItem('games') || '[]');

function onTradeComplete(trade) {
  // Store locally
  games.push(trade);
  localStorage.setItem('games', JSON.stringify(games));

  // Update UI instantly
  updateBalance(trade.pnl);

  // Optional: Batch settle every 10 games
  if (games.length % 10 === 0) {
    batchSettleInBackground(games);
  }
}
```

Then if you want real-time on-chain, add Option 2 (Backend) without rewriting frontend.

**If you want fully decentralized + real-time:** Use Option 3 (Account Abstraction), but it's 10x more work.

---

## Which do you prefer?

1. **Off-chain games** (instant, free, best UX)
2. **Backend service** (real-time on-chain, simple, centralized)
3. **Account abstraction** (real-time on-chain, complex, decentralized)
