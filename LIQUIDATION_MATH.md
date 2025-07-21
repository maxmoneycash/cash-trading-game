# Cash Trading Game - Liquidation Probability System

## Overview
This document formalizes the liquidation/rug system mathematics to ensure fair gameplay while maintaining excitement and house edge.

## Game Parameters
- **Round Duration:** 30 seconds (470 candles at ~15.6 FPS)
- **Grace Period:** 150 candles (~10 seconds) - NO LIQUIDATIONS POSSIBLE
- **Ramp-up Period:** 75 candles (~5 seconds) - Gradual probability increase
- **Full Risk Period:** Remaining 245 candles (~15 seconds)

## Liquidation Probability Formula

### Phase 1: Grace Period (Candles 1-150)
```
liquidationProbability = 0 (GUARANTEED SAFE)
```

### Phase 2: Ramp-up Period (Candles 151-225)
```
candlesSinceGrace = currentCandle - 150
rampUpMultiplier = min(1, candlesSinceGrace / 75)
baseChance = 0.0003 * rampUpMultiplier
```

### Phase 3: Full Risk Period (Candles 226-470)
```
baseChance = 0.0003 (0.03% per candle)
```

## Risk Factors (Only During Active Position)

### 1. Time Risk (Position Duration)
- **Grace Period:** 60 candles (4 seconds) after opening position
- **Formula:** `min(0.004, ((duration - 60) / 200)^1.8 * 0.006)`
- **Max Additional Risk:** 0.4% per candle

### 2. Size Risk (Position Size)
- **Threshold:** 70% of balance
- **Formula:** `min(0.0005, (positionSize/balance - 0.7) * 0.0005)`
- **Max Additional Risk:** 0.05% per candle

### 3. Leverage Risk (Not Currently Implemented)
- **Threshold:** 15x leverage
- **Formula:** `min(0.0005, (leverage - 15) / 100 * 0.001)`
- **Max Additional Risk:** 0.05% per candle

### 4. Greed Risk (High Profits)
- **Threshold:** 30% profit relative to balance
- **Formula:** `min(0.0008, (profitPercent - 0.3) * 0.001)`
- **Max Additional Risk:** 0.08% per candle

### 5. Trend Risk (Trading Against Market)
- **Condition:** Position direction opposite to 5-candle trend
- **Fixed Risk:** 0.02% per candle

## Random Multiplier
- **Range:** 0.7x to 1.5x (reduced from 0.5x to 2x)
- **Only Applied:** After grace period

## Final Probability Calculation
```javascript
// After grace period only
let totalRisk = baseChance + timeRisk + sizeRisk + leverageRisk + greedRisk + trendRisk
totalRisk *= randomMultiplier  // 0.7x to 1.5x
totalRisk = min(0.01, totalRisk)  // Cap at 1% per candle
```

## Expected Liquidation Probabilities

### Scenario 1: No Position (Idle)
- **Candles 1-150:** 0% (grace period)
- **Candles 151-225:** 0% to 0.045% (ramping up)
- **Candles 226-470:** 0.021% to 0.045% (with random multiplier)

### Scenario 2: Quick Trade (30 candles)
- **During Position:** Base chance only
- **Max Risk:** ~0.045% per candle
- **Expected Liquidation Rate:** ~1.3% of trades

### Scenario 3: Long Hold (100+ candles)
- **Time Risk Kicks In:** After 60 candles
- **Additional Risk:** Up to 0.4% per candle
- **Total Max Risk:** ~0.5% per candle
- **Expected Liquidation Rate:** ~40% of long holds

### Scenario 4: Greedy High-Profit Trade
- **Profit >30% Balance:** Additional 0.08% risk
- **Total Risk:** ~0.53% per candle
- **High Risk of Liquidation:** ~50% chance if held too long

## Overall Game Statistics

### Round Completion Rates
- **Grace Period Survival:** 100%
- **No Position (Idle):** ~90% complete rounds
- **Active Trading (Mixed):** ~75-85% complete rounds
- **Long Holds:** ~50-60% complete rounds

### House Edge Calculation
With these probabilities and player behavior patterns:
- **Estimated House Edge:** 2-4%
- **Comparable to:** Crash games (1-2%) and better than slots (5-15%)

## Key Improvements Made

1. **Guaranteed Grace Period:** First 10 seconds are completely safe
2. **Gradual Ramp-up:** Risk increases slowly, not suddenly
3. **Reduced Base Chance:** 0.03% vs previous 0.08%
4. **Lower Random Multiplier:** 1.5x max vs previous 2x max
5. **Clear Risk Communication:** Players can see exactly what factors increase risk

## Player Strategy Implications

- **Early Game:** Safe to experiment and learn
- **Mid Game:** Moderate risk for quick trades
- **Late Game:** High risk/high reward for patient players
- **Risk Management:** Clear incentives to close profitable positions

This system ensures players get meaningful trading time while maintaining game excitement and profitability.