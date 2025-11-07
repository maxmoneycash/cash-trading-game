#!/bin/bash
# Mainnet Deployment Script for CASH Trading Game

set -e

echo "🚀 Starting CASH Trading Game Mainnet Deployment..."

# Check required environment variables
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo "❌ DEPLOYER_PRIVATE_KEY not set"
    echo "💡 Generate with: aptos key generate --output-file deployer.key"
    exit 1
fi

if [ -z "$BACKEND_PRIVATE_KEY" ]; then
    echo "❌ BACKEND_PRIVATE_KEY not set"
    echo "💡 Generate with: aptos key generate --output-file backend.key"
    exit 1
fi

echo "🔧 Building Move contract..."
cd contracts
aptos move compile --named-addresses cash_trading_game=default

echo "🌐 Deploying to Mainnet..."
cd ..

# Set environment for deployment script
export APTOS_NETWORK=mainnet
export INITIAL_HOUSE_FUNDING=${INITIAL_HOUSE_FUNDING:-5000}

# Run deployment
npm run deploy:cash

echo "✅ Deployment completed!"
echo ""
echo "🔄 Next Steps:"
echo "1. Update server/.env with the CONTRACT_ADDRESS from above"
echo "2. Acquire CASH tokens for your deployer address"
echo "3. Fund the house treasury"
echo "4. Start the backend server"
echo "5. Test the frontend"
echo ""
echo "💰 To acquire CASH tokens:"
echo "   - Buy APT on Binance/Coinbase"
echo "   - Swap APT → CASH on Panora DEX: https://panora.exchange"
echo ""
