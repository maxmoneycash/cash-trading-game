# Balance Menu Update Plan

## Overview
Update the balance menu (Control Center Modal) to display live balance and transaction data instead of hardcoded mock data. Remove the leaderboards tab as it's no longer needed.

---

## 📍 Current State

### Balance Menu Location
- **Component**: `ControlCenterModal`
- **Path**: `/src/components/ControlCenter/ControlCenterModal.tsx`
- **Opened by**: Clicking the balance display in bottom left corner

### Current Tabs
1. **Leaderboard Tab** (`LeaderboardTab.tsx`) - ❌ TO BE DELETED
2. **Account Tab** (`AccountTab.tsx`) - ⚠️ NEEDS UPDATE
3. **Control Center Tab** (`ControlCenterTab.tsx`) - ✅ Keep as-is

### Hard Coded Data Identified

#### AccountTab.tsx (`/src/components/ControlCenter/tabs/AccountTab.tsx`)
- **Lines 45-61**: Mock recent trades data (15 hardcoded trades with fake timestamps, sizes, and P&L)
- **Lines 180-195**: Hardcoded win rate stats (68.5%, 137 wins / 200 trades)
- **Line 134**: Balance display (receives `balance` prop, but should use live wallet balance)

#### LeaderboardTab.tsx (`/src/components/ControlCenter/tabs/LeaderboardTab.tsx`)
- **Lines 12-33**: Mock leaderboard data (20 fake entries)
- **Entire component**: To be deleted

---

## 🎯 Requirements

### 1. Balance Display
- **Current**: Hardcoded balance value passed as prop
- **Target**: Live check the wallet balance displayed in bottom left (WalletBalanceDisplay component)
- **Source**: `walletBalance + currentPnL` from `useAptosGameContract` hook and `AptosCandlestickChart` state

### 2. Transaction History
- **Current**: Hardcoded mock trades in AccountTab
- **Target**: Display buy/sell transactions from current round
- **Source**: `trades` array from `AptosCandlestickChart` component (tracked via `handlePositionOpened` and `handlePositionClosed`)

### 3. Leaderboards Tab
- **Action**: Delete completely

---

## 🔧 Implementation Plan

### Phase 1: Remove Leaderboards Tab

**Files to modify:**
1. ✅ `src/components/ControlCenter/ControlCenterTabs.tsx` (lines 14-19)
   - Remove leaderboard tab from `tabs` array
   - Update tab configuration

2. ✅ `src/components/ControlCenter/ControlCenterModal.tsx`
   - Remove `LeaderboardTab` import (line 3)
   - Remove leaderboard case from `renderTabContent()` (lines 27-28)
   - Update `TabId` type definition (line 14) to remove 'leaderboard'
   - Update padding logic (line 337) - remove leaderboard check

3. ✅ `src/components/ControlCenter/tabs/LeaderboardTab.tsx`
   - Delete entire file

---

### Phase 2: Update Balance Display

**Files to modify:**
1. ✅ `src/components/ControlCenter/ControlCenterModal.tsx`
   - Add `walletBalance` and `currentPnL` props to interface (line 10)
   - Pass these props to `AccountTab` (line 30)

2. ✅ `src/components/Footer.tsx`
   - Update `ControlCenterModal` usage (lines 123-127)
   - Pass `walletBalance` and `currentPnL` props

3. ✅ `src/components/ControlCenter/tabs/AccountTab.tsx`
   - Update interface to accept `walletBalance` and `currentPnL` (lines 3-5)
   - Replace hardcoded balance display logic
   - Calculate live balance as `walletBalance + currentPnL`

---

### Phase 3: Update Transaction History

**Files to modify:**
1. ✅ `src/components/ControlCenter/ControlCenterModal.tsx`
   - Add `trades` prop to interface
   - Pass trades to `AccountTab`

2. ✅ `src/components/Footer.tsx`
   - Pass `trades` from parent component to `ControlCenterModal`

3. ✅ `src/components/AptosCandlestickChart.tsx`
   - Pass `trades` state to Footer component (line 939+)

4. ✅ `src/components/ControlCenter/tabs/AccountTab.tsx`
   - Update interface to accept `trades: Trade[]` prop
   - Replace hardcoded `recentTrades` (lines 45-61) with prop data
   - Update table to use live trade data
   - Handle empty trades array with "No trades yet" message

5. ✅ Update trade data structure
   - Ensure `Trade` type from `src/types/trading.ts` matches UI requirements
   - Map trade fields correctly:
     - `date` → `trade.exitTimestamp || trade.entryTimestamp`
     - `pair` → Always "BTC/USD" (hardcoded for now)
     - `tradeSize` → `trade.size`
     - `timeInTrade` → Calculate from `exitTimestamp - entryTimestamp`
     - `percentGain` → Calculate from `(exitPrice - entryPrice) / entryPrice * 100`
     - `pnl` → `trade.pnl`

---

### Phase 4: Update Win Rate Statistics

**Files to modify:**
1. ✅ `src/components/ControlCenter/tabs/AccountTab.tsx`
   - Calculate win rate from actual trades
   - Calculate total wins/losses from `trades` array
   - Update display (lines 180-195) with calculated values
   - If no trades, show "N/A" or "0%"

---

## 📊 Data Flow

```
AptosCandlestickChart
  ├── walletBalance (from useAptosGameContract)
  ├── currentPnL (accumulatedPnL state)
  └── trades[] (state tracking buy/sell transactions)
       ↓
     Footer
       ↓
  ControlCenterModal
       ↓
   AccountTab (displays live data)
```

---

## ✅ Acceptance Criteria

1. ✅ Leaderboards tab is completely removed
2. ✅ Account tab shows live wallet balance (wallet balance + current P&L)
3. ✅ Recent trades section displays actual buy/sell transactions from current round
4. ✅ Win rate is calculated from actual trade history
5. ✅ Empty state handled gracefully when no trades exist
6. ✅ Tab navigation works correctly with only Account and Controls tabs

---

## 🔍 Trade Type Definition

From `/src/types/trading.ts`:
```typescript
interface Trade {
  id: string;
  entryPrice: number;
  entryTimestamp: number;
  entryCandleIndex: number;
  exitPrice?: number;
  exitTimestamp?: number;
  exitCandleIndex?: number;
  size: number;
  pnl?: number;
  status: 'open' | 'closed';
}
```

---

## 🚀 Next Steps

1. Start with Phase 1 (Remove Leaderboards)
2. Continue to Phase 2 (Update Balance Display)
3. Move to Phase 3 (Update Transaction History)
4. Finish with Phase 4 (Update Win Rate)
5. Test all functionality
6. Verify empty states and edge cases
