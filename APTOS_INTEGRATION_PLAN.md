# Aptos Blockchain Integration Plan for Cash Trading Game

## Overview

This document outlines a comprehensive implementation plan for integrating Aptos blockchain functionality into the cash trading game, enabling real APT betting, wallet connectivity, on-chain verification, and secure withdrawals.

## Development Environment Strategy

### Testing Environments

1. **Local Development (Phase 1)**
   - **Aptos Localnet**: Run isolated blockchain instance on local machine
   - **Mock APT**: Use local faucet for unlimited test tokens
   - **No External Dependencies**: Complete offline development
   - **Data Persistence**: No data resets during development

2. **Testnet Integration (Phase 2)**
   - **Aptos Testnet**: Shared testing environment with persistent data
   - **Free Test APT**: Via official Aptos testnet faucet
   - **Wallet Testing**: Real wallet connections with test tokens
   - **Contract Deployment**: Deploy and test smart contracts

3. **Production Deployment (Phase 3)**
   - **Aptos Mainnet**: Live blockchain with real APT
   - **Real Value Transactions**: Actual monetary stakes
   - **Security Audits**: Contract verification and auditing

### Network Comparison

| Feature | Localnet | Testnet | Mainnet |
|---------|----------|---------|---------|
| **Data Persistence** | Until restart | Permanent | Permanent |
| **Token Value** | None | None | Real |
| **Reset Frequency** | Manual | Never | Never |
| **Development Speed** | Fastest | Fast | Slow |
| **Faucet Access** | Unlimited | Free | None |

## Implementation Plan

### Phase 1: Wallet Connection Infrastructure

#### 1.1 Install Dependencies
```bash
npm install @aptos-labs/wallet-adapter-react
npm install @aptos-labs/wallet-adapter-petra
npm install @aptos-labs/wallet-adapter-martian
npm install @aptos-labs/ts-sdk
```

#### 1.2 Wallet Provider Setup
```tsx
// src/providers/AptosWalletProvider.tsx
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PetraWallet } from "petra-wallet-adapter";
import { MartianWallet } from "@martianwallet/wallet-adapter";

const wallets = [
  new PetraWallet(),
  new MartianWallet()
];

export function AptosWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <AptosWalletAdapterProvider 
      plugins={wallets}
      autoConnect={true}
      dappConfig={{
        network: process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet'
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
```

#### 1.3 Wallet Connection Component
```tsx
// src/components/WalletConnect.tsx
import { useWallet } from "@aptos-labs/wallet-adapter-react";

export function WalletConnect() {
  const { 
    account, 
    connected, 
    connect, 
    disconnect, 
    wallet 
  } = useWallet();

  return (
    <div className="wallet-connect">
      {connected ? (
        <div>
          <p>Connected: {account?.address.slice(0, 6)}...{account?.address.slice(-4)}</p>
          <p>Wallet: {wallet?.name}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={() => connect("Petra")}>Connect Petra Wallet</button>
      )}
    </div>
  );
}
```

### Phase 2: Smart Contract Development

#### 2.1 Game Contract Architecture
```move
// contracts/sources/cash_trading_game.move
module cash_trading_game::game {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::randomness;

    // Game round structure
    struct GameRound has key, store {
        id: u64,
        player: address,
        seed: vector<u8>,
        bet_amount: u64,
        candle_config: CandleConfig,
        start_time: u64,
        end_time: u64,
        final_price: u64,
        pnl: i64,
        status: u8, // 0: active, 1: completed, 2: liquidated
    }

    struct CandleConfig has store {
        initial_price: u64,
        total_candles: u64,
        interval_ms: u64,
        fairness_version: u8,
    }

    // Player state
    struct PlayerState has key {
        active_rounds: vector<u64>,
        total_winnings: u64,
        total_losses: u64,
        games_played: u64,
    }

    // Game events
    struct GameStartEvent has drop, store {
        round_id: u64,
        player: address,
        bet_amount: u64,
        seed: vector<u8>,
    }

    struct GameEndEvent has drop, store {
        round_id: u64,
        player: address,
        final_pnl: i64,
        final_price: u64,
    }

    // Initialize game for player
    public entry fun initialize_player(account: &signer) {
        let player_addr = signer::address_of(account);
        if (!exists<PlayerState>(player_addr)) {
            move_to(account, PlayerState {
                active_rounds: vector::empty(),
                total_winnings: 0,
                total_losses: 0,
                games_played: 0,
            });
        }
    }

    // Start new game round
    public entry fun start_game(
        account: &signer,
        bet_amount: u64
    ) acquires PlayerState {
        let player_addr = signer::address_of(account);
        
        // Transfer bet amount to contract
        coin::transfer<AptosCoin>(account, @cash_trading_game, bet_amount);
        
        // Generate deterministic seed
        let seed = randomness::u8_range(0, 255);
        let round_id = get_next_round_id();
        
        // Create game round
        let config = CandleConfig {
            initial_price: 100000000, // $100.00 in fixed point
            total_candles: 460,
            interval_ms: 65,
            fairness_version: 2,
        };

        let game_round = GameRound {
            id: round_id,
            player: player_addr,
            seed: vector::singleton(seed),
            bet_amount,
            candle_config: config,
            start_time: aptos_framework::timestamp::now_microseconds(),
            end_time: 0,
            final_price: 0,
            pnl: 0,
            status: 0,
        };

        // Store round and update player state
        move_to(account, game_round);
        let player_state = borrow_global_mut<PlayerState>(player_addr);
        vector::push_back(&mut player_state.active_rounds, round_id);

        // Emit event
        0x1::event::emit(GameStartEvent {
            round_id,
            player: player_addr,
            bet_amount,
            seed: vector::singleton(seed),
        });
    }

    // Complete game round
    public entry fun complete_game(
        account: &signer,
        round_id: u64,
        final_price: u64,
        trades: vector<Trade>
    ) acquires GameRound, PlayerState {
        let player_addr = signer::address_of(account);
        let game_round = borrow_global_mut<GameRound>(player_addr);
        
        // Verify round ownership
        assert!(game_round.player == player_addr, 1);
        assert!(game_round.id == round_id, 2);
        assert!(game_round.status == 0, 3);

        // Calculate final PnL
        let pnl = calculate_final_pnl(trades, game_round.bet_amount);
        
        // Update game round
        game_round.end_time = aptos_framework::timestamp::now_microseconds();
        game_round.final_price = final_price;
        game_round.pnl = pnl;
        game_round.status = 1;

        // Process winnings/losses
        if (pnl > 0) {
            let winnings = (pnl as u64);
            coin::transfer<AptosCoin>(@cash_trading_game, player_addr, winnings);
        }

        // Update player state
        let player_state = borrow_global_mut<PlayerState>(player_addr);
        let (found, index) = vector::index_of(&player_state.active_rounds, &round_id);
        if (found) {
            vector::remove(&mut player_state.active_rounds, index);
        }
        player_state.games_played = player_state.games_played + 1;

        // Emit completion event
        0x1::event::emit(GameEndEvent {
            round_id,
            player: player_addr,
            final_pnl: pnl,
            final_price,
        });
    }
}
```

#### 2.2 TypeScript Contract Integration
```typescript
// src/contracts/GameContract.ts
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

export class GameContract {
  private aptos: Aptos;
  private moduleAddress: string;

  constructor(network: Network = Network.TESTNET) {
    const config = new AptosConfig({ network });
    this.aptos = new Aptos(config);
    this.moduleAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
  }

  async startGame(
    account: any,
    signAndSubmitTransaction: any,
    betAmount: number
  ): Promise<string> {
    const transaction = {
      data: {
        function: `${this.moduleAddress}::game::start_game`,
        functionArguments: [betAmount * 100000000], // Convert to octas
      },
    };

    const response = await signAndSubmitTransaction(transaction);
    await this.aptos.waitForTransaction({ transactionHash: response.hash });
    return response.hash;
  }

  async completeGame(
    account: any,
    signAndSubmitTransaction: any,
    roundId: number,
    finalPrice: number,
    trades: any[]
  ): Promise<string> {
    const transaction = {
      data: {
        function: `${this.moduleAddress}::game::complete_game`,
        functionArguments: [roundId, finalPrice, trades],
      },
    };

    const response = await signAndSubmitTransaction(transaction);
    await this.aptos.waitForTransaction({ transactionHash: response.hash });
    return response.hash;
  }

  async getPlayerState(playerAddress: string) {
    try {
      const resource = await this.aptos.getAccountResource({
        accountAddress: playerAddress,
        resourceType: `${this.moduleAddress}::game::PlayerState`,
      });
      return resource.data;
    } catch (error) {
      return null;
    }
  }

  async getGameRound(playerAddress: string, roundId: number) {
    try {
      const resource = await this.aptos.getAccountResource({
        accountAddress: playerAddress,
        resourceType: `${this.moduleAddress}::game::GameRound`,
      });
      return resource.data;
    } catch (error) {
      return null;
    }
  }
}
```

### Phase 3: Game Flow Integration

#### 3.1 Modified Game Hook
```typescript
// src/hooks/useAptosGame.ts
import { useState, useEffect } from 'react';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { GameContract } from '../contracts/GameContract';

export function useAptosGame() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [gameContract] = useState(() => new GameContract());
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [playerState, setPlayerState] = useState<any>(null);

  // Start new game with APT bet
  const startGame = async (betAmountAPT: number) => {
    if (!connected || !account) throw new Error("Wallet not connected");
    
    const txHash = await gameContract.startGame(
      account,
      signAndSubmitTransaction,
      betAmountAPT
    );
    
    // Wait for transaction and fetch updated state
    await refreshPlayerState();
    return txHash;
  };

  // Complete current game
  const completeGame = async (finalPrice: number, trades: any[]) => {
    if (!currentRound) throw new Error("No active game");
    
    const txHash = await gameContract.completeGame(
      account,
      signAndSubmitTransaction,
      currentRound.id,
      finalPrice,
      trades
    );
    
    setCurrentRound(null);
    await refreshPlayerState();
    return txHash;
  };

  // Refresh player state from blockchain
  const refreshPlayerState = async () => {
    if (!account) return;
    
    const state = await gameContract.getPlayerState(account.address);
    setPlayerState(state);
  };

  useEffect(() => {
    if (connected && account) {
      refreshPlayerState();
    }
  }, [connected, account]);

  return {
    startGame,
    completeGame,
    refreshPlayerState,
    currentRound,
    playerState,
    connected,
    account
  };
}
```

#### 3.2 UI Integration Components

```tsx
// src/components/AptosGameInterface.tsx
import React, { useState } from 'react';
import { useAptosGame } from '../hooks/useAptosGame';
import { WalletConnect } from './WalletConnect';

export function AptosGameInterface() {
  const [betAmount, setBetAmount] = useState(0.1);
  const [isStarting, setIsStarting] = useState(false);
  const { 
    startGame, 
    completeGame, 
    connected, 
    account, 
    playerState 
  } = useAptosGame();

  const handleStartGame = async () => {
    setIsStarting(true);
    try {
      const txHash = await startGame(betAmount);
      console.log('Game started, tx:', txHash);
    } catch (error) {
      console.error('Failed to start game:', error);
    } finally {
      setIsStarting(false);
    }
  };

  if (!connected) {
    return (
      <div className="aptos-game-interface">
        <h2>Connect Wallet to Play</h2>
        <WalletConnect />
      </div>
    );
  }

  return (
    <div className="aptos-game-interface">
      <div className="wallet-info">
        <p>Connected: {account?.address.slice(0, 6)}...{account?.address.slice(-4)}</p>
        {playerState && (
          <div className="player-stats">
            <p>Games Played: {playerState.games_played}</p>
            <p>Total Winnings: {playerState.total_winnings / 100000000} APT</p>
          </div>
        )}
      </div>
      
      <div className="bet-controls">
        <label>
          Bet Amount (APT):
          <input 
            type="number" 
            value={betAmount} 
            onChange={(e) => setBetAmount(parseFloat(e.target.value))}
            min="0.01"
            step="0.01"
          />
        </label>
        <button 
          onClick={handleStartGame} 
          disabled={isStarting}
        >
          {isStarting ? 'Starting Game...' : `Start Game (${betAmount} APT)`}
        </button>
      </div>
    </div>
  );
}
```

### Phase 4: On-Chain Verification System

#### 4.1 Fairness Verification
```typescript
// src/utils/aptosVerification.ts
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { generateCandleDigest, verifyCandleDigest } from './seededCandles';

export class AptosVerification {
  private aptos: Aptos;

  constructor(network: any) {
    const config = new AptosConfig({ network });
    this.aptos = new Aptos(config);
  }

  // Verify game round on-chain
  async verifyGameRound(roundId: string, playerAddress: string): Promise<boolean> {
    try {
      // Fetch game round from blockchain
      const events = await this.aptos.getAccountEventsByEventType({
        accountAddress: playerAddress,
        eventType: "GameStartEvent",
      });

      const gameEvent = events.find(e => e.data.round_id === roundId);
      if (!gameEvent) return false;

      // Extract seed and config from blockchain
      const { seed, candle_config } = gameEvent.data;
      
      // Generate expected candles
      const seedHex = '0x' + Buffer.from(seed).toString('hex');
      const expectedDigest = generateCandleDigest(seedHex, candle_config);
      
      // Verify digest matches
      return verifyCandleDigest(seedHex, candle_config, expectedDigest);
    } catch (error) {
      console.error('Verification failed:', error);
      return false;
    }
  }

  // Get all player games for audit
  async getPlayerGameHistory(playerAddress: string): Promise<any[]> {
    const events = await this.aptos.getAccountEventsByEventType({
      accountAddress: playerAddress,
      eventType: "GameStartEvent",
    });

    return events.map(event => ({
      roundId: event.data.round_id,
      betAmount: event.data.bet_amount,
      seed: event.data.seed,
      timestamp: event.data.timestamp,
      verified: false // To be computed
    }));
  }
}
```

#### 4.2 Automated Verification Component
```tsx
// src/components/GameVerification.tsx
import React, { useState, useEffect } from 'react';
import { AptosVerification } from '../utils/aptosVerification';

export function GameVerification({ playerAddress }: { playerAddress: string }) {
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [verificationResults, setVerificationResults] = useState<Map<string, boolean>>(new Map());
  const [isVerifying, setIsVerifying] = useState(false);

  const verification = new AptosVerification();

  const verifyAllGames = async () => {
    setIsVerifying(true);
    const history = await verification.getPlayerGameHistory(playerAddress);
    setGameHistory(history);

    const results = new Map();
    for (const game of history) {
      const isValid = await verification.verifyGameRound(game.roundId, playerAddress);
      results.set(game.roundId, isValid);
    }
    
    setVerificationResults(results);
    setIsVerifying(false);
  };

  return (
    <div className="game-verification">
      <h3>Game Verification</h3>
      <button onClick={verifyAllGames} disabled={isVerifying}>
        {isVerifying ? 'Verifying...' : 'Verify All Games'}
      </button>
      
      <div className="verification-results">
        {gameHistory.map(game => (
          <div key={game.roundId} className="game-result">
            <span>Round {game.roundId}</span>
            <span>Bet: {game.betAmount / 100000000} APT</span>
            <span className={verificationResults.get(game.roundId) ? 'verified' : 'unverified'}>
              {verificationResults.has(game.roundId) 
                ? (verificationResults.get(game.roundId) ? '✅ Verified' : '❌ Invalid')
                : '⏳ Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Phase 5: Withdrawal System

#### 5.1 Withdrawal Contract Function
```move
// Addition to cash_trading_game.move
public entry fun withdraw_winnings(
    account: &signer,
    amount: u64
) acquires PlayerState {
    let player_addr = signer::address_of(account);
    let player_state = borrow_global_mut<PlayerState>(player_addr);
    
    // Verify player has sufficient winnings
    assert!(player_state.total_winnings >= amount, 4);
    
    // Transfer winnings to player
    coin::transfer<AptosCoin>(@cash_trading_game, player_addr, amount);
    
    // Update player state
    player_state.total_winnings = player_state.total_winnings - amount;
}
```

#### 5.2 Withdrawal UI Component
```tsx
// src/components/WithdrawalInterface.tsx
import React, { useState } from 'react';
import { useAptosGame } from '../hooks/useAptosGame';

export function WithdrawalInterface() {
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { playerState, account, signAndSubmitTransaction } = useAptosGame();

  const handleWithdraw = async () => {
    if (!account || !playerState) return;
    
    setIsWithdrawing(true);
    try {
      const transaction = {
        data: {
          function: `${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}::game::withdraw_winnings`,
          functionArguments: [withdrawAmount * 100000000], // Convert to octas
        },
      };

      const response = await signAndSubmitTransaction(transaction);
      console.log('Withdrawal successful:', response.hash);
      setWithdrawAmount(0);
    } catch (error) {
      console.error('Withdrawal failed:', error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const availableWinnings = playerState?.total_winnings / 100000000 || 0;

  return (
    <div className="withdrawal-interface">
      <h3>Withdraw Winnings</h3>
      <p>Available: {availableWinnings.toFixed(4)} APT</p>
      
      <div className="withdrawal-controls">
        <input
          type="number"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(parseFloat(e.target.value))}
          max={availableWinnings}
          min="0"
          step="0.0001"
          placeholder="Amount to withdraw"
        />
        <button 
          onClick={handleWithdraw}
          disabled={isWithdrawing || withdrawAmount <= 0 || withdrawAmount > availableWinnings}
        >
          {isWithdrawing ? 'Processing...' : 'Withdraw'}
        </button>
      </div>
      
      <button onClick={() => setWithdrawAmount(availableWinnings)}>
        Withdraw All
      </button>
    </div>
  );
}
```

## Development Roadmap

### Sprint 1: Local Development Setup (Week 1-2)
- [ ] Set up Aptos localnet
- [x] Install wallet adapter dependencies
- [x] Create basic wallet connection UI
- [x] Create comprehensive test page with connection verification
- [ ] Test wallet connections with local environment

### Sprint 2: Smart Contract Development (Week 3-4)
- [ ] Write Move contracts for game logic
- [ ] Deploy contracts to localnet
- [ ] Create TypeScript contract interfaces
- [ ] Test basic contract interactions

### Sprint 3: Game Integration (Week 5-6)
- [ ] Integrate contracts with existing game logic
- [ ] Implement betting and completion flows
- [ ] Add on-chain verification system
- [ ] Test full game lifecycle locally

### Sprint 4: Testnet Deployment (Week 7-8)
- [ ] Deploy contracts to Aptos testnet
- [ ] Test with real wallet connections
- [ ] Implement comprehensive error handling
- [ ] Performance optimization and testing

### Sprint 5: Production Preparation (Week 9-10)
- [ ] Security audits and testing
- [ ] Mainnet deployment preparation
- [ ] User documentation
- [ ] Beta testing with real users

## Security Considerations

### Smart Contract Security
- **Formal Verification**: Use Move's built-in verification tools
- **Access Control**: Ensure only players can complete their own games
- **Reentrancy Protection**: Built into Move's resource model
- **Integer Overflow**: Move's safe arithmetic prevents overflow

### Frontend Security
- **Seed Verification**: Always verify candle generation matches on-chain seed
- **Transaction Validation**: Validate all transaction parameters before signing
- **User Confirmation**: Clear UI confirmation for all monetary transactions
- **Error Handling**: Graceful handling of wallet disconnections and failed transactions

### Operational Security
- **Private Key Management**: Never expose private keys in frontend code
- **Environment Variables**: Use secure environment variable management
- **Contract Upgrades**: Plan for contract upgrade mechanisms if needed
- **Monitoring**: Implement transaction and error monitoring

## Environment Configuration

### Local Development
```env
# .env.local
NEXT_PUBLIC_APTOS_NETWORK=local
NEXT_PUBLIC_APTOS_NODE_URL=http://localhost:8080
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1
```

### Testnet
```env
# .env.testnet
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
NEXT_PUBLIC_CONTRACT_ADDRESS=0x<deployed_address>
```

### Mainnet
```env
# .env.production
NEXT_PUBLIC_APTOS_NETWORK=mainnet
NEXT_PUBLIC_APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
NEXT_PUBLIC_CONTRACT_ADDRESS=0x<deployed_address>
```

## Testing Strategy

### Unit Tests
- Smart contract function testing
- Frontend component testing
- Wallet connection testing

### Integration Tests
- End-to-end game flow testing
- Cross-wallet compatibility testing
- Network switching testing

### Performance Tests
- Contract gas optimization
- Frontend rendering performance
- Concurrent user testing

### Security Tests
- Contract vulnerability scanning
- Frontend security testing
- Transaction replay attack prevention

## Conclusion

This comprehensive plan provides a structured approach to integrating Aptos blockchain functionality into the cash trading game. The phased approach ensures thorough testing at each stage, from local development through production deployment, while maintaining security and user experience as top priorities.

The integration will transform the game from a demo application into a fully functional decentralized application where users can:
- Connect their Aptos wallets securely
- Place real APT bets on trading outcomes
- Verify game fairness through on-chain data
- Withdraw winnings directly to their wallets
- Audit their complete gaming history on-chain

The Move smart contract architecture ensures security and determinism, while the TypeScript SDK integration provides a smooth user experience that maintains the existing game mechanics while adding real monetary stakes.