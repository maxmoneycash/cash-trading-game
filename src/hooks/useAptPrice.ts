import { useState, useEffect } from 'react';

interface AptPrice {
  usd: number;
  lastUpdated: Date;
}

export function useAptPrice() {
  const [aptPrice, setAptPrice] = useState<AptPrice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAptPrice = async () => {
    try {
      setError(null);

      // Use CoinGecko's free API to get APT price in USD
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=aptos&vs_currencies=usd&include_last_updated_at=true'
      );

      if (!response.ok) {
        throw new Error(`Price fetch failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.aptos && data.aptos.usd) {
        setAptPrice({
          usd: data.aptos.usd,
          lastUpdated: new Date(data.aptos.last_updated_at * 1000)
        });
      } else {
        throw new Error('Invalid price data received');
      }
    } catch (err) {
      console.error('Failed to fetch APT price:', err);
      setError((err as any)?.message || 'Failed to fetch price');
      // Fallback to a reasonable default price if API fails
      setAptPrice({
        usd: 4.50, // Reasonable fallback based on current market
        lastUpdated: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch price on mount and then every 5 minutes
  useEffect(() => {
    fetchAptPrice();

    const interval = setInterval(fetchAptPrice, 5 * 60 * 1000); // Update every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Manual refresh function
  const refreshPrice = () => {
    setIsLoading(true);
    fetchAptPrice();
  };

  return {
    aptPrice: aptPrice?.usd || 4.50, // Default fallback
    lastUpdated: aptPrice?.lastUpdated,
    isLoading,
    error,
    refreshPrice
  };
}