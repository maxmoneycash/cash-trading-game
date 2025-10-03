# Aptos Infrastructure Development Plan

## Overview

This plan outlines a systematic approach to building robust Aptos blockchain infrastructure for the cash trading game, starting with a clean separation between demo and testing environments, then gradually building up to full integration.

## Current State Analysis

### What We Have:
- ✅ Working demo game at `http://localhost:5174/`
- ✅ Basic wallet connection setup
- ✅ Smart contracts deployed to devnet
- ✅ TypeScript contract interfaces

### What Needs Improvement:
- 🔧 Clean separation between demo and test environments
- 🔧 Structured testing infrastructure for Aptos features
- 🔧 Step-by-step integration testing
- 🔧 Clear development workflow

## New URL Structure & Environment Strategy

### 1. Demo Environment (Primary)
**URL**: `http://localhost:5174/`
- **Purpose**: Original game experience, no blockchain
- **Features**: Traditional balance system, local state only
- **Audience**: General users, initial testing, demos
- **Data**: Simulated, resets on refresh

### 2. Aptos Test Environment (Development)
**URL**: `http://localhost:5174/test`
- **Purpose**: Dedicated Aptos development and testing
- **Features**: Wallet connection, contract testing, infrastructure validation
- **Audience**: Developers, blockchain testing
- **Data**: Real devnet transactions, persistent blockchain state

### 3. Future: Aptos Live Environment
**URL**: `http://localhost:5174/live` (future)
- **Purpose**: Full production Aptos integration
- **Features**: Complete game with real APT betting
- **Audience**: End users with real APT
- **Data**: Mainnet transactions, real money

## Phase 1: Environment Separation & Cleanup (Week 1)

### 1.1 Revert Recent Changes
```bash
# Revert the complex balance manager changes
# Return to clean demo game as primary experience
# Remove temporary Aptos integration from main game
```

### 1.2 Clean URL Routing
```typescript
// src/App.tsx - Clean routing structure
const App = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const isTestMode = window.location.pathname === '/test';

  if (isTestMode) {
    return <AptosTestPage />;
  }

  // Default: Demo game (clean, no Aptos)
  return <DemoGame />;
};
```

### 1.3 Separate Components
```
src/
├── components/
│   ├── demo/
│   │   ├── DemoGame.tsx           # Original game, no blockchain
│   │   ├── DemoCandlestickChart.tsx
│   │   └── DemoFooter.tsx
│   ├── test/
│   │   ├── AptosTestPage.tsx      # Dedicated test environment
│   │   ├── WalletTestSection.tsx
│   │   ├── ContractTestSection.tsx
│   │   └── GameTestSection.tsx
│   └── shared/
│       ├── PnlOverlay.tsx         # Shared between demo and test
│       └── ControlCenter/
```

## Phase 2: Aptos Test Infrastructure (Week 2)

### 2.1 Comprehensive Test Page Structure
```typescript
// src/components/test/AptosTestPage.tsx
export function AptosTestPage() {
  const [testStage, setTestStage] = useState('wallet');

  return (
    <div className="aptos-test-page">
      <TestHeader />
      <TestStageSelector current={testStage} onChange={setTestStage} />

      {testStage === 'wallet' && <WalletTestSection />}
      {testStage === 'contract' && <ContractTestSection />}
      {testStage === 'game' && <GameTestSection />}
      {testStage === 'integration' && <IntegrationTestSection />}
    </div>
  );
}
```

### 2.2 Staged Testing Approach

#### Stage 1: Wallet Connection Testing
```typescript
// WalletTestSection.tsx
- ✅ Connect to Petra wallet
- ✅ Display wallet address and balance
- ✅ Test network switching (devnet/testnet)
- ✅ Test wallet disconnection/reconnection
- ✅ Error handling for wallet issues
```

#### Stage 2: Contract Interaction Testing
```typescript
// ContractTestSection.tsx
- ✅ Test startGame() contract call
- ✅ Test completeGame() contract call
- ✅ View contract events and history
- ✅ Test gas estimation and fees
- ✅ Error handling for failed transactions
```

#### Stage 3: Game Logic Testing
```typescript
// GameTestSection.tsx
- ✅ Test game round lifecycle
- ✅ Test P&L calculations
- ✅ Test settlement logic
- ✅ Test multiple rounds
- ✅ Test edge cases (liquidation, etc.)
```

#### Stage 4: Full Integration Testing
```typescript
// IntegrationTestSection.tsx
- ✅ End-to-end game flow
- ✅ Real APT betting with devnet tokens
- ✅ Complete settlement testing
- ✅ Performance and reliability testing
```

### 2.3 Test Infrastructure Components

#### Wallet Test Panel
```typescript
interface WalletTestPanelProps {
  onConnectionChange: (connected: boolean) => void;
}

export function WalletTestPanel({ onConnectionChange }: WalletTestPanelProps) {
  const { connected, account, connect, disconnect } = useWallet();
  const { walletBalance, fetchWalletBalance } = useAptosGameContract();

  return (
    <TestPanel title="Wallet Connection">
      <WalletStatus connected={connected} account={account} />
      <BalanceDisplay balance={walletBalance} />
      <WalletActions onConnect={connect} onDisconnect={disconnect} />
      <TestResults results={getWalletTestResults()} />
    </TestPanel>
  );
}
```

#### Contract Test Panel
```typescript
export function ContractTestPanel() {
  const [testResults, setTestResults] = useState([]);

  const runContractTests = async () => {
    const tests = [
      () => testStartGame(0.1),
      () => testCompleteGame('seed123', true, 0.05),
      () => testGetPlayerHistory(),
      () => testEventSubscription(),
    ];

    const results = [];
    for (const test of tests) {
      try {
        const result = await test();
        results.push({ test: test.name, status: 'pass', result });
      } catch (error) {
        results.push({ test: test.name, status: 'fail', error });
      }
    }

    setTestResults(results);
  };

  return (
    <TestPanel title="Contract Interactions">
      <ContractInfo address={CONTRACT_ADDRESS} />
      <TestRunner onRun={runContractTests} />
      <TestResults results={testResults} />
    </TestPanel>
  );
}
```

## Phase 3: Incremental Game Integration (Week 3)

### 3.1 Isolated Game Components
```typescript
// src/components/test/IsolatedGameTest.tsx
export function IsolatedGameTest() {
  // Test just the game logic without full UI
  // Focus on contract integration
  // Validate P&L calculations
  // Test settlement logic
}
```

### 3.2 Hybrid Testing Environment
```typescript
// Allow switching between demo and contract modes within test page
const [useRealContracts, setUseRealContracts] = useState(false);

// Test the same game logic with both mock and real data
```

### 3.3 Progressive Integration
1. **Game Logic Only**: Test P&L calculations with mock data
2. **Contract Settlement**: Test real blockchain settlements
3. **UI Integration**: Test full UI with contract backend
4. **Performance Testing**: Stress test the integration

## Phase 4: Production Readiness (Week 4)

### 4.1 Environment Configuration
```typescript
// src/config/environments.ts
export const environments = {
  demo: {
    name: 'Demo Mode',
    useBlockchain: false,
    network: null,
    features: ['basic_game', 'local_storage']
  },
  test: {
    name: 'Aptos Testing',
    useBlockchain: true,
    network: 'devnet',
    features: ['wallet_connect', 'contract_calls', 'test_ui']
  },
  live: {
    name: 'Aptos Live',
    useBlockchain: true,
    network: 'mainnet',
    features: ['full_integration', 'real_money']
  }
};
```

### 4.2 Feature Flags
```typescript
// src/utils/featureFlags.ts
export const featureFlags = {
  enableAptosIntegration: () => getCurrentEnvironment() !== 'demo',
  enableRealMoney: () => getCurrentEnvironment() === 'live',
  enableTesting: () => getCurrentEnvironment() === 'test',
  enableAdvancedUI: () => getCurrentEnvironment() !== 'demo'
};
```

### 4.3 Migration Path
```typescript
// Clear path from test to live
// Configuration-driven feature enabling
// Gradual rollout capability
// Easy fallback to demo mode
```

## Development Workflow

### Daily Development Process
1. **Start with Demo**: Ensure core game always works
2. **Test in Isolation**: Use `/test` page for Aptos development
3. **Validate Incrementally**: Each feature tested independently
4. **Integration Testing**: Combine features only when each works alone

### Testing Strategy
```typescript
// Automated test suite for each environment
describe('Demo Environment', () => {
  test('game mechanics work without blockchain');
  test('local state persistence');
  test('UI responsiveness');
});

describe('Test Environment', () => {
  test('wallet connection reliability');
  test('contract interaction success rates');
  test('transaction confirmation handling');
});

describe('Integration Environment', () => {
  test('end-to-end game flow');
  test('error recovery scenarios');
  test('performance under load');
});
```

## Success Metrics

### Phase 1 (Environment Separation)
- ✅ Demo game works perfectly at `/`
- ✅ Test environment accessible at `/test`
- ✅ Clean code separation achieved
- ✅ No interference between environments

### Phase 2 (Test Infrastructure)
- ✅ Reliable wallet connection (>95% success rate)
- ✅ Contract calls work consistently
- ✅ Comprehensive error handling
- ✅ Clear test result reporting

### Phase 3 (Game Integration)
- ✅ Game logic validated with contracts
- ✅ P&L calculations verified on-chain
- ✅ Settlement process tested thoroughly
- ✅ UI performance acceptable (<100ms response)

### Phase 4 (Production Ready)
- ✅ Full end-to-end testing completed
- ✅ Error scenarios handled gracefully
- ✅ Performance optimized for production
- ✅ Clear migration path to mainnet

## Risk Mitigation

### Technical Risks
- **Contract Failures**: Comprehensive error handling and fallbacks
- **Wallet Issues**: Multiple wallet support and clear error messages
- **Network Problems**: Retry logic and user feedback
- **State Corruption**: Clean state management and recovery

### User Experience Risks
- **Confusion**: Clear environment indicators and instructions
- **Performance**: Isolated testing prevents main game degradation
- **Loss of Funds**: Start with minimal amounts, clear warnings

## Conclusion

This phased approach ensures:
1. **Stability**: Demo game remains unaffected during development
2. **Clarity**: Each environment has a clear purpose
3. **Testability**: Each feature can be validated independently
4. **Scalability**: Clean architecture supports future expansion
5. **Safety**: Risk is isolated to test environments

The key insight is to separate concerns completely: keep the demo game pristine while building robust Aptos infrastructure in parallel, then combine them only when both are rock-solid.