import { AptosWalletProvider } from '../providers/AptosWalletProvider';
import { WalletConnect } from '../components/WalletConnect';
import { AptosConnectionTest } from '../components/AptosConnectionTest';
import { SmartContractTest } from '../components/SmartContractTest';

export function AptosTestPage() {
  return (
    <AptosWalletProvider>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        width: '95%'
      }}>
        <h1>🚀 Aptos Integration Test Page</h1>
        <p>This page tests our Aptos wallet connection and blockchain interaction capabilities.</p>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px',
          marginBottom: '20px'
        }}>
          <WalletConnect />
          <AptosConnectionTest />
        </div>
        
        <SmartContractTest />
        
      </div>
    </AptosWalletProvider>
  );
}