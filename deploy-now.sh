#!/bin/bash

echo "🚀 CASH Trading Game - Mainnet Deployment Script"
echo "==============================================="

cd /Users/maxmohammadi/cash-trading-game

# Check if address is funded
echo "📊 Checking deployer balance..."
BALANCE=$(aptos account balance --account 0x92efa706f19c5f76878d074b61a520494811a1061d0026ba6aa7b8a28294ca12 2>/dev/null | grep "APT" | head -1 | cut -d'"' -f4)

if [ -z "$BALANCE" ] || [ "$BALANCE" = "0" ]; then
    echo "❌ Deployer address not funded with APT!"
    echo "💡 Send 2-3 APT to: 0x92efa706f19c5f76878d074b61a520494811a1061d0026ba6aa7b8a28294ca12"
    echo "🔗 Use Binance, Coinbase, or OKX to buy and send APT"
    exit 1
fi

echo "✅ Deployer balance: $BALANCE APT"

# Deploy the contract
echo ""
echo "📦 Step 1: Deploying CASH contract to mainnet..."
cd contracts

if aptos move publish --named-addresses cash_trading_game=0x92efa706f19c5f76878d074b61a520494811a1061d0026ba6aa7b8a28294ca12 --max-gas 200000 --assume-yes; then
    echo "✅ Contract deployed successfully!"
else
    echo "❌ Contract deployment failed!"
    exit 1
fi

cd ..

# Authorize backend
echo ""
echo "🔐 Step 2: Authorizing backend..."
if aptos move run --function-id 0x92efa706f19c5f76878d074b61a520494811a1061d0026ba6aa7b8a28294ca12::cash_simple::add_authorized_backend --args address:0x79f5228519aa8fb74f17b5f95f9ee8d6026be1a19ae4287eb6de497436a6a037 --assume-yes; then
    echo "✅ Backend authorized successfully!"
else
    echo "❌ Backend authorization failed!"
    exit 1
fi

# Check if user has CASH for treasury funding
echo ""
echo "💰 Step 3: Checking for CASH tokens..."
CASH_BALANCE=$(aptos account balance --account 0x92efa706f19c5f76878d074b61a520494811a1061d0026ba6aa7b8a28294ca12 --coin-type 0x61ed8b048636516b4eaf4c74250fa4f9440d9c3e163d96aeb863fe658a4bdc67::CASH::CASH 2>/dev/null | grep -o '"[0-9]*"' | tr -d '"' | head -1)

if [ -z "$CASH_BALANCE" ] || [ "$CASH_BALANCE" = "0" ]; then
    echo "⚠️  No CASH tokens found for treasury funding"
    echo "💡 To fund the treasury:"
    echo "   1. Swap APT → CASH on Panora DEX: https://panora.exchange"
    echo "   2. Get at least 5,000 CASH"
    echo "   3. Run this command to fund treasury:"
    echo "      aptos move run --function-id 0x92efa706f19c5f76878d074b61a520494811a1061d0026ba6aa7b8a28294ca12::cash_simple::deposit_house --args u64:5000000000 --assume-yes"
else
    echo "✅ CASH balance found: $CASH_BALANCE micro-CASH"
    echo "💸 Funding treasury with 5,000 CASH..."
    if aptos move run --function-id 0x92efa706f19c5f76878d074b61a520494811a1061d0026ba6aa7b8a28294ca12::cash_simple::deposit_house --args u64:5000000000 --assume-yes; then
        echo "✅ Treasury funded successfully!"
    else
        echo "❌ Treasury funding failed!"
    fi
fi

echo ""
echo "🎉 Deployment Complete!"
echo "====================="
echo "📜 Contract Address: 0x92efa706f19c5f76878d074b61a520494811a1061d0026ba6aa7b8a28294ca12"
echo "🔑 Backend Address: 0x79f5228519aa8fb74f17b5f95f9ee8d6026be1a19ae4287eb6de497436a6a037"
echo ""
echo "🚀 Next Steps:"
echo "1. Update server/.env with CONTRACT_ADDRESS"
echo "2. Start backend: cd server && npm run dev"
echo "3. Start frontend: npm run dev"
echo "4. Your CASH game is now live on mainnet! 🎮"
