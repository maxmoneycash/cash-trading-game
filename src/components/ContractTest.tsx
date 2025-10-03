import React, { useState, useEffect } from 'react';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { GameContract } from '../contracts/GameContract';

interface PlayerState {
  total_winnings: number;
  total_losses: number;
  games_played: number;
  last_round_id: number;
}

interface GameRound {
  id: number;
  seed: string;
  candle_config: any;
  start_time: number;
  end_time: number;
  pnl: number;
  status: number;
}

export function ContractTest() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [gameContract] = useState(() => new GameContract());
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [gameRound, setGameRound] = useState<GameRound | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const refreshData = async () => {
    if (!account) return;
    
    try {
      const state = await gameContract.getPlayerState(account.address.toString());
      setPlayerState(state);
      
      const round = await gameContract.getGameRound(account.address.toString());
      setGameRound(round);
      
      addLog('Data refreshed successfully');
    } catch (error) {
      addLog(`Error refreshing data: ${(error as any)?.message}`);
    }
  };

  useEffect(() => {
    if (connected && account) {
      refreshData();
    }
  }, [connected, account]);

  const handleInitializePlayer = async () => {
    if (!connected || !account) {
      addLog('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      addLog('Initializing player...');
      const txHash = await gameContract.initializePlayer(signAndSubmitTransaction);
      setLastTxHash(txHash);
      addLog(`Player initialized! Tx: ${txHash.slice(0, 10)}...`);
      await refreshData();
    } catch (error) {
      addLog(`Failed to initialize player: ${(error as any)?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!connected || !account) {
      addLog('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      // Generate a random seed
      const seed = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      addLog('Starting new game...');
      const txHash = await gameContract.startGame(signAndSubmitTransaction, 1.0, seed);
      setLastTxHash(txHash);
      addLog(`Game started! Tx: ${txHash.slice(0, 10)}...`);
      await refreshData();
    } catch (error) {
      addLog(`Failed to start game: ${(error as any)?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteGame = async () => {
    if (!connected || !account || !gameRound) {
      addLog('No active game found');
      return;
    }

    setIsLoading(true);
    try {
      // Mock some trades for testing
      const mockTrades = [
        { timestamp: Date.now(), action: 0, price: 100000000, amount: 50000000 }, // Buy
        { timestamp: Date.now() + 1000, action: 1, price: 102000000, amount: 50000000 }, // Sell higher
      ];

      addLog('Completing game...');
      const txHash = await gameContract.completeGame(
        signAndSubmitTransaction, 
        gameRound.id, 
        102000000, // Final price
        mockTrades
      );
      setLastTxHash(txHash);
      addLog(`Game completed! Tx: ${txHash.slice(0, 10)}...`);
      await refreshData();
    } catch (error) {
      addLog(`Failed to complete game: ${(error as any)?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!connected) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>🔧 Smart Contract Test</h3>
        <p>Please connect your wallet to test smart contract functionality.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h3>🔧 Smart Contract Test</h3>
      
      {/* Player State */}
      <div style={{ marginBottom: '20px', background: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
        <h4>Player State</h4>
        {playerState ? (
          <div>
            <p><strong>Games Played:</strong> {playerState.games_played}</p>
            <p><strong>Total Winnings:</strong> {playerState.total_winnings.toFixed(4)} APT</p>
            <p><strong>Total Losses:</strong> {playerState.total_losses.toFixed(4)} APT</p>
            <p><strong>Last Round ID:</strong> {playerState.last_round_id}</p>
          </div>
        ) : (
          <p style={{ color: '#666' }}>Player not initialized</p>
        )}
      </div>

      {/* Active Game Round */}
      <div style={{ marginBottom: '20px', background: '#e8f5e8', padding: '15px', borderRadius: '5px' }}>
        <h4>Active Game Round</h4>
        {gameRound ? (
          <div>
            <p><strong>Round ID:</strong> {gameRound.id}</p>
            <p><strong>Status:</strong> {gameRound.status === 0 ? 'Active' : gameRound.status === 1 ? 'Completed' : 'Liquidated'}</p>
            <p><strong>Seed:</strong> {gameRound.seed.slice(0, 16)}...</p>
            <p><strong>PnL:</strong> {gameRound.pnl} octas</p>
            {gameRound.candle_config && (
              <p><strong>Candles:</strong> {gameRound.candle_config.total_candles} @ {gameRound.candle_config.interval_ms}ms</p>
            )}
          </div>
        ) : (
          <p style={{ color: '#666' }}>No active game round</p>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleInitializePlayer}
          disabled={isLoading}
          style={{ 
            background: '#2196F3', 
            color: 'white', 
            border: 'none', 
            padding: '10px 15px', 
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isLoading ? '⏳' : '🚀'} Initialize Player
        </button>

        <button 
          onClick={handleStartGame}
          disabled={isLoading || (gameRound?.status === 0)}
          style={{ 
            background: '#4CAF50', 
            color: 'white', 
            border: 'none', 
            padding: '10px 15px', 
            borderRadius: '5px',
            cursor: isLoading || (gameRound?.status === 0) ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isLoading ? '⏳' : '🎮'} Start Game
        </button>

        <button 
          onClick={handleCompleteGame}
          disabled={isLoading || !gameRound || gameRound?.status !== 0}
          style={{ 
            background: '#FF9800', 
            color: 'white', 
            border: 'none', 
            padding: '10px 15px', 
            borderRadius: '5px',
            cursor: isLoading || !gameRound || gameRound?.status !== 0 ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isLoading ? '⏳' : '🏁'} Complete Game
        </button>

        <button 
          onClick={refreshData}
          disabled={isLoading}
          style={{ 
            background: '#9C27B0', 
            color: 'white', 
            border: 'none', 
            padding: '10px 15px', 
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {/* Transaction Hash */}
      {lastTxHash && (
        <div style={{ marginBottom: '20px', background: '#e3f2fd', padding: '10px', borderRadius: '5px' }}>
          <p><strong>Last Transaction:</strong></p>
          <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>{lastTxHash}</code>
        </div>
      )}

      {/* Activity Log */}
      <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '5px' }}>
        <h4>Activity Log</h4>
        <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '12px' }}>
          {logs.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No activity yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '5px', fontFamily: 'monospace' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}