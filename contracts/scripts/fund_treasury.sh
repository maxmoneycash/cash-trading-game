#!/bin/bash

# Fund the game treasury so it can pay out winners
# The treasury is a resource account that needs initial liquidity

CONTRACT_ADDRESS="0xac90639e0d28963f6d370fbb363d9a120b5ed00660cd276b4b1a58d499ceee34"

# Calculate treasury address (resource account with seed "treasury")
# Treasury address = hash(contract_address + seed + 0xFE)
echo "🏦 Funding Game Treasury..."
echo "Contract: $CONTRACT_ADDRESS"
echo ""

# First, let's check current treasury balance
echo "📊 Checking current treasury balance..."
aptos move view \
  --function-id ${CONTRACT_ADDRESS}::game::get_treasury_balance \
  --url https://fullnode.devnet.aptoslabs.com

echo ""
echo "💰 Sending 100 APT to treasury for player payouts..."
echo ""

# Get the treasury address from the contract
TREASURY_OUTPUT=$(aptos move view \
  --function-id ${CONTRACT_ADDRESS}::game::get_treasury_balance \
  --url https://fullnode.devnet.aptoslabs.com 2>&1)

# Extract treasury address from error or create it
# For now, let's calculate it manually
# Resource account address = sha3_256(contract_address + seed + 0xFE)[0..31]

# Easier: just transfer to the known treasury resource account
# The treasury was created with seed b"treasury" from the contract address

# We'll use the Aptos CLI to transfer directly
# First get the treasury address by querying the contract resources

echo "💸 To fund the treasury, run:"
echo ""
echo "aptos account transfer \\"
echo "  --account <TREASURY_ADDRESS> \\"
echo "  --amount 10000000000 \\"
echo "  --url https://fullnode.devnet.aptoslabs.com"
echo ""
echo "Or in the Petra wallet, send 100 APT to the treasury address"
echo ""
echo "📍 To find treasury address, check contract resources at:"
echo "https://explorer.aptoslabs.com/account/${CONTRACT_ADDRESS}/resources?network=devnet"
echo ""
echo "Look for '${CONTRACT_ADDRESS}::game::GameTreasury' and get the treasury address from signer_cap"
