# CASH Token Migration Guide

## Overview

This guide covers the migration from APT-based user-controlled settlement to CASH-based backend-controlled settlement with resource account security.

## Key Changes

### 🔄 Token Migration
- **From:** APT (8 decimals, user-controlled)
- **To:** CASH (6 decimals, backend-controlled)
- **Token Address:** `0x61ed8b048636516b4eaf4c74250fa4f9440d9c3e163d96aeb863fe658a4bdc67::CASH::CASH`

### 🏦 Architecture Changes
- **House Treasury:** Resource account (no private key exists)
- **Settlement:** Backend-authorized (no user signing for trades)
- **Security:** Rate limiting, settlement caps, monitoring

## Deployment Steps

### 1. Environment Setup

Create `.env` file in `server/` directory:

```bash
# Copy example and customize
cp server/.env.example server/.env

# Required variables:
APTOS_NETWORK=devnet  # or mainnet
DEPLOYER_PRIVATE_KEY=0x...  # Your deployment key
BACKEND_PRIVATE_KEY=0x...   # Separate backend key
INITIAL_HOUSE_FUNDING=10000 # CASH amount
```

### 2. Build and Deploy Contract

```bash
# Build the Move contract
cd contracts
aptos move compile

# Deploy using script
cd ..
npm run deploy:cash

# Or deploy manually:
cd contracts
aptos move publish --profile deployer
```

### 3. Backend Authorization

```bash
# Authorize your backend to settle trades
aptos move run \
  --function-id CONTRACT_ADDRESS::cash_liquidity::add_authorized_backend \
  --args address:BACKEND_ADDRESS u64:10 u64:60 \
  --profile deployer
```

### 4. Fund House Treasury

```bash
# First, acquire CASH tokens via DEX
# Then fund the treasury:
aptos move run \
  --function-id CONTRACT_ADDRESS::cash_liquidity::deposit_house \
  --args u64:10000000000 \  # 10,000 CASH in micro-CASH
  --profile deployer
```

## Frontend Integration

### 1. Update Balance Display

```tsx
import { CashBalanceDisplay } from './components/wallet/CashBalanceDisplay';

// Replace APT balance with CASH
<CashBalanceDisplay showDecimals={true} />
```

### 2. Add CASH Receiving Interface

```tsx
import { ReceiveCashTab } from './components/wallet/ReceiveCashTab';

// Add to wallet interface
<ReceiveCashTab onClose={handleClose} />
```

### 3. Update Settlement Flow

Settlement now happens automatically via backend - no user signing required for trade completion.

## Backend Configuration

### 1. Install Dependencies

```bash
cd server
npm install @aptos-labs/ts-sdk
```

### 2. Update Settlement Logic

The backend now handles all trade settlements:

```typescript
import { aptosCashService } from './services/aptosCashService';

// Settle trades automatically
await aptosCashService.recordTrade(playerAddress, deltaCAH);
```

## User Experience Changes

### Before (APT)
1. User deposits APT to contract
2. User plays game (off-chain)
3. **User signs** settlement transaction
4. User withdraws remaining APT

### After (CASH)
1. User receives CASH at keyless address
2. User deposits CASH to contract
3. User plays game (off-chain)  
4. **Backend automatically settles** (no user signature)
5. User withdraws remaining CASH

## Security Features

### Resource Account
- House funds stored in account with **no private key**
- Only Move contract code can access funds
- Backend cannot steal house liquidity

### Backend Limitations
- Max settlement per transaction: 1,000 CASH
- Rate limiting: 10 settlements per minute
- Can be revoked instantly if compromised

### Monitoring & Safety
- All settlements logged on-chain
- Treasury balance monitoring
- Automatic pause capability
- Settlement anomaly detection

## Migration Checklist

### Pre-Deployment
- [ ] Generate deployer and backend keypairs
- [ ] Acquire CASH tokens for house funding
- [ ] Test on devnet first
- [ ] Review security parameters

### Deployment
- [ ] Deploy contract with resource account
- [ ] Authorize backend address
- [ ] Fund house treasury
- [ ] Verify deployment

### Backend Setup
- [ ] Update environment variables
- [ ] Deploy backend with CASH service
- [ ] Test settlement endpoints
- [ ] Enable monitoring

### Frontend Update
- [ ] Update balance displays
- [ ] Add CASH receiving interface
- [ ] Remove user settlement signing
- [ ] Update documentation

### Testing
- [ ] User deposit flow
- [ ] Game play and settlement
- [ ] User withdrawal
- [ ] Backend failure scenarios
- [ ] Security stress testing

## Monitoring & Maintenance

### Health Checks
```bash
# Check backend authorization
curl http://localhost:3001/api/game/treasury/status

# Verify settlement functionality
curl -X POST http://localhost:3001/api/game/settlement/manual \
  -H "Content-Type: application/json" \
  -d '{"playerAddress": "0x...", "deltaCAH": 1.0}'
```

### Treasury Management
- Monitor treasury balance
- Refill when low (set up alerts)
- Track settlement patterns
- Review authorization logs

## Troubleshooting

### Common Issues

1. **Backend Not Authorized**
   - Check backend address in contract
   - Verify authorization transaction

2. **Insufficient Treasury Balance** 
   - Add more CASH to treasury
   - Monitor settlement vs funding ratio

3. **Settlement Rate Limiting**
   - Adjust rate limits if needed
   - Implement settlement queuing

4. **Frontend Balance Issues**
   - Check CASH token integration
   - Verify API endpoints

### Emergency Procedures

1. **Pause Settlements**
   ```bash
   aptos move run \
     --function-id CONTRACT::cash_liquidity::set_paused \
     --args bool:true
   ```

2. **Revoke Backend**
   ```bash
   aptos move run \
     --function-id CONTRACT::cash_liquidity::revoke_backend_authorization \
     --args address:BACKEND_ADDRESS
   ```

## Support

For issues with the migration:
1. Check deployment logs
2. Verify environment configuration  
3. Test on devnet first
4. Review transaction hashes on explorer

The resource account architecture provides maximum security while maintaining seamless user experience through backend settlement automation.
