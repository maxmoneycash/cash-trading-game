#!/usr/bin/env tsx
/**
 * Direct REST API deployment for CASH contract
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import * as fs from 'fs';

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;

if (!DEPLOYER_PRIVATE_KEY || !BACKEND_PRIVATE_KEY) {
    console.error('❌ Both DEPLOYER_PRIVATE_KEY and BACKEND_PRIVATE_KEY required');
    process.exit(1);
}

async function main() {
    console.log('🚀 Direct API Deployment...');

    const config = new AptosConfig({ network: Network.MAINNET });
    const aptos = new Aptos(config);

    const deployerAccount = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(DEPLOYER_PRIVATE_KEY)
    });

    const backendAccount = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(BACKEND_PRIVATE_KEY)
    });

    console.log(`🔑 Deployer: ${deployerAccount.accountAddress.toString()}`);
    console.log(`🔑 Backend: ${backendAccount.accountAddress.toString()}`);

    try {
        // Check balance first
        const balance = await aptos.getAccountCoinAmount({
            accountAddress: deployerAccount.accountAddress.toString(),
            coinType: "0x1::aptos_coin::AptosCoin"
        });

        console.log(`💰 Balance: ${balance / 100_000_000} APT`);

        // Get the contract bytecode
        const contractCode = fs.readFileSync('/Users/maxmohammadi/cash-trading-game/contracts/sources/cash_simple.move', 'utf8');

        // Use simple package publish
        const transaction = await aptos.publishPackageTransaction({
            account: deployerAccount.accountAddress,
            packageMetadataBytes: new Uint8Array([]), // Empty metadata for now
            moduleBytecode: [new Uint8Array(Buffer.from(contractCode, 'utf8'))],
        });

        const response = await aptos.signAndSubmitTransaction({
            signer: deployerAccount,
            transaction,
        });

        await aptos.waitForTransaction({ transactionHash: response.hash });

        console.log('✅ Deployment successful!');
        console.log(`🔗 Transaction: ${response.hash}`);
        console.log(`📜 Contract: ${deployerAccount.accountAddress.toString()}`);

    } catch (error: any) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

main();
