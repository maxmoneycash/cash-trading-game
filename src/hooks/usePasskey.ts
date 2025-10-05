import { useState, useEffect, useCallback } from 'react';
import {
    createPasskey,
    getCredentialInfo,
    createPasskeySignFunction,
    getAptBalance,
    requestFaucet,
} from '../utils/passkey-webauthn';
import { gameContract } from '../contracts/GameContract';

interface PasskeyCredential {
    id: string;
    type: string;
    publicKey: {
        base64: string;
        hex: string;
        aptosAddress: string;
    };
}

export function usePasskey() {
    const [isPasskeySupported, setIsPasskeySupported] = useState(false);
    const [credential, setCredential] = useState<PasskeyCredential | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [balance, setBalance] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check if passkeys are supported
    useEffect(() => {
        const checkSupport = () => {
            const supported = !!(
                window.PublicKeyCredential &&
                window.navigator.credentials &&
                typeof window.navigator.credentials.create === 'function'
            );
            setIsPasskeySupported(supported);
        };

        checkSupport();
    }, []);

    // Load saved credential from localStorage
    useEffect(() => {
        const savedCredential = localStorage.getItem('passkeyCredentialData');
        if (savedCredential) {
            try {
                const cred = JSON.parse(savedCredential);
                setCredential(cred);
                setIsConnected(true);
                fetchBalance(cred.publicKey.aptosAddress);
            } catch (error) {
                console.error('Failed to load saved credential:', error);
                localStorage.removeItem('passkeyCredentialData');
            }
        }
    }, []);

    const fetchBalance = useCallback(async (address: string) => {
        try {
            const bal = await getAptBalance(address);
            setBalance(bal);
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            setBalance(0);
        }
    }, []);

    const createNewPasskey = async (): Promise<boolean> => {
        if (!isPasskeySupported) {
            setError('Passkeys are not supported in this browser');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            const newCredential = await createPasskey();
            if (!newCredential) {
                throw new Error('Failed to create passkey');
            }

            const credentialInfo = getCredentialInfo(newCredential as PublicKeyCredential);

            // Save to localStorage
            localStorage.setItem('passkeyCredentialData', JSON.stringify(credentialInfo));

            setCredential(credentialInfo);
            setIsConnected(true);

            // Fetch initial balance
            await fetchBalance(credentialInfo.publicKey.aptosAddress);

            console.log('Passkey created successfully:', credentialInfo);
            return true;
        } catch (error: any) {
            console.error('Failed to create passkey:', error);
            setError(error.message || 'Failed to create passkey');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const disconnect = () => {
        localStorage.removeItem('passkeyCredentialData');
        setCredential(null);
        setIsConnected(false);
        setBalance(0);
        setError(null);
    };

    const refreshBalance = async () => {
        if (credential) {
            await fetchBalance(credential.publicKey.aptosAddress);
        }
    };

    // Update demo balance (for passkey demo)
    const updateDemoBalance = (address: string, change: number) => {
        const storageKey = `passkey_demo_balance_${address}`;
        const currentBalance = parseFloat(localStorage.getItem(storageKey) || '10');
        const newBalance = Math.max(0, currentBalance + change);
        localStorage.setItem(storageKey, newBalance.toString());
        setBalance(newBalance);
    };

    const requestTestTokens = async (): Promise<boolean> => {
        if (!credential) {
            setError('No passkey connected');
            return false;
        }

        setIsLoading(true);
        try {
            await requestFaucet(credential.publicKey.aptosAddress);

            // Wait a moment for transaction to process
            setTimeout(() => {
                refreshBalance();
            }, 2000);

            return true;
        } catch (error: any) {
            console.error('Failed to request tokens:', error);
            setError(error.message || 'Failed to request test tokens');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Create a passkey-compatible signAndSubmitTransaction function
    const createSignFunction = useCallback(() => {
        if (!credential) return null;

        return createPasskeySignFunction(credential.id, credential);
    }, [credential]);

    // Start game using passkey (compatible with existing GameContract)
    const startGame = async (betAmountAPT: number, seed?: string): Promise<string> => {
        if (!credential) {
            throw new Error('No passkey connected');
        }

        const signFunction = createSignFunction();
        if (!signFunction) {
            throw new Error('Failed to create sign function');
        }

        setIsLoading(true);
        try {
            // For passkey demo, we'll bypass the GameContract's waitForTransaction
            const betAmountOctas = Math.floor(betAmountAPT * 100000000);

            const functionArguments: string[] = [betAmountOctas.toString()];
            const supportsSeedArgument = import.meta.env.VITE_APTOS_START_ACCEPTS_SEED === 'true';
            if (supportsSeedArgument && seed) {
                const seedHex = seed.startsWith('0x') ? seed : `0x${seed}`;
                functionArguments.push(seedHex);
            }

            const transaction = {
                data: {
                    function: `${gameContract.getContractAddress()}::game::start_game`,
                    functionArguments,
                },
                options: {
                    maxGasAmount: 20000,
                    gasUnitPrice: 100,
                }
            };

            // Sign with passkey (returns mock transaction)
            const response = await signFunction(transaction);

            console.log('Game started with passkey transaction:', response.hash);

            // Update demo balance - deduct bet amount
            updateDemoBalance(credential.publicKey.aptosAddress, -betAmountAPT);

            return response.hash;
        } catch (error: any) {
            console.error('Failed to start game:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Complete game using passkey
    const completeGame = async (
        seed: string,
        isProfit: boolean,
        amountAPT: number
    ): Promise<string> => {
        if (!credential) {
            throw new Error('No passkey connected');
        }

        const signFunction = createSignFunction();
        if (!signFunction) {
            throw new Error('Failed to create sign function');
        }

        setIsLoading(true);
        try {
            // For passkey demo, we'll bypass the GameContract's waitForTransaction
            const amountOctas = Math.floor(amountAPT * 100000000);
            const seedHex = seed.startsWith('0x') ? seed : `0x${seed}`;

            const transaction = {
                data: {
                    function: `${gameContract.getContractAddress()}::game::complete_game`,
                    functionArguments: [seedHex, isProfit, amountOctas.toString()],
                },
                options: {
                    maxGasAmount: 20000,
                    gasUnitPrice: 100,
                }
            };

            // Sign with passkey (returns mock transaction)
            const response = await signFunction(transaction);

            console.log('Game completed with passkey transaction:', response.hash);

            // Update demo balance based on profit/loss
            const balanceChange = isProfit ? amountAPT : -amountAPT;
            updateDemoBalance(credential.publicKey.aptosAddress, balanceChange);

            return response.hash;
        } catch (error: any) {
            console.error('Failed to complete game:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        // State
        isPasskeySupported,
        isConnected,
        credential,
        balance,
        isLoading,
        error,

        // Actions
        createNewPasskey,
        disconnect,
        refreshBalance,
        requestTestTokens,
        startGame,
        completeGame,

        // Computed values
        address: credential?.publicKey.aptosAddress || null,
        account: credential ? { address: { toString: () => credential.publicKey.aptosAddress } } : null,

        // Wallet adapter compatibility
        connected: isConnected,
        signAndSubmitTransaction: createSignFunction(),
    };
} 
