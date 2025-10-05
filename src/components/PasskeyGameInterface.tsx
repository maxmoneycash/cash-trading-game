import React, { useState } from 'react';
import { usePasskey } from '../hooks/usePasskey';

interface PasskeyGameInterfaceProps {
    onGameStart: (params: { betAmount: number; seed: string }) => void;
    onGameEnd: (params: { isProfit: boolean; amount: number }) => void;
    gameState: 'ready' | 'playing' | 'ended';
    pnl: number;
}

export function PasskeyGameInterface({
    onGameStart,
    onGameEnd,
    gameState,
    pnl,
}: PasskeyGameInterfaceProps) {
    const {
        isPasskeySupported,
        isConnected,
        credential,
        balance,
        isLoading,
        error,
        createNewPasskey,
        disconnect,
        refreshBalance,
        requestTestTokens,
        startGame,
        completeGame,
    } = usePasskey();

    const [betAmount, setBetAmount] = useState(0.01);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentGameSeed, setCurrentGameSeed] = useState<string | null>(null);
    const [showCredentialInfo, setShowCredentialInfo] = useState(false);

    const handleCreatePasskey = async () => {
        const success = await createNewPasskey();
        if (success) {
            console.log('Passkey created successfully!');
        }
    };

    const handleStartGame = async () => {
        if (!isConnected || isLoading || gameState !== 'ready') {
            return;
        }

        setIsProcessing(true);
        try {
            console.log('Starting passkey game with bet amount:', betAmount);

            // Start blockchain game
            // Generate a seed for this game session
            const seed = `passkey_game_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            setCurrentGameSeed(seed);
            console.log('Generated game seed:', seed);

            // Start blockchain game with seed (if supported)
            const txHash = await startGame(betAmount, seed);
            console.log('Game started on blockchain:', txHash);

            // Notify the main game to start
            onGameStart({ betAmount, seed });
        } catch (error) {
            console.error('Failed to start game:', error);
            alert(`Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEndGame = async () => {
        if (!isConnected || !currentGameSeed || gameState !== 'playing') {
            return;
        }

        setIsProcessing(true);
        try {
            const isProfit = pnl > 0;
            const amount = Math.abs(pnl);

            console.log('Ending passkey game:', { isProfit, amount, seed: currentGameSeed });

            // Complete blockchain game
            const txHash = await completeGame(currentGameSeed, isProfit, amount);
            console.log('Game completed on blockchain:', txHash);

            // Notify the main game to end
            onGameEnd({ isProfit, amount });
            setCurrentGameSeed(null);
        } catch (error) {
            console.error('Failed to end game:', error);
            alert(`Failed to end game: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isPasskeySupported) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
                textAlign: 'center'
            }}>
                <h3>🔐 Passkeys Not Supported</h3>
                <p>Your browser doesn't support passkeys. Please use a modern browser like Chrome, Safari, or Edge.</p>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
                textAlign: 'center'
            }}>
                <h3>🔐 Connect with Passkey</h3>
                <p>Use your fingerprint, Face ID, or device PIN to securely connect to the game.</p>

                <div style={{ margin: '24px 0' }}>
                    <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                        ⚡ No wallet extensions needed
                    </div>
                    <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                        🔒 Secure biometric authentication
                    </div>
                    <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                        🌐 Works across all your devices
                    </div>
                </div>

                <button
                    onClick={handleCreatePasskey}
                    disabled={isLoading}
                    style={{
                        background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '16px 32px',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        justifyContent: 'center',
                        margin: '0 auto'
                    }}
                >
                    {isLoading ? (
                        <>
                            <span style={{
                                display: 'inline-block',
                                width: '16px',
                                height: '16px',
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '50%',
                                borderTopColor: 'white',
                                animation: 'spin 1s linear infinite'
                            }}></span>
                            Creating Passkey...
                        </>
                    ) : (
                        <>
                            🔐 Create Passkey
                        </>
                    )}
                </button>

                {error && (
                    <div style={{
                        background: 'rgba(255, 0, 0, 0.1)',
                        border: '1px solid rgba(255, 0, 0, 0.3)',
                        color: '#ffcdd2',
                        padding: '12px',
                        borderRadius: '8px',
                        marginTop: '16px'
                    }}>
                        ⚠️ {error}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#4CAF50',
                        boxShadow: '0 0 8px rgba(76, 175, 80, 0.5)'
                    }}></span>
                    <span>Connected with Passkey</span>
                </div>
                <button
                    onClick={disconnect}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    Disconnect
                </button>
            </div>

            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                }}>
                    <div>
                        <div style={{ fontSize: '14px', opacity: 0.8 }}>APT Balance</div>
                        <div style={{ fontSize: '20px', fontWeight: '600', fontFamily: 'monospace' }}>
                            {balance.toFixed(4)} APT
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={refreshBalance}
                            disabled={isLoading}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            🔄
                        </button>
                        <button
                            onClick={requestTestTokens}
                            disabled={isLoading}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            💧 Get Test APT
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => setShowCredentialInfo(!showCredentialInfo)}
                    style={{
                        background: 'none',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <span>Address: {credential?.publicKey.aptosAddress.slice(0, 6)}...{credential?.publicKey.aptosAddress.slice(-4)}</span>
                    <span>{showCredentialInfo ? '▼' : '▶'}</span>
                </button>

                {showCredentialInfo && (
                    <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: 'rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontFamily: 'monospace'
                    }}>
                        <div style={{ marginBottom: '8px' }}>
                            <strong>Full Address:</strong><br />
                            {credential?.publicKey.aptosAddress}
                        </div>
                        <div>
                            <strong>Credential ID:</strong><br />
                            {credential?.id.slice(0, 20)}...
                        </div>
                    </div>
                )}
            </div>

            <div>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Bet Amount (APT)
                    </label>
                    <input
                        type="number"
                        min="0.001"
                        max={balance}
                        step="0.001"
                        value={betAmount}
                        onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                        disabled={gameState === 'playing' || isLoading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '16px'
                        }}
                    />
                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                        Available: {balance.toFixed(4)} APT
                    </div>
                </div>

                <div>
                    {gameState === 'ready' ? (
                        <button
                            onClick={handleStartGame}
                            disabled={isLoading || isProcessing || betAmount > balance || betAmount < 0.001}
                            style={{
                                width: '100%',
                                padding: '16px',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: (isLoading || isProcessing || betAmount > balance || betAmount < 0.001) ? 'not-allowed' : 'pointer',
                                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                                color: 'white',
                                opacity: (isLoading || isProcessing || betAmount > balance || betAmount < 0.001) ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {isProcessing ? (
                                <>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid rgba(255, 255, 255, 0.3)',
                                        borderRadius: '50%',
                                        borderTopColor: 'white',
                                        animation: 'spin 1s linear infinite'
                                    }}></span>
                                    Starting Game...
                                </>
                            ) : (
                                <>
                                    🎮 Start Game ({betAmount} APT)
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleEndGame}
                            disabled={isLoading || isProcessing}
                            style={{
                                width: '100%',
                                padding: '16px',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: (isLoading || isProcessing) ? 'not-allowed' : 'pointer',
                                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                                color: 'white',
                                opacity: (isLoading || isProcessing) ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {isProcessing ? (
                                <>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid rgba(255, 255, 255, 0.3)',
                                        borderRadius: '50%',
                                        borderTopColor: 'white',
                                        animation: 'spin 1s linear infinite'
                                    }}></span>
                                    Ending Game...
                                </>
                            ) : (
                                <>
                                    🏁 End Game (P&L: {pnl > 0 ? '+' : ''}{pnl.toFixed(4)} APT)
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div style={{
                    background: 'rgba(255, 0, 0, 0.1)',
                    border: '1px solid rgba(255, 0, 0, 0.3)',
                    color: '#ffcdd2',
                    padding: '12px',
                    borderRadius: '8px',
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
} 
