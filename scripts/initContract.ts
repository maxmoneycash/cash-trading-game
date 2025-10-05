#!/usr/bin/env tsx

/**
 * Initialize the game contract
 * This script uses the Aptos SDK to call initialize_treasury
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTRACT_ADDRESS = '0x37691b1a87e7d1054007c5687424ef10438993722925b189c09f1bc7fe172ac5';

async function main() {
  console.log('🏗️  Game Contract Initialization Script');
  console.log('═══════════════════════════════════════════════════════\n');

  // Load Aptos config
  const configPath = path.join(__dirname, '../contracts/.aptos/config.yaml');

  if (!fs.existsSync(configPath)) {
    console.error('❌ Aptos config not found at:', configPath);
    console.error('   Please make sure you have deployed the contract first.');
    process.exit(1);
  }

  const configFile = fs.readFileSync(configPath, 'utf8');
  const config: any = yaml.load(configFile);

  const profile = config.profiles.default;
  const privateKeyHex = profile.private_key;
  const accountAddress = profile.account;

  console.log('📋 Configuration:');
  console.log(`   Account: 0x${accountAddress}`);
  console.log(`   Contract: ${CONTRACT_ADDRESS}`);
  console.log(`   Network: ${profile.network}\n`);

  // Check if this is the contract owner
  const isOwner = `0x${accountAddress}` === CONTRACT_ADDRESS;

  if (!isOwner) {
    console.error('❌ ACCOUNT MISMATCH!');
    console.error(`   Your account: 0x${accountAddress}`);
    console.error(`   Contract owner: ${CONTRACT_ADDRESS}`);
    console.error('\n⚠️  Only the contract owner can initialize the contract.');
    console.error('   Please use the account that deployed the contract.');
    console.error('\n💡 Options:');
    console.error('   1. Use the browser method with the owner wallet in Petra');
    console.error('   2. Update .aptos/config.yaml with the owner account private key');
    process.exit(1);
  }

  console.log('✅ You are the contract owner!\n');

  // Initialize Aptos SDK
  const aptosConfig = new AptosConfig({ network: Network.DEVNET });
  const aptos = new Aptos(aptosConfig);

  // Create account from private key
  const privateKey = new Ed25519PrivateKey(privateKeyHex);
  const account = Account.fromPrivateKey({ privateKey });

  console.log('🔍 Checking current contract state...');

  // Check if already initialized
  try {
    const resource = await aptos.getAccountResource({
      accountAddress: CONTRACT_ADDRESS,
      resourceType: `${CONTRACT_ADDRESS}::game::ActiveGames`
    });
    console.log('✅ Contract is already initialized!');
    console.log('   ActiveGames resource exists.');
    console.log('\n✨ No action needed - the contract is ready to use.');
    process.exit(0);
  } catch (error: any) {
    if (error.message && error.message.includes('resource_not_found')) {
      console.log('⚠️  Contract NOT initialized - ActiveGames resource not found');
      console.log('   Proceeding with initialization...\n');
    } else {
      throw error;
    }
  }

  // Build initialization transaction
  console.log('📝 Building initialization transaction...');

  const transaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${CONTRACT_ADDRESS}::game::initialize_treasury`,
      functionArguments: [],
    },
  });

  console.log('✍️  Signing transaction...');
  const committedTxn = await aptos.signAndSubmitTransaction({
    signer: account,
    transaction,
  });

  console.log('⏳ Waiting for transaction confirmation...');
  const executedTransaction = await aptos.waitForTransaction({
    transactionHash: committedTxn.hash,
  });

  console.log('\n✅ SUCCESS! Contract initialized!');
  console.log(`   Transaction: ${committedTxn.hash}`);
  console.log(`   Status: ${executedTransaction.success ? 'Success ✅' : 'Failed ❌'}`);

  // Verify initialization
  console.log('\n🔍 Verifying initialization...');
  try {
    const resource = await aptos.getAccountResource({
      accountAddress: CONTRACT_ADDRESS,
      resourceType: `${CONTRACT_ADDRESS}::game::ActiveGames`
    });
    console.log('✅ ActiveGames resource created successfully!');

    const games = (resource.data as any).games || [];
    console.log(`   Current active games: ${games.length}`);
  } catch (error) {
    console.error('⚠️  Could not verify - resource might still be indexing');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎉 Contract is ready to use!');
  console.log('   You can now start playing games.');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message || error);
  process.exit(1);
});
