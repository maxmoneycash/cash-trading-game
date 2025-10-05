# Aptos Round Lifecycle Plan

## Goals
- **Accurate on-chain settlement** – every 30 s round must call `start_game` once at the beginning and `complete_game` once at the end with the real seed + P&L.
- **Responsive UI state** – the chart should remain paused until the wallet is fully connected, balance fetched, and the player has approved the `start_game` transaction. Round end should not hang in a "disconnected" state.
- **Live balance feedback** – the wallet widget should reflect round P&L immediately after each buy/sell cycle and reconcile with the on-chain balance after settlement.
- **Robust retries** – rejected signatures or transient RPC failures should queue the current seed/round until the player approves instead of letting the chart advance.

## Approach

### 1. Round Gating
- Track three readiness flags: `hasWalletConnection`, `hasWalletBalance`, `startTxPending`.
- Queue any new round seeds until readiness is satisfied.
- Pause the chart (`isPaused`, overlay) while waiting; resume only after `start_game` resolves.

### 2. P&L Tracking & Display
- Accumulate per-round P&L via `onPositionClosed(netProfit)`.
- Feed `walletBalance + accumulatedPnL` into the balance display so the player sees intraround effects.
- When settlement finishes, refresh the on-chain balance and reset the accumulator for the next round.

### 3. Settlement Workflow
- Persist `gameSeed`, `startTxHash`, and `pendingCompletion` state.
- On `gameEnded`, call `complete_game` with stored seed/P&L. If it succeeds, clear state and prime the next seed; if the user rejects, keep the round paused with a retry banner.

### 4. Error Handling & Telemetry
- Add structured logs/flags for: queued seeds, start approval status, settlement status, last RPC error.
- Surface a UI hint when the player must approve a pending transaction.
- Ensure we never drop back to `disconnected` while an approved round is active.

### 5. Verification
- Manual flow: connect wallet → approve start → take positions → observe live balance updates → wait for settlement → verify Aptos transaction and wallet reconciliation.
- Regression: reject start, approve later, reject completion, run multiple rounds back-to-back.

## Next Steps
1. Implement the state machine above inside `AptosCandlestickChart.tsx`.
2. Wire the balance overlay to include intraround P&L.
3. Harden `useAptosGameContract` with helpers to expose start/complete status for telemetry.
4. Test end-to-end on devnet (success, rejection, reconnect scenarios).
