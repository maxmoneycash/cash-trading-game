# Modal Interaction & Game Flow Issues (Current State)

This note captures the specific UX bugs we’re seeing with the existing modals and the anchor points in the code that cause them. It’s a reference for what needs to be reworked before we redesign the full transaction flow.

---

## 1. Modal Buttons Still Trigger Trades

### Symptoms
- Tapping the wallet modal’s close button or faucet button sometimes still opens/closes positions on the p5 canvas.
- The behaviour is especially noticeable on mobile (touch events bubble through to the chart).

### Problematic Code
`src/components/wallet/WalletPicker.tsx` (current version)

```tsx
<div
  className="wallet-overlay"
  onClick={(event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }}
  onMouseDown={(event) => event.stopPropagation()}
  onTouchStart={stopTouchPropagation}
  onTouchEnd={stopTouchPropagation}
>
```

```tsx
const stopTouchPropagation = (event: React.TouchEvent) => {
  event.stopPropagation();
};
```

- Stopping propagation alone doesn’t prevent `touchstart` → synthetic `click` on iOS, so the chart still sees the click.
- There’s no global flag to tell `useP5Chart` to ignore events while the modal is open.

---

## 2. Game Continues While Summary Modal Is Open

### Symptoms
- A new round (with a fresh seed) can begin even if the round summary modal is still visible. This confuses users because the chart resumes while the “Settle Round” button is in focus.

### Problematic Code
`src/components/AptosCandlestickChart.tsx`

```tsx
if (meta?.seed && (phase === 'start' || !phase)) {
  const preventAutoStart = sessionStorage.getItem('preventAutoStart');
  if (preventAutoStart) {
    console.log('⏸️ Auto-start prevented (user rejected previous transaction)');
    if (!queuedSeed) {
      setQueuedSeed(meta.seed);
    }
    return;
  }

  const currentGameState = gameStateRef.current;
  const currentGameStartTransaction = gameStartTransactionRef.current;

  if (currentGameState === 'ready' && !currentGameStartTransaction) {
    console.log('🎮 Auto-starting new round with seed:', meta.seed);
    startRoundOnChain(meta.seed);
  }
}
```

- The handler ignores `showRoundSummary`. It will auto-start whenever the game state is `ready`, even if the summary modal is still on screen.
- Seeds are only queued if `preventAutoStart` is set (which only happens on transaction rejection). There’s no check for active modals.

---

## 3. Modal State & Chart Interaction Aren’t Linked

### Symptoms
- When the wallet modal is open, the chart still tries to process seeds and can enter “starting” state if the backend keeps sending them.

### Problematic Code
`src/components/AptosCandlestickChart.tsx`

```tsx
const { openWalletModal, isWalletModalOpen } = useWalletModal();
// ...
disableClicks: dbg.enabled || isWaitingForWallet || gameState === 'settling' || gameState === 'disconnected',
```

- `disableClicks` doesn’t include `isWalletModalOpen`. The chart’s internal state machine keeps running while the modal is open.
- There’s no equivalent guard around `onRoundMeta`.

---

## 4. Session Storage Reliance Causes Drift

### Symptoms
- Refreshing or navigating while a modal is open leaves stale keys (`aptosGameSeed`, `aptosGameTransaction`) in storage, so the next start/settle call uses mismatched data.

### Problematic Code
`src/components/AptosCandlestickChart.tsx`

```tsx
sessionStorage.setItem('aptosGameSeed', seed);
sessionStorage.setItem('aptosGameBetAmount', betAmount.toString());
```

```tsx
const effectiveGameSeed = currentGameSeed || sessionStorage.getItem('aptosGameSeed');
const betAmount = parseFloat(sessionStorage.getItem('aptosGameBetAmount') || '0');
```

- The summary modal uses these values even if the user cancelled the start transaction or closed the wallet modal, leading to settlement attempts with stale seeds.

---

## Takeaways
1. **Modals must freeze the chart.** Today, neither the wallet modal nor the round summary pauses the p5 loop or the seed handler.
2. **Propagation tricks aren’t enough.** We need a higher-level lock (e.g., a “modal is active” flag) instead of relying solely on event handlers.
3. **Session storage isn’t a safe source of truth.** Round metadata should live in React state so it can be cleared deterministically when modals close.
4. **Auto-start logic ignores modal visibility.** `onRoundMeta` should bail when any blocking modal is open, not just when a rejection flag is set.

These are the discrete code spots that need rewiring before we can deliver the “minimal, tap-first” UX the game aims for.
