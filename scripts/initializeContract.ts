/**
 * Script to initialize the game contract treasury
 * Must be run by the contract owner account
 */

import { gameContract } from '../src/contracts/GameContract';

async function main() {
  console.log('🏗️  Contract Initialization Script');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Contract Address:', gameContract.getContractAddress());
  console.log('\n⚠️  IMPORTANT: You must run this with the contract OWNER account!');
  console.log('   The owner address must match the contract deployment address.');
  console.log('\n📝 Instructions:');
  console.log('   1. Connect your Petra wallet with the contract owner account');
  console.log('   2. Run this script');
  console.log('   3. Approve the initialization transaction');
  console.log('\n═══════════════════════════════════════════════════════\n');

  console.log('⏳ This script cannot run automatically - you need to call the initialize function manually.');
  console.log('\nTo initialize the contract:');
  console.log('1. Open the browser console on your app');
  console.log('2. Connect with the contract owner wallet');
  console.log('3. Run this code:\n');
  console.log('```javascript');
  console.log('// In browser console:');
  console.log('import { gameContract } from "./src/contracts/GameContract";');
  console.log('// Get wallet adapter from your app context');
  console.log('await gameContract.initializeTreasury(signAndSubmitTransaction);');
  console.log('```');
  console.log('\nOR add a button in your UI to call initializeTreasury when the owner is connected.');
}

main().catch(console.error);
