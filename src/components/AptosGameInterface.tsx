import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAptosGameContract } from '../hooks/useAptosGameContract';

interface AptosGameInterfaceProps {
  onGameStart: (betAmount: number, seed: string) => void;
  onGameEnd: (isProfit: boolean, amount: number) => void;
  gameState: 'waiting' | 'playing' | 'completed';
  pnl: number;
  currentPrice: number;
}

export function AptosGameInterface({
  onGameStart,
  onGameEnd,
  gameState,
  pnl,
  currentPrice
}: AptosGameInterfaceProps) {
  const { connected, account } = useWallet();
  const {
    startGame,
    isLoading,
    getGameStats,
    walletBalance,
    fetchWalletBalance,
    aptToOctas,
    octasToApt,
  } = useAptosGameContract();


  const [betAmount, setBetAmount] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameStats, setGameStats] = useState<any>(null);
  const [currentGameSeed, setCurrentGameSeed] = useState<string | null>(null);

  // Update game stats when wallet connects
  useEffect(() => {
    if (connected) {
      const stats = getGameStats();
      setGameStats(stats);
    }
  }, [connected]); // Remove getGameStats from dependencies to prevent infinite loop

  const handleStartGame = async () => {
    console.log('handleStartGame called:', { connected, isLoading, gameState, betAmount });

    if (!connected || isLoading || gameState !== 'waiting') {
      console.log('Start game blocked:', { connected, isLoading, gameState });
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Starting blockchain game with bet amount:', betAmount);
      const seedBytes = crypto.getRandomValues(new Uint8Array(32));
      const seed = '0x' + Array.from(seedBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      // Start blockchain game
      const txHash = await startGame(betAmount, seed);
      console.log('Game started on blockchain:', txHash);

      setCurrentGameSeed(seed);
      console.log('Generated game seed:', seed);

      // Notify the main game to start
      console.log('Calling onGameStart with:', { betAmount, seed });
      onGameStart(betAmount, seed);
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start game. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndGame = async () => {
    if (!currentGameSeed || gameState !== 'completed') return;

    setIsProcessing(true);
    try {
      // The settlement is now handled automatically by the balance manager
      // This function is mainly for UI state management
      console.log('Game end UI handler called, settlement handled by balance manager');

      // Notify the main game
      const isProfit = pnl > 0;
      const profitLossAmount = Math.abs(pnl / 100); // Convert to APT
      onGameEnd(isProfit, profitLossAmount);

      // Reset for next game
      setCurrentGameSeed(null);

      // Refresh stats
      const stats = getGameStats();
      setGameStats(stats);
    } catch (error) {
      console.error('Failed to complete game:', error);
      alert('Failed to complete game. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!connected) {
    return (
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        textAlign: 'center',
        zIndex: 1000
      }}>
        <h3>Connect Wallet to Play with Real APT</h3>
        <p>Connect your Aptos wallet to start betting with real APT tokens</p>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      zIndex: 1000
    }}>
      {/* Wallet Info */}
      <div style={{ marginBottom: '15px', fontSize: '12px' }}>
        <div>Connected: {account?.address?.toString().slice(0, 6)}...{account?.address?.toString().slice(-4)}</div>
        <div style={{ marginTop: '5px', color: '#4CAF50', fontWeight: 'bold' }}>
          Balance: {walletBalance.toFixed(4)} APT
        </div>
        {gameStats && (
          <div style={{ marginTop: '5px', color: '#888' }}>
            Games: {gameStats.totalGames} | Net P&L: {gameStats.netPnL.toFixed(4)} APT
          </div>
        )}
      </div>

      {/* Game Controls */}
      {gameState === 'waiting' && (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Bet Amount (APT):
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(parseFloat(e.target.value))}
              min="0.001"
              max="10"
              step="0.001"
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #333',
                background: '#222',
                color: 'white',
                width: '100px'
              }}
            />
          </div>
          <button
            onClick={handleStartGame}
            disabled={isProcessing || betAmount <= 0}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {isProcessing ? 'Starting...' : `Start Game (${betAmount} APT)`}
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div>
          <div style={{ fontSize: '14px', marginBottom: '10px' }}>
            🎮 Game in Progress - Current Price: ${currentPrice.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            Betting {betAmount} APT - Click to buy/sell at the right time!
          </div>
        </div>
      )}

      {gameState === 'completed' && (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '16px', marginBottom: '5px' }}>
              Game Complete! P&L: <span style={{
                color: pnl >= 0 ? '#4CAF50' : '#f44336'
              }}>
                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {pnl >= 0 ? 'Profit will be paid out' : 'Loss will be deducted'}
            </div>
          </div>
          <button
            onClick={handleEndGame}
            disabled={isProcessing}
            style={{
              background: '#FF9800',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {isProcessing ? 'Processing...' : 'Complete Game on Blockchain'}
          </button>
        </div>
      )}
    </div>
  );
}