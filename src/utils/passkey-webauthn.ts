/* eslint-disable @typescript-eslint/no-explicit-any */
import { sha3_256 } from "@noble/hashes/sha3";
import { p256 } from '@noble/curves/p256';
import { Buffer } from "buffer";
import {
    AptosConfig,
    Aptos,
    Network,
    Hex,
} from "@aptos-labs/ts-sdk";
import { parseAuthenticatorData, convertCOSEtoPKCS } from "@simplewebauthn/server/helpers";

// Use the same network setup as the existing codebase
const aptos = new Aptos(new AptosConfig({ network: Network.DEVNET }));

// WebAuthn configuration
const defaultRp = {
    id: window.location.hostname,
    name: "Cash Trading Game",
};

const defaultPubKeyCredParams = [{
    type: "public-key" as const,
    alg: -7, // ECDSA P-256
}];

const defaultUser = {
    name: "Cash Trading Game Player",
    displayName: "Player",
    id: new Uint8Array(32), // Will be filled with random data
};

const defaultAuthenticatorSelection = {
    userVerification: "required" as const,
    residentKey: "preferred" as const,
    authenticatorAttachment: "platform" as const,
};

/**
 * Create a new passkey credential
 */
export async function createPasskey(): Promise<Credential | null> {
    // Generate random user ID
    crypto.getRandomValues(defaultUser.id);

    // Generate random challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const publicKeyCreationOptions = {
        rp: defaultRp,
        user: defaultUser,
        challenge: challenge.buffer,
        pubKeyCredParams: defaultPubKeyCredParams,
        authenticatorSelection: defaultAuthenticatorSelection,
        extensions: {},
    };

    return await navigator.credentials.create({
        publicKey: publicKeyCreationOptions,
    });
}

/**
 * Get credential for signing
 */
export async function getPasskeyCredential(
    allowCredentials: PublicKeyCredentialDescriptor[],
    challenge: ArrayBuffer
): Promise<PublicKeyCredential> {
    const publicKey = {
        challenge,
        allowCredentials,
        extensions: {},
    };

    return (await navigator.credentials.get({
        publicKey,
    })) as PublicKeyCredential;
}

/**
 * Extract public key from credential
 */
export function parsePublicKey(credential: PublicKeyCredential): Uint8Array {
    const authData = Buffer.from(
        new Uint8Array((credential.response as AuthenticatorAttestationResponse).getAuthenticatorData())
    );
    const parsedAuthenticatorData = parseAuthenticatorData(authData);
    return convertCOSEtoPKCS(parsedAuthenticatorData.credentialPublicKey!);
}

/**
 * Calculate Aptos address from public key (simplified version)
 */
export function calculateAptosAddress(publicKeyBytes: Uint8Array): string {
    try {
        if (publicKeyBytes.length !== 65) {
            throw new Error(`Incorrect public key length: ${publicKeyBytes.length}, should be 65 bytes`);
        }

        if (publicKeyBytes[0] !== 0x04) {
            throw new Error(`Incorrect public key format: first byte should be 0x04`);
        }

        // For now, create a deterministic address from the public key
        // This is a simplified version - in production you'd use the full Aptos derivation
        const hash = sha3_256(publicKeyBytes);
        const addressBytes = hash.slice(0, 32);
        return `0x${Buffer.from(addressBytes).toString('hex')}`;
    } catch (error) {
        console.error('Failed to calculate Aptos address:', error);
        throw error;
    }
}

/**
 * Get complete credential information
 */
export function getCredentialInfo(credential: PublicKeyCredential) {
    try {
        const publickey = parsePublicKey(credential);

        return {
            id: Buffer.from(credential.rawId).toString("base64"),
            type: credential.type,
            publicKey: {
                base64: Buffer.from(publickey).toString("base64"),
                hex: Buffer.from(publickey).toString("hex"),
                aptosAddress: calculateAptosAddress(publickey)
            },
            rawData: publickey
        };
    } catch (error) {
        console.error('Failed to get credential information:', error);
        throw error;
    }
}

/**
 * Normalize signature S value
 */
function normalizeS(sigBytes: Uint8Array): Uint8Array {
    const sig = p256.Signature.fromBytes(sigBytes, 'der');

    if (!sig.hasHighS()) return sig.toBytes('compact');

    const sLow = p256.Point.Fn.neg(sig.s);
    const rec = sig.recovery != null ? (sig.recovery ^ 1) : undefined;
    const normalized = new p256.Signature(sig.r, sLow, rec);
    return normalized.toBytes('compact');
}

/**
 * Create a passkey-compatible signAndSubmitTransaction function
 * This mimics the wallet adapter interface but uses passkey signing
 */
export function createPasskeySignFunction(credentialId: string, credentialData: any) {
    return async (transaction: any) => {
        console.log('🔐 Signing transaction with passkey...');
        console.log('Transaction details:', transaction);

        try {
            // In a real implementation, this would:
            // 1. Build the transaction from the payload
            // 2. Create signing challenge from the transaction
            // 3. Use WebAuthn to sign with the passkey
            // 4. Submit the signed transaction

            // For now, we'll simulate the transaction submission
            // Generate a proper-looking transaction hash
            const timestamp = Date.now().toString(16);
            const random = Math.random().toString(16).slice(2, 10);
            const mockTxHash = `0x${timestamp}${random}${'0'.repeat(64 - timestamp.length - random.length)}`;

            console.log('✅ Transaction signed with passkey (simulated):', mockTxHash);

            // Wait a bit to simulate transaction processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            return {
                hash: mockTxHash,
                success: true
            };
        } catch (error) {
            console.error('Failed to sign transaction with passkey:', error);
            throw error;
        }
    };
}

/**
 * Get APT balance for address
 */
export async function getAptBalance(address: string): Promise<number> {
    try {
        // For passkey demo, return a mock balance
        // In production, this would query the real blockchain
        console.log('Getting balance for passkey address:', address);

        // Store demo balances in localStorage
        const storageKey = `passkey_demo_balance_${address}`;
        const storedBalance = localStorage.getItem(storageKey);

        if (storedBalance) {
            return parseFloat(storedBalance);
        }

        // Initial demo balance
        const initialBalance = 10.0; // 10 APT for testing
        localStorage.setItem(storageKey, initialBalance.toString());
        return initialBalance;
    } catch (error) {
        console.error("Failed to get APT balance:", error);
        return 0;
    }
}

/**
 * Request APT from faucet (devnet only)
 */
export async function requestFaucet(address: string): Promise<boolean> {
    try {
        // For passkey demo, just add to the demo balance
        console.log('Requesting demo faucet for address:', address);

        const storageKey = `passkey_demo_balance_${address}`;
        const currentBalance = await getAptBalance(address);
        const newBalance = currentBalance + 1.0; // Add 1 APT

        localStorage.setItem(storageKey, newBalance.toString());

        console.log('Demo faucet added 1 APT. New balance:', newBalance);
        return true;
    } catch (error) {
        console.error("Faucet request failed:", error);
        throw error;
    }
} 
