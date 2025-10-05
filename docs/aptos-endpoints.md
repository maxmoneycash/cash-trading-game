# Aptos Integration Endpoints

This document captures every place in the app that talks to the Aptos blockchain or supporting devnet tools.

## On-chain entry points (Move module)

All on-chain interactions are wrapped by `src/contracts/GameContract.ts`. The class exposes the Move entry points we call via the wallet adapter:

| GameContract method | Move function invoked | Purpose | Where used |
| --- | --- | --- | --- |
| `startGame` (`src/contracts/GameContract.ts:45`) | `game::start_game` | Opens a round on-chain with a wager (APT → octas conversion happens client-side). | Called from `useAptosGameContract.startGame` before running a P&L simulation (`src/hooks/useAptosGameContract.ts:32`). |
| `completeGame` (`src/contracts/GameContract.ts:75`) | `game::complete_game` | Resolves the round, posting either profit or loss plus the deterministic seed. | Triggered by `useAptosGameContract.completeGame` during the simulator flow (`src/hooks/useAptosGameContract.ts:57`). |
| `getPlayerGameStartEvents` (`src/contracts/GameContract.ts:107`) | (view helper) | Placeholder for reading emitted start events; currently returns an empty array pending indexer wiring. | Used when we refresh history in `useAptosGameContract.fetchGameHistory` (`src/hooks/useAptosGameContract.ts:140`). |
| `getPlayerGameEndEvents` (`src/contracts/GameContract.ts:124`) | (view helper) | Placeholder for reading completion events; also returns an empty array for now. | Same fetcher as above. |
| `getDefaultCandleConfig` (`src/contracts/GameContract.ts:140`) | Local constant | Supplies the fairness config mirror available on-chain. | Surfaces through `useAptosGameContract.getContractInfo`. |
| `estimateGasCosts` (`src/contracts/GameContract.ts:173`) | Local heuristic | Gives hard-coded gas estimates based on local testing. | Shown through `useAptosGameContract.getContractInfo`. |

Because everything funnels through `GameContract`, the Move entry points the app relies on live in a single file. See the full implementation at `src/contracts/GameContract.ts`.

## Client-side orchestration

`useAptosGameContract` (`src/hooks/useAptosGameContract.ts`) is the hook the UI consumes. It wires wallet actions (`signAndSubmitTransaction`) to the two transaction endpoints above, waits for confirmations, and caches history/balances. The `SimplifiedAptosTest` page then exposes these calls through the `/test` interface.

## Supporting Aptos services

- **Devnet faucet** – `src/components/test/DevnetFaucet.tsx` hits `https://faucet.devnet.aptoslabs.com/mint` to mint test APT, chunking large requests into 1‑APT batches.
- **Balance + indexer reads** – The hook instantiates the official Aptos TypeScript SDK pointing at devnet (`Network.DEVNET`) to fetch wallet balances (`aptos.getAccountAPTAmount`) and, eventually, event streams (`src/hooks/useAptosGameContract.ts:95`).
- **Mock randomness** – The backend exposes a placeholder `AptosService` (`server/services/AptosService.ts`) that fabricates seeds and transaction hashes until we swap in a real on-chain randomness source. The Express API (`POST /api/game/start`) consumes this service when creating deterministic rounds.

## Quick reference

- Primary contract wrapper: `src/contracts/GameContract.ts`
- React hook facade: `src/hooks/useAptosGameContract.ts`
- Test-lab UI that exercises the endpoints: `src/components/test/SimplifiedAptosTest.tsx`
- Devnet faucet helper: `src/components/test/DevnetFaucet.tsx`
- Server mock for Aptos randomness: `server/services/AptosService.ts`
- Devnet publish helper: `contracts/scripts/publish_if_missing.sh`

### Configuration

- `VITE_APTOS_CONTRACT_ADDRESS` — override the on-chain module address when a new deployment is available.
- `VITE_APTOS_USE_MOCK` — set to `false` to force on-chain mode or `true` to always skip wallet transactions.
- Run `aptos init --profile devnet` once per machine so the CLI stores the devnet account in `~/.aptos/config.yaml`; the publish script relies on that profile.
