# Backend-Signed Trading Flow

This document captures the technical flow for running the trading game with the backend service signing \(and submitting\) on-chain transactions on behalf of the house while players interact through the web client.

## Actors & Components

- **Player keyless account**: provisioned during Gmail-based login (Keyless/Passkey flow). Frontend generates or recovers the user's Aptos address and stores the session credential; this address holds the player's personal `CASH` balance and signs only deposit/withdraw transactions.
- **Keyless provisioning service**: existing frontend + wallet adapter logic that wraps Google auth, derives the Aptos keypair, and exposes signing for deposit/withdraw requests.
- **House anchor wallet**: a hot wallet controlled by the backend; pre-funded with `CASH` and registered with the Move module as the only account allowed to settle trades.
- **Trading contract** `cash_trading_game::liquidity`: stores per-player ledgers and the house pool. Key entry functions:
  - `deposit_user(signer, amount)`: moves `Coin<CASH>` from player into an internal ledger.
  - `withdraw_user(signer, amount)`: releases funds back to the player.
  - `record_trade(house_signer, player, delta)`: adjusts the user ledger and house pool; callable only by the house wallet.
  - `deposit_house(signer, amount)`: adds liquidity to the house pool.
- **Express backend** (`server/src`): owns the house private key. Handles round creation and trade settlement. Uses the Aptos SDK to submit transactions.
- **React client** (`src/`): drives gameplay, talks to backend routes, and only requests user signatures for deposit/withdraw.

## Flow Overview

```text
Player UI  ⇄  Express Backend  ⇄  Aptos RPC  ⇄  Move Contract
   ↑                ↑                 ↑
   │                │                 │
   └── (deposit/withdraw txns) ───────┘
```

## Keyless Account Implementation in Repo

- `src/hooks/usePasskey.ts:1-208` drives the Gmail/Keyless lifecycle. It checks WebAuthn support, recreates the credential from `localStorage`, and instantly fetches the derived Aptos address (`credential.publicKey.aptosAddress`) for display.
- Credential provisioning happens inside `createNewPasskey()`, which calls `createPasskey()` and `getCredentialInfo()` from `src/utils/passkey-webauthn.ts:116-176`. The helper parses the WebAuthn attestation, converts the COSE public key, and derives the Aptos address via `Secp256r1PublicKey.authKey()` \(see `calculateAptosAddress()` in `src/utils/passkey-webauthn.ts:104-124`\).
- The session credential is stored in `PasskeyProvider` (`src/hooks/PasskeyProvider.tsx:1-14`), giving any React subtree access to signer state through `usePasskeyContext()`.
- `WalletManager` (`src/components/wallet/WalletManager.tsx:1-96`) auto-prompts the wallet/passkey picker on first load, especially on mobile, and gates modal state.
- `WalletPicker` (`src/components/wallet/WalletPicker.tsx:431-618`) renders the passkey CTA, displays the truncated Aptos address once connected, and exposes actions like `createNewPasskey()`, `disconnect()`, `requestTestTokens()`.
- Signing and submission currently target the old `game::start_game` / `complete_game` functions (`usePasskey.ts:211-317`). When we switch to the liquidity module, these calls will be replaced with `deposit_user` / `withdraw_user`, and the optimistic balance handling can be reused for `CASH` ledgers.

### 1. Account Creation, Recovery & Deposit

1. Player launches the app and signs in with Gmail via the Keyless flow.  
   - Frontend exchanges the Google token, derives the Aptos private key, and persists an authenticated session in `PasskeyProvider`.  
   - `WalletPicker` echoes the truncated address (`src/components/wallet/WalletPicker.tsx:524-533`), giving the user a copyable identifier for funding.
2. Frontend fetches any existing balance through a view call proxied by the backend (`GET /api/game/balance?address=`). The current balance helper hits `getAptBalance()` (`src/utils/passkey-webauthn.ts:235-258`); swap this to a `getCashBalance()` view that targets `Coin<cash::CASH>` once the contract is deployed.
3. When the player deposits:
   - `usePasskey` exposes the keyless signer via `signAndSubmitTransaction` (`src/hooks/usePasskey.ts:207-210`); call `deposit_user` with `type_arguments: [CASH_TYPE]`.  
   - Transaction moves `Coin<CASH>` from the user-owned address into the contract ledger.  
   - After confirmation, frontend notifies backend (`POST /api/game/ledger-sync`) so local analytics reflect the on-chain balance and round history, similar to how rounds are persisted in `server/routes/game.ts:19-188`.

### 2. Gameplay Loop (Off-chain)

1. Frontend runs the seeded candle loop (existing `AptosCandlestickChart`), recording trades locally.
2. Trade events are posted to backend (`POST /api/game/trade/open` / `/trade/complete`) for persistence and fairness checks.
3. No on-chain interactions happen during this step; gameplay stays lag-free and free of prompts.

### 3. Backend Settlement (On-chain, house-signed)

1. When a trade closes, backend computes the PnL delta in micro-CASH.
   - Today this is derived in the `/trade/complete` handler (`server/routes/game.ts:227-284`); reuse that logic but store `settlement_delta` instead of just final price.
2. Backend looks up the player's Aptos address tied to the round (currently persisted via `db.ensureUser()` in `server/routes/game.ts:25-27`; swap the hardcoded address for the keyless one coming from the client session).
3. Backend calls the Aptos SDK with the house private key:
   ```ts
   await aptosClient.signAndSubmitTransaction({
     sender: HOUSE_ADDRESS,
     function: `${MODULE}::record_trade`,
     type_arguments: [`${CASH_TYPE}`],
     arguments: [playerAddress, delta], // delta >0 => pay player, <0 => take from player
   });
   ```
4. On-chain contract adjusts the player ledger and house pool. No player signature is required; the house authority signs once per settlement.
5. Backend updates local DB with the transaction hash and new balances for auditing.
6. Frontend polls `/api/game/balance` or receives a socket event with the updated ledger balance for real-time UI updates.

### 4. Withdrawal

1. Player requests withdrawal in the UI.
2. Frontend shows available balance pulled from contract view.
3. Player signs `withdraw_user(amount)` using their wallet.
4. Contract debits their ledger and transfers `Coin<CASH>` back to their wallet.
5. Backend optionally records the withdrawal event for reporting.

## Backend Implementation Notes

- Add an Aptos SDK helper (e.g., `server/src/services/aptosCash.ts`) that wraps `Aptos` client creation, loads `HOUSE_PRIVATE_KEY` from env, and exposes `recordTrade(player, delta)`, `depositHouse(amount)`, `getLedger(address)`. Import this helper inside the game routes similar to `aptosService` (`server/services/AptosService.ts:9-92`).
- Extend the router with a settlement endpoint (`POST /api/game/liquidity/settle`) or fold it into the existing `/trade/complete` handler. Persist queue items in SQLite (see `db.insertTrade()` usage in `server/routes/game.ts:235-256`) so retries survive restarts.
- Replace the mock randomness service once we talk to real Aptos RPCs; the new service can reuse the same shared `Aptos` client to avoid redundant connections.
- Update `server/src/index.ts:15-25` to allow the frontend origin to call the new endpoints and surface health metrics for the settlement queue.

## Failure Handling

- **Backend tx failure**: mark trade settlement as `PENDING` and retry until confirmed on-chain. Communicate status to client so balance isn’t overstated.
- **Node connectivity**: house signer queue should back off and persist unsent settlements for replay on restart (e.g., SQLite table with `status = QUEUED`).
- **Ledger drift**: periodic reconciliation job reads the on-chain ledger with a view function and compares against database totals.

## Security Notes

- Store house private key in server env (`HOUSE_PRIVATE_KEY`), restrict file permissions, and rotate if compromised.
- The Move module should gate `record_trade` and `deposit_house` to the house address; withdrawals remain user-only.
- Consider rate limiting backend settlement calls per address to protect liquidity.
- Log every signed transaction hash for audit and customer support.

This setup meets the “zero user signing during gameplay” requirement today while remaining compatible with future account abstraction or session-key upgrades.
