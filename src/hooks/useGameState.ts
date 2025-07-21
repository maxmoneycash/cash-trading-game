import { useState, useCallback } from 'react';

export interface GameState {
  isRoundActive: boolean;
  roundStartTime: number;
  roundDuration: number;
  currentCandleIndex: number;
  isHistoricalView: boolean;
}

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>({
    isRoundActive: false,
    roundStartTime: 0,
    roundDuration: 30000, // 30 seconds
    currentCandleIndex: 0,
    isHistoricalView: false,
  });

  const startRound = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isRoundActive: true,
      roundStartTime: Date.now(),
      currentCandleIndex: 0,
      isHistoricalView: false,
    }));
  }, []);

  const endRound = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isRoundActive: false,
      isHistoricalView: true,
    }));
  }, []);

  const updateCandleIndex = useCallback((index: number) => {
    setGameState(prev => ({
      ...prev,
      currentCandleIndex: index,
    }));
  }, []);

  const syncGameState = useCallback((newState: Partial<GameState>) => {
    setGameState(prev => ({
      ...prev,
      ...newState,
    }));
  }, []);

  // Calculate remaining time for UI
  const getRemainingTime = useCallback(() => {
    if (!gameState.isRoundActive) return 0;
    const elapsed = Date.now() - gameState.roundStartTime;
    return Math.max(0, gameState.roundDuration - elapsed);
  }, [gameState.isRoundActive, gameState.roundStartTime, gameState.roundDuration]);

  const isRoundExpired = useCallback(() => {
    return getRemainingTime() <= 0;
  }, [getRemainingTime]);

  return {
    gameState,
    startRound,
    endRound,
    updateCandleIndex,
    syncGameState, // For Socket.io sync
    getRemainingTime,
    isRoundExpired,
  };
};