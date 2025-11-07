# Current On-Chain Transaction Flow

This document captures the *current* (Oct‑2025) behaviour of the Aptos-integrated game client. It focuses on how transactions are created, signed, and reconciled for both wallet and passkey users. The goal is to highlight the existing state before redesigning the UX so we can identify every place that currently depends on signatures.

---

## 1. Authentication Modes

| Mode            | Entry Hook / Provider                    | `startGame` Source                                | Notes |
|-----------------|-------------------------------------------|----------------------------------------------------|-------|
| Aptos Wallet    | `useAptosGameContract` + wallet adapter   | `gameContract.startGame` (wallet signer)          | Session storage mirrors the wallet address & bet amount. |
| Passkey Account | `usePasskey` (`PasskeyProvider`)          | `usePasskey.startGame` (WebAuthn ↔ Aptos SDK)     | Optimistic balance adjustments while devnet catches up. |

Both modes are mutually exclusive but expose the same interface (`signAndSubmitTransaction`, `startGame`, `completeGame`). No “deposit” or “in-app balance” exists today; every round uses the connected account’s live Aptos balance.

---

## 2. Round Lifecycle (happy path)

1. **Seed Arrival**
   - `useP5Chart` emits `onRoundMeta` with a `seed`.
   - `AptosCandlestickChart` (`onRoundMeta` handler) auto-starts a round immediately unless `preventAutoStart` is set.

2. **Round Start → `startRoundOnChain`**
   - Ensures a connection and a minimum balance (`MIN_WAGER_APT`, currently 0.001) plus a hardcoded gas reserve (0.01 APT).
   - Persists round metadata in `sessionStorage`:
     - `aptosGameSeed`, `aptosGameBetAmount`, `aptosGameTransaction`, `aptosGameBalanceBeforeStart`, `aptosWalletAddress`.
   - Calls the active account’s `startGame(betAmount, seed)`:
     - **Wallet**: `gameContract.startGame` → wallet adapter signature → fullnode submission.
     - **Passkey**: builds a transaction via the Aptos TS SDK → WebAuthn assertion → `aptos.transaction.submit.simple`.
   - On success: sets `gameState = 'playing'`, clears `isWaitingForWallet`, schedules a balance refresh after 3 seconds, and waits for the round to complete.

3. **In-Round Play**
   - P5 loop runs optimistically; there is no further chain interaction until the round ends.
   - Balance badge shows the optimistically deducted amount (wallet mode waits for `fetchWalletBalance`, passkey uses the optimistic `displayBalance`).

4. **Round End Detection**
   - `onRoundMeta` receives `phase: 'end'` (or `gameEnded` flag).
   - If `gameState === 'playing'` and a recorded `gameStartTransaction` exists, `settleRoundOnChain()` is queued.

5. **Round Summary Modal**
   - Before any on-chain settlement, UI shows `RoundSummaryModal`.
   - Closing the modal triggers `proceedWithSettlement()` which performs the end-game transaction.

6. **Settlement → `completeGame`**
   - Uses stored metadata (`aptosGameSeed`, `aptosGameBetAmount`, accumulated P&L) to build the payload:
     - `game::complete_game(seed, isProfit, amountOctas)`.
   - Again routes through the active signer (wallet adapter or passkey).
   - Passkey flow updates optimistic balance (`displayBalance`) immediately, then schedules another refresh.

7. **Balance Reconciliation**
   - After settlement, `AptosCandlestickChart` polls up to 3 times (1s apart) for the final balance.
   - Logs expected vs. actual balance, notes indexer lag if the numbers differ.
   - Session storage keys are cleared only when the next round starts (not immediately after settlement).

8. **Auto-Restart**
   - When the next seed arrives, the flow repeats automatically.

---

## 3. Failure / Edge Behaviour

- **Signature Rejection (Start Game)**
  - Catch block in `startRoundOnChain` checks `error.code === 4001` or `"User rejected"`.
  - Sets `sessionStorage.preventAutoStart = 'true'` for 5 seconds to avoid an immediate retry, then removes it.
  - Clears `queuedSeed` and resets `gameState` to `'ready'`.
  - Chart continues running in spectator mode, but the next seed will try again once the `preventAutoStart` flag expires.

- **Signature Rejection (Settlement)**
  - Similar handling in `completeGame`; the user will continue seeing the summary until they close it again, at which point `proceedWithSettlement` retries.

- **Missing Seed / Transaction**
  - If `settleRoundOnChain` discovers the seed or tx hash is missing (e.g., due to refresh or storage issues), it logs an error and resets to `ready`.

- **Balance Fetch Failures**
  - Network errors during `fetchWalletBalance` are logged; balance is set to `0` (wallet mode) or optimistic value retained (passkey).
  - Rate limiting uses exponential backoff (only in wallet mode).

- **Queued Seeds**
  - `queuedSeed` holds at most one pending seed; new seeds overwrite the previous one.
  - There is no mechanism to pause seed generation on the server, so delays risk desynchronization.

---

## 4. Components & Hooks Involved

| Area                        | File / Hook                                   | Responsibility |
|-----------------------------|-----------------------------------------------|----------------|
| Chart wrapper               | `src/components/AptosCandlestickChart.tsx`    | Game-state machine, seed queueing, modal orchestration. |
| P5 chart loop               | `src/hooks/useP5Chart.ts`                     | Emits `onRoundMeta` events; no chain context. |
| Wallet integration          | `src/hooks/useAptosGameContract.ts`           | Wallet-specific `startGame` / `completeGame` using `gameContract`. |
| Passkey integration         | `src/hooks/usePasskey.ts`                     | WebAuthn signing, optimistic balance management. |
| Contract calls abstraction  | `src/contracts/GameContract.ts`               | Thin wrapper around Aptos SDK for wallet flows. |
| Passkey signing utils       | `src/utils/passkey-webauthn.ts`               | Build/submit transactions, faucet helper, balance view. |
| Session storage relay       | `AptosCandlestickChart` + `RoundSummaryModal` | Store seed, tx hash, bet amount between start and settlement. |

---

## 5. UX Pain Points (As Observed)

1. **Forced Signature Prompt** – Auto-start immediately triggers `start_game`, so players must sign before interacting with the chart; if they cancel, it prompts again after 5 seconds.
2. **No Spectator Mode** – The app always tries to play a real-money round; there is no explicit “watch-only” state.
3. **Transaction Required to See Round** – Even passkey users (who never deposited) must sign both start and settle every round.
4. **Mobile Wallet Modal** – Current touch suppression prevents the modal buttons (including the close button) from firing on mobile browsers.
5. **Session Storage Coupling** – The flow depends heavily on `sessionStorage`; refreshing mid-round leaves the app stuck trying to settle a stale seed.
6. **Seed Queue Fragility** – Only one queued seed is retained; slow or cancelled rounds can desync the client from the server.

---

## 6. Summary

Today’s flow is built around per-round on-chain bets: *every* round requires two signatures (start + settle), and the game auto-advances as soon as the server emits the next seed. There is no “deposit once, play many rounds silently” concept—balances remain in the user’s wallet/passkey account, and the app heightens frequency of prompts instead of batching or pre-funding.

Any UX redesign that aspires to “sign once, play many” will need to:

- Introduce in-app balance custody or escrow logic.
- Decouple round-start from immediate transaction submission.
- Provide a spectator/demo mode.
- Revisit session storage dependencies and queue management.

This document serves as the baseline reference before those changes are attempted.

