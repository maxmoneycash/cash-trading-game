import { AptosWalletProvider } from '../providers/AptosWalletProvider';
import { SimplifiedAptosTest } from '../components/test/SimplifiedAptosTest';

export function AptosTestPage() {
  return (
    <AptosWalletProvider>
      <SimplifiedAptosTest />
    </AptosWalletProvider>
  );
}
