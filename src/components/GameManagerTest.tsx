/**
 * GameManager Test Component - Proof of Concept
 * Simple interface to test the GameManager functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameManager, CandleData, Trade } from '../managers/GameManager';
import { api } from '../services/api';

const GameManagerTest: React.FC = () => {
  const gameManagerRef = useRef<GameManager | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [position, setPosition] = useState<Trade | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');

  // Initialize GameManager
  useEffect(() => {
    const gameManager = new GameManager();

    // Set up event listeners
    gameManager.onCandleGenerated = (candle: CandleData) => {
      setCandles(prev => [...prev.slice(-20), candle]); // Keep last 20 candles
      addLog(`📊 Candle ${candle.index}: ${candle.close.toFixed(2)}`);
    };

    gameManager.onPositionUpdate = (updatedPosition: Trade) => {
      setPosition(updatedPosition);
      addLog(`💼 Position P&L: ${updatedPosition.pnl.toFixed(2)}`);
    };

    gameManager.onRoundComplete = (summary: any) => {
      addLog(`🏁 Round completed! Final price: ${summary.finalPrice?.toFixed(2)}`);
    };

    gameManager.onError = (error: string) => {
      addLog(`❌ Error: ${error}`);
    };

    gameManagerRef.current = gameManager;

    return () => {
      gameManager.destroy();
    };
  }, []);

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await api.healthCheck();
        if (response.error) {
          setBackendStatus('❌ Backend offline');
        } else {
          setBackendStatus('✅ Backend connected');
          
          // Test database
          const usersResponse = await api.getUsers();
          if (!usersResponse.error) {
            addLog(`📁 Database has ${usersResponse.data.users.length} users`);
          }
        }
      } catch (error) {
        setBackendStatus('❌ Backend offline');
      }
    };

    checkBackend();
  }, []);

  // Update game state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameManagerRef.current) {
        setGameState(gameManagerRef.current.getGameState());
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-10), `${timestamp}: ${message}`]);
  };

  const handleStartRound = async () => {
    if (gameManagerRef.current) {
      setCandles([]);
      setLogs([]);
      addLog('🎮 Starting new round...');
      await gameManagerRef.current.startNewRound();
    }
  };

  const handleOpenLong = async () => {
    if (gameManagerRef.current && !position) {
      try {
        await gameManagerRef.current.openPosition('LONG', 100);
        addLog('📈 Opened LONG position');
      } catch (error: any) {
        addLog(`❌ ${error.message}`);
      }
    }
  };

  const handleOpenShort = async () => {
    if (gameManagerRef.current && !position) {
      try {
        await gameManagerRef.current.openPosition('SHORT', 100);
        addLog('📉 Opened SHORT position');
      } catch (error: any) {
        addLog(`❌ ${error.message}`);
      }
    }
  };

  const handleClosePosition = async () => {
    if (gameManagerRef.current && position) {
      try {
        await gameManagerRef.current.closePosition();
        addLog('🔒 Closed position');
      } catch (error: any) {
        addLog(`❌ ${error.message}`);
      }
    }
  };

  const handleStopRound = () => {
    if (gameManagerRef.current) {
      gameManagerRef.current.stopRound();
      addLog('⏹️ Round stopped');
    }
  };

  const testDatabaseCreate = async () => {
    const response = await api.createTestRound();
    if (response.error) {
      addLog(`❌ DB Test failed: ${response.error}`);
    } else {
      addLog(`✅ Created test round: ${response.data.round.id}`);
    }
  };

  const testGameAPI = async () => {
    try {
      // Test the new game API
      const response = await fetch('http://localhost:3001/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Game API works! Round: ${data.round.id}`);
        addLog(`🎲 Aptos seed: ${data.round.seed.substring(0, 10)}...`);
      } else {
        addLog(`❌ Game API failed: ${response.status}`);
      }
    } catch (error: any) {
      addLog(`❌ Game API error: ${error.message}`);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace', 
      background: '#1a1a1a', 
      color: '#00ff00',
      minHeight: '100vh'
    }}>
      <h1>🎮 GameManager Proof of Concept</h1>
      
      {/* Backend Status */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #333' }}>
        <h3>Backend Status</h3>
        <p>{backendStatus}</p>
        <button 
          onClick={testDatabaseCreate}
          style={{ marginTop: '10px', padding: '5px 10px', marginRight: '10px' }}
        >
          Test Database Creation
        </button>
        <button 
          onClick={testGameAPI}
          style={{ marginTop: '10px', padding: '5px 10px' }}
        >
          Test Game API
        </button>
      </div>

      {/* Game Controls */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #333' }}>
        <h3>Game Controls</h3>
        <button 
          onClick={handleStartRound}
          disabled={gameState?.isActive}
          style={{ margin: '5px', padding: '10px 20px' }}
        >
          Start Round
        </button>
        <button 
          onClick={handleStopRound}
          disabled={!gameState?.isActive}
          style={{ margin: '5px', padding: '10px 20px' }}
        >
          Stop Round
        </button>
      </div>

      {/* Replay Controls */}
      {gameState?.isReplayMode && (
        <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ff6b35' }}>
          <h3>🎬 Replay Controls</h3>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ marginRight: '10px' }}>Speed:</label>
            <button onClick={() => gameManagerRef.current?.setReplaySpeed(0.5)} style={{ margin: '2px', padding: '4px 8px' }}>0.5x</button>
            <button onClick={() => gameManagerRef.current?.setReplaySpeed(1.0)} style={{ margin: '2px', padding: '4px 8px' }}>1.0x</button>
            <button onClick={() => gameManagerRef.current?.setReplaySpeed(2.0)} style={{ margin: '2px', padding: '4px 8px' }}>2.0x</button>
            <button onClick={() => gameManagerRef.current?.setReplaySpeed(5.0)} style={{ margin: '2px', padding: '4px 8px' }}>5.0x</button>
          </div>
          <p style={{ fontSize: '12px', color: '#888' }}>
            Current speed: {gameState.replaySpeed}x
          </p>
        </div>
      )}

      {/* Replay Examples */}
      {!gameState?.isReplayMode && (
        <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #444' }}>
          <h3>🎬 Replay System</h3>
          <p style={{ fontSize: '14px', marginBottom: '10px' }}>Test replay functionality with URL parameters:</p>
          <div style={{ fontSize: '12px', color: '#888' }}>
            <p><strong>Replay by Round ID:</strong> ?test=true&replay=ROUND_ID</p>
            <p><strong>Replay by Seed:</strong> ?test=true&seed=0x123abc...</p>
            <p style={{ marginTop: '8px' }}>Generate a round first, then use its ID/seed in the URL!</p>
          </div>
        </div>
      )}

      {/* Trading Controls */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #333' }}>
        <h3>Trading Controls</h3>
        <button 
          onClick={handleOpenLong}
          disabled={!gameState?.isActive || !!position}
          style={{ margin: '5px', padding: '10px 20px', backgroundColor: '#004400' }}
        >
          Open LONG
        </button>
        <button 
          onClick={handleOpenShort}
          disabled={!gameState?.isActive || !!position}
          style={{ margin: '5px', padding: '10px 20px', backgroundColor: '#440000' }}
        >
          Open SHORT
        </button>
        <button 
          onClick={handleClosePosition}
          disabled={!position}
          style={{ margin: '5px', padding: '10px 20px' }}
        >
          Close Position
        </button>
      </div>

      {/* Game State */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #333' }}>
        <h3>Game State</h3>
        <p>Round Active: {gameState?.isActive ? '✅' : '❌'}</p>
        <p>Current Price: ${gameState?.currentRound ? gameManagerRef.current?.getCurrentPrice().toFixed(2) : 'N/A'}</p>
        <p>Candles Generated: {candles.length}</p>
        <p>Round Progress: {((gameState?.roundProgress || 0) * 100).toFixed(1)}%</p>
        
        {/* Replay Mode Indicator */}
        {gameState?.isReplayMode && (
          <div style={{ 
            marginTop: '10px', 
            padding: '8px', 
            border: '2px solid #ff6b35', 
            borderRadius: '4px',
            backgroundColor: '#331a00'
          }}>
            <p style={{ color: '#ff6b35', fontWeight: 'bold', margin: '2px 0' }}>
              🎬 REPLAY MODE
            </p>
            <p style={{ margin: '2px 0' }}>Speed: {gameState.replaySpeed}x</p>
            {gameState.currentRound && (
              <p style={{ margin: '2px 0', fontSize: '12px' }}>
                Seed: {gameState.currentRound.seed?.substring(0, 16)}...
              </p>
            )}
          </div>
        )}
        {position && (
          <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #666' }}>
            <p><strong>Active Position:</strong></p>
            <p>Direction: {position.direction}</p>
            <p>Entry Price: ${position.entryPrice.toFixed(2)}</p>
            <p>P&L: ${position.pnl.toFixed(2)} ({position.pnl >= 0 ? '📈' : '📉'})</p>
          </div>
        )}
      </div>

      {/* Recent Candles */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #333' }}>
        <h3>Recent Candles</h3>
        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          {candles.slice(-10).map((candle, i) => (
            <div key={candle.index} style={{ 
              padding: '2px 0', 
              color: candle.isLiquidation ? '#ff0000' : '#00ff00' 
            }}>
              #{candle.index}: O:{candle.open.toFixed(2)} H:{candle.high.toFixed(2)} L:{candle.low.toFixed(2)} C:{candle.close.toFixed(2)}
              {candle.isLiquidation && ' 💥 LIQUIDATION'}
            </div>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div style={{ padding: '10px', border: '1px solid #333' }}>
        <h3>Activity Log</h3>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ padding: '2px 0' }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameManagerTest;