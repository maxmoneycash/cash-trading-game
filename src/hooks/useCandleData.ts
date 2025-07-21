import { useState, useCallback } from 'react';

export interface CandleData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  animation?: number;
  isLiquidation?: boolean;
}

export const useCandleData = (maxCandles: number = 100) => {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [allRoundCandles, setAllRoundCandles] = useState<CandleData[]>([]);

  const addCandle = useCallback((candle: CandleData) => {
    // Add to current visible candles
    setCandles(prev => {
      const newCandles = [...prev];
      if (newCandles.length >= maxCandles) {
        newCandles.shift(); // Remove oldest
      }
      newCandles.push({
        ...candle,
        animation: candle.isLiquidation ? 1 : 0 // Full animation for liquidation
      });
      return newCandles;
    });

    // Add to historical round data
    setAllRoundCandles(prev => [...prev, {
      ...candle,
      animation: 1 // Historical candles are fully visible
    }]);
  }, [maxCandles]);

  const clearCandles = useCallback(() => {
    setCandles([]);
    setAllRoundCandles([]);
  }, []);

  const syncCandles = useCallback((newCandles: CandleData[]) => {
    // For Socket.io sync - replace all candles with server data
    setCandles(newCandles.slice(-maxCandles)); // Keep only recent ones
    setAllRoundCandles(newCandles);
  }, [maxCandles]);

  const getCurrentPrice = useCallback(() => {
    if (candles.length === 0) return 0;
    return candles[candles.length - 1].close;
  }, [candles]);

  const getVisibleCandles = useCallback((isHistoricalView: boolean) => {
    return isHistoricalView ? allRoundCandles : candles;
  }, [candles, allRoundCandles]);

  return {
    candles,
    allRoundCandles,
    addCandle,
    clearCandles,
    syncCandles, // For Socket.io sync
    getCurrentPrice,
    getVisibleCandles,
    candleCount: candles.length,
  };
};