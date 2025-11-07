#!/usr/bin/env tsx
/**
 * Deploy CASH Trading Game Contract with Resource Account
 * 
 * This script deploys the new cash_liquidity.move contract and sets up:
 * 1. Resource account for house treasury
 * 2. Backend authorization
 * 3. Initial house funding
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const APTOS_NETWORK = (process.env.APTOS_NETWORK?.toUpperCase() as keyof typeof Network) || 'DEVNET';
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;
const INITIAL_HOUSE_FUNDING = parseFloat(process.env.INITIAL_HOUSE_FUNDING || '10000'); // 10k CASH
const CASH_TOKEN_ADDRESS = "0x61ed8b048636516b4eaf4c74250fa4f9440d9c3e163d96aeb863fe658a4bdc67::CASH::CASH";

if (!DEPLOYER_PRIVATE_KEY) {
    console.error('❌ DEPLOYER_PRIVATE_KEY environment variable is required');
    process.exit(1);
}

if (!BACKEND_PRIVATE_KEY) {
    console.error('❌ BACKEND_PRIVATE_KEY environment variable is required');
    process.exit(1);
}

async function main() {
    console.log('🚀 Starting CASH Trading Game deployment...');
    console.log(`🔗 Network: ${APTOS_NETWORK}`);

    // Initialize Aptos client
    const config = new AptosConfig({ network: Network[APTOS_NETWORK] });
    const aptos = new Aptos(config);

    // Initialize accounts
    const deployerAccount = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(DEPLOYER_PRIVATE_KEY)
    });

    const backendAccount = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(BACKEND_PRIVATE_KEY)
    });

    console.log(`🔑 Deployer: ${deployerAccount.accountAddress.toString()}`);
    console.log(`🔑 Backend: ${backendAccount.accountAddress.toString()}`);

    try {
        // Step 1: Compile and publish the contract
        console.log('\n📦 Step 1: Publishing contract...');

        // Build the move package
        const packageMetadata = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../contracts/build/CashTradingGame/package-metadata.json'), 'utf8')
        );

        const bytecode = fs.readFileSync(
            path.join(__dirname, '../contracts/build/CashTradingGame/bytecode_modules/cash_simple.mv')
        );

        const transaction = await aptos.publishPackageTransaction({
            account: deployerAccount.accountAddress,
            metadataBytes: packageMetadata.source_digest,
            moduleBytecode: [bytecode],
        });

        const publishResponse = await aptos.signAndSubmitTransaction({
            signer: deployerAccount,
            transaction,
        });

        await aptos.waitForTransaction({ transactionHash: publishResponse.hash });

        const contractAddress = deployerAccount.accountAddress.toString();
        console.log(`✅ Contract published at: ${contractAddress}`);
        console.log(`🔗 View on explorer: https://explorer.aptoslabs.com/account/${contractAddress}?network=${APTOS_NETWORK.toLowerCase()}`);

        // Step 2: Get the resource account address
        console.log('\n🏦 Step 2: Getting resource account address...');

        const [treasuryAddress] = await aptos.view({
            payload: {
                function: `${contractAddress}::cash_simple::get_treasury_address`,
                functionArguments: [],
            },
        });

        console.log(`✅ Resource account (treasury): ${treasuryAddress}`);
        console.log(`🔗 View treasury: https://explorer.aptoslabs.com/account/${treasuryAddress}?network=${APTOS_NETWORK.toLowerCase()}`);

        // Step 3: Authorize the backend
        console.log('\n🔐 Step 3: Authorizing backend...');

        const authTransaction = await aptos.transaction.build.simple({
            sender: deployerAccount.accountAddress,
            data: {
                function: `${contractAddress}::cash_simple::add_authorized_backend`,
                functionArguments: [
                    backendAccount.accountAddress.toString(),
                    '10', // max 10 settlements per window
                    '60'  // 60 second window
                ],
            },
        });

        const authResponse = await aptos.signAndSubmitTransaction({
            signer: deployerAccount,
            transaction: authTransaction,
        });

        await aptos.waitForTransaction({ transactionHash: authResponse.hash });
        console.log(`✅ Backend authorized: ${authResponse.hash}`);

        // Step 4: Fund the house treasury (if CASH tokens available)
        console.log('\n💰 Step 4: Checking for CASH tokens to fund treasury...');

        try {
            const deployerCashBalance = await aptos.getAccountCoinAmount({
                accountAddress: deployerAccount.accountAddress.toString(),
                coinType: CASH_TOKEN_ADDRESS,
            });

            const cashBalance = deployerCashBalance / 1_000_000; // Convert from micro-CASH
            console.log(`💰 Deployer CASH balance: ${cashBalance.toFixed(6)} CASH`);

            if (cashBalance >= INITIAL_HOUSE_FUNDING) {
                console.log(`💸 Funding treasury with ${INITIAL_HOUSE_FUNDING} CASH...`);

                const fundTransaction = await aptos.transaction.build.simple({
                    sender: deployerAccount.accountAddress,
                    data: {
                        function: `${contractAddress}::cash_simple::deposit_house`,
                        functionArguments: [
                            (INITIAL_HOUSE_FUNDING * 1_000_000).toString() // Convert to micro-CASH
                        ],
                    },
                });

                const fundResponse = await aptos.signAndSubmitTransaction({
                    signer: deployerAccount,
                    transaction: fundTransaction,
                });

                await aptos.waitForTransaction({ transactionHash: fundResponse.hash });
                console.log(`✅ Treasury funded: ${fundResponse.hash}`);
            } else {
                console.log(`⚠️  Insufficient CASH balance for funding. Need ${INITIAL_HOUSE_FUNDING}, have ${cashBalance.toFixed(6)}`);
                console.log(`💡 You can fund the treasury later using the deposit_house function`);
            }
        } catch (error) {
            console.log(`⚠️  Could not check CASH balance (account may not be registered for CASH)`);
            console.log(`💡 You can fund the treasury later after acquiring CASH tokens`);
        }

        // Step 5: Verify deployment
        console.log('\n✅ Step 5: Verifying deployment...');

        const [treasuryBalance] = await aptos.view({
            payload: {
                function: `${contractAddress}::cash_simple::get_treasury_balance`,
                functionArguments: [],
            },
        });

        const [isAuthorized] = await aptos.view({
            payload: {
                function: `${contractAddress}::cash_simple::is_backend_authorized`,
                functionArguments: [backendAccount.accountAddress.toString()],
            },
        });

        console.log(`💰 Treasury balance: ${(Number(treasuryBalance) / 1_000_000).toFixed(6)} CASH`);
        console.log(`🔐 Backend authorized: ${isAuthorized ? '✅' : '❌'}`);

        // Generate environment variables
        console.log('\n📋 Environment Variables for Backend:');
        console.log('==========================================');
        console.log(`CONTRACT_ADDRESS=${contractAddress}`);
        console.log(`BACKEND_PRIVATE_KEY=${BACKEND_PRIVATE_KEY}`);
        console.log(`APTOS_NETWORK=${APTOS_NETWORK.toLowerCase()}`);
        console.log(`TREASURY_ADDRESS=${treasuryAddress}`);
        console.log('');

        // Save deployment info
        const deploymentInfo = {
            network: APTOS_NETWORK,
            contractAddress,
            treasuryAddress,
            backendAddress: backendAccount.accountAddress.toString(),
            deployerAddress: deployerAccount.accountAddress.toString(),
            deploymentTime: new Date().toISOString(),
            transactions: {
                publish: publishResponse.hash,
                authorize: authResponse.hash,
            },
            cashToken: {
                address: CASH_TOKEN_ADDRESS,
                decimals: 6,
            },
        };

        fs.writeFileSync(
            path.join(__dirname, `../deployment-${APTOS_NETWORK.toLowerCase()}.json`),
            JSON.stringify(deploymentInfo, null, 2)
        );

        console.log('🎉 Deployment completed successfully!');
        console.log(`📄 Deployment info saved to: deployment-${APTOS_NETWORK.toLowerCase()}.json`);

        console.log('\n🔄 Next Steps:');
        console.log('1. Update your .env file with the CONTRACT_ADDRESS above');
        console.log('2. Acquire CASH tokens and fund the treasury if not done');
        console.log('3. Update frontend configuration with new contract address');
        console.log('4. Test the deployment with a small transaction');

    } catch (error: any) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

// Run deployment
main().catch(error => {
    console.error('💥 Deployment script failed:', error);
    process.exit(1);
});

export { main as deployCashContract };
