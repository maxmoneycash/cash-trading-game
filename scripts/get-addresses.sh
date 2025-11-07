#!/bin/bash
# Get addresses from key files

if [ ! -f "deployer.key" ]; then
    echo "❌ deployer.key not found"
    exit 1
fi

if [ ! -f "backend.key" ]; then
    echo "❌ backend.key not found"  
    exit 1
fi

# Extract addresses from key files
DEPLOYER_PRIVATE_KEY=$(cat deployer.key | jq -r .private_key)
BACKEND_PRIVATE_KEY=$(cat backend.key | jq -r .private_key)

# Use aptos account create to get addresses (create temporary accounts to get addresses)
echo "🔑 Extracting addresses..."

# Get deployer address
aptos account create --private-key $DEPLOYER_PRIVATE_KEY --assume-yes > /dev/null 2>&1
DEPLOYER_ADDRESS=$(aptos account list --private-key $DEPLOYER_PRIVATE_KEY | head -1 | cut -d' ' -f1)

# Get backend address  
aptos account create --private-key $BACKEND_PRIVATE_KEY --assume-yes > /dev/null 2>&1
BACKEND_ADDRESS=$(aptos account list --private-key $BACKEND_PRIVATE_KEY | head -1 | cut -d' ' -f1)

echo "🔑 Deployer: $DEPLOYER_ADDRESS"
echo "🔑 Backend: $BACKEND_ADDRESS"
echo ""
echo "💡 Save these addresses! You'll need to send CASH to the deployer address."

# Export for deployment
export DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY
export BACKEND_PRIVATE_KEY=$BACKEND_PRIVATE_KEY
export DEPLOYER_ADDRESS=$DEPLOYER_ADDRESS
export BACKEND_ADDRESS=$BACKEND_ADDRESS

echo "✅ Environment variables set!"
