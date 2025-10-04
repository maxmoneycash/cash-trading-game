import React, { useState } from 'react';
import { useAptosGameContract } from '../hooks/useAptosGameContract';

export function ContractGameTest() {
  const {
    startGame,
    completeGame,
    gameHistory,
    isLoading,
    connected,
    account,
    getContractInfo,
    getGameStats,
    getMostRecentGame,
  } = useAptosGameContract();

  const [betAmount, setBetAmount] = useState(1.0);
  const [profitLossAmount, setProfitLossAmount] = useState(0.05);
  const [isProfit, setIsProfit] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastSeed, setLastSeed] = useState<string | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const handleStartGame = async () => {
    try {
      const seedBytes = crypto.getRandomValues(new Uint8Array(32));
      const seed = '0x' + Array.from(seedBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      addLog(`Starting game with ${betAmount} APT bet...`);
      const txHash = await startGame(betAmount, seed);
      setLastSeed(seed);
      addLog(`✅ Game started! Transaction: ${txHash?.slice(0, 16)}...`);
      addLog(`🎲 Seed used: ${seed.slice(0, 12)}...`);
    } catch (error) {
      addLog(`❌ Failed to start game: ${(error as any)?.message || 'Unknown error'}`);
    }
  };

  const handleCompleteGame = async () => {
    try {
      if (!lastSeed) {
        addLog('❌ No recorded seed from start_game - start a round first.');
        return;
      }

      addLog(`Completing game with seed: ${lastSeed.slice(0, 12)}...`);
      addLog(`${isProfit ? 'Profit' : 'Loss'}: ${profitLossAmount} APT`);

      const txHash = await completeGame(lastSeed, isProfit, profitLossAmount);
      addLog(`✅ Game completed! Transaction: ${txHash?.slice(0, 16)}...`);
      setLastSeed(null);

      if (isProfit) {
        addLog(`💰 Profit paid out: ${profitLossAmount} APT`);
      } else {
        addLog(`📉 Loss recorded: ${profitLossAmount} APT`);
      }
    } catch (error) {
      addLog(`❌ Failed to complete game: ${(error as any)?.message || 'Unknown error'}`);
    }
  };

  const contractInfo = getContractInfo();
  const gameStats = getGameStats();

  if (!connected) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '20px' }}>
        <h3>🎮 Aptos Game Contract Test</h3>
        <p style={{ color: '#666' }}>Please connect your wallet to test the game contract.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '20px' }}>
      <h3>🎮 Aptos Game Contract Test</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Column - Controls */}
        <div>
          {/* Contract Info */}
          <div style={{ marginBottom: '20px', background: '#e8f5e8', padding: '15px', borderRadius: '5px' }}>
            <h4>Contract Information</h4>
            <p><strong>Address:</strong> {contractInfo.address.slice(0, 8)}...{contractInfo.address.slice(-6)}</p>
            <p><strong>Network:</strong> Devnet</p>
            <p><strong>Gas Costs:</strong> Start: {contractInfo.gasCosts.startGame.toFixed(6)} APT, Complete: {contractInfo.gasCosts.completeGame.toFixed(6)} APT</p>
          </div>

          {/* Game Stats */}
          {gameStats.totalGames > 0 && (
            <div style={{ marginBottom: '20px', background: '#e3f2fd', padding: '15px', borderRadius: '5px' }}>
              <h4>Your Game Statistics</h4>
              <p><strong>Total Games:</strong> {gameStats.totalGames}</p>
              <p><strong>Completed:</strong> {gameStats.completedGames}</p>
              <p><strong>Total Bet:</strong> {gameStats.totalBetAmount.toFixed(4)} APT</p>
              <p><strong>Net P&L:</strong> {gameStats.netPnL.toFixed(4)} APT</p>
              {gameStats.completedGames > 0 && (
                <p><strong>Win Rate:</strong> {gameStats.winRate.toFixed(1)}%</p>
              )}
            </div>
          )}

          {/* Start Game Controls */}
          <div style={{ marginBottom: '20px', background: '#fff3e0', padding: '15px', borderRadius: '5px' }}>
            <h4>Start New Game</h4>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              Bet Amount (APT):
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                min="0.001"
                max="10"
                step="0.001"
                style={{ marginLeft: '10px', padding: '5px' }}
              />
            </label>
            <button
              onClick={handleStartGame}
              disabled={isLoading}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '5px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isLoading ? '⏳' : '🎲'} Start Game
            </button>
          </div>

          {/* Complete Game Controls */}
          <div style={{ marginBottom: '20px', background: '#fce4ec', padding: '15px', borderRadius: '5px' }}>
            <h4>Complete Game</h4>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <input
                type="radio"
                checked={isProfit}
                onChange={() => setIsProfit(true)}
                style={{ marginRight: '5px' }}
              />
              Profit
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <input
                type="radio"
                checked={!isProfit}
                onChange={() => setIsProfit(false)}
                style={{ marginRight: '5px' }}
              />
              Loss
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              Amount (APT):
              <input
                type="number"
                value={profitLossAmount}
                onChange={(e) => setProfitLossAmount(parseFloat(e.target.value))}
                min="0.001"
                step="0.001"
                style={{ marginLeft: '10px', padding: '5px' }}
              />
            </label>
            <button
              onClick={handleCompleteGame}
              disabled={isLoading}
              style={{
                background: '#FF9800',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '5px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isLoading ? '⏳' : '🏁'} Complete Game
            </button>
            <p style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
              Uses auto-generated test seed for game completion
            </p>
          </div>
        </div>

        {/* Right Column - Activity Log */}
        <div>
          <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', height: '500px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ margin: '0 0 15px 0' }}>Transaction Log</h4>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '10px',
              background: '#ffffff'
            }}>
              {logs.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
                  No transactions yet. Start a game to begin!
                </p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} style={{
                    marginBottom: '8px',
                    fontFamily: 'monospace',
                    padding: '4px',
                    borderBottom: index < logs.length - 1 ? '1px solid #eee' : 'none'
                  }}>
                    {log}
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
              💡 All transactions are recorded on-chain for verification
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}