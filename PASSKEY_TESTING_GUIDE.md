# Passkey Testing & Deployment Guide

## 🎉 What Changed

We've implemented **real blockchain transactions** for passkey authentication! Mobile users can now:
- ✅ Authenticate with biometrics (Face ID / Touch ID)
- ✅ Submit real transactions to Aptos devnet
- ✅ See transactions on Aptos Explorer
- ✅ Have real APT balances from the blockchain

## 🧪 Testing Steps

### 1. Desktop Testing (with passkey simulation)

```bash
# Start the dev server
npm run dev

# Open in browser
# Add ?mobile=true to URL to force passkey mode
# Example: http://localhost:5173/?mobile=true
```

**Expected behavior:**
1. See passkey prompt on load
2. Click "Use Passkey (Recommended)"
3. Browser prompts for biometric (Touch ID on Mac, Windows Hello, etc.)
4. Game loads with passkey address
5. Click "Add Test Tokens" to fund from faucet
6. Play game - transactions submit to blockchain
7. Check console for transaction hashes
8. View transactions on explorer

### 2. Mobile Testing (iOS/Android)

#### Option A: Deploy to Vercel (Recommended)
```bash
# Commit changes
git add .
git commit -m "feat: implement real passkey blockchain transactions"
git push

# Vercel auto-deploys from main branch
# Wait for deployment
# Visit your Vercel URL on mobile device
```

#### Option B: Local testing with ngrok
```bash
# Install ngrok if not already installed
# Start dev server
npm run dev

# In another terminal, tunnel to localhost
ngrok http 5173

# Open the ngrok HTTPS URL on your mobile device
# IMPORTANT: Must use HTTPS for WebAuthn to work
```

**Expected mobile behavior:**
1. Open app on mobile
2. See "Mobile Detected" prompt automatically
3. Tap "Use Passkey (Recommended)"
4. Face ID / Touch ID prompt appears
5. Authenticate with biometrics
6. Passkey address shown in footer
7. Tap "Add Test Tokens" button
8. Play game - NO wallet popups!
9. Biometric prompt appears for transaction signing
10. Check console logs for tx hashes
11. View on Aptos Explorer

### 3. Verifying Real Transactions

**Check transaction on Aptos Explorer:**
1. Look for console log: `🔗 View on explorer: https://explorer.aptoslabs.com/txn/...`
2. Click the link or copy tx hash
3. Open in browser
4. Verify transaction details:
   - Sender address (passkey address)
   - Function called (`game::start_game` or `game::complete_game`)
   - Status: Success
   - Gas fees deducted
   - Balance changes

**Compare Desktop vs Mobile:**
- Desktop (Petra wallet): Real transactions ✅
- Mobile (Passkey): Real transactions ✅ (NEW!)
- Both show up on same explorer
- Both have real APT balances

## 🐛 Troubleshooting

### Issue: "Failed to create passkey"
**Solution:**
- Ensure device supports WebAuthn (most modern devices do)
- On mobile, must use HTTPS (not HTTP)
- Check browser console for error details

### Issue: "Account not yet initialized, balance is 0"
**Solution:**
- Click "Add Test Tokens" button
- This funds the passkey address from devnet faucet
- Wait 2-3 seconds for balance to update

### Issue: Biometric prompt doesn't appear
**Solution:**
- Check device has biometrics enabled (Settings → Face ID / Touch ID)
- Ensure browser has permission to use biometrics
- Try refreshing the page

### Issue: Transaction fails with "insufficient balance"
**Solution:**
- Check balance is sufficient (need ~0.06 APT minimum)
- Request more tokens from faucet
- Wait for previous transaction to complete

### Issue: "Transaction failed - no hash received"
**Solution:**
- Check internet connection
- Verify devnet is operational: https://status.aptoslabs.com/
- Check console for detailed error message
- May need to clear passkey and recreate

### Issue: Balance not updating after transaction
**Solution:**
- Devnet indexer can be slow (wait 5-10 seconds)
- Check transaction on explorer to confirm success
- Refresh balance manually if needed
- Balance will eventually sync from blockchain

## 📱 Mobile-Specific Notes

### iOS Safari
- ✅ WebAuthn supported
- ✅ Face ID / Touch ID works
- ⚠️ Must be HTTPS or localhost
- ⚠️ In PWA mode, works perfectly

### Android Chrome
- ✅ WebAuthn supported
- ✅ Fingerprint / Face unlock works
- ⚠️ Must be HTTPS or localhost
- ⚠️ May need to enable "Use screen lock" in Settings

### Mobile Wallet Connection
Mobile users still have option to use wallet instead:
1. Tap "Use Wallet Instead" button
2. Connect Petra mobile app
3. **NOTE:** Wallet popups may still have issues in PWA mode
4. Passkey mode is recommended for mobile

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Test passkey on desktop (with ?mobile=true)
- [ ] Test passkey on iOS device
- [ ] Test passkey on Android device
- [ ] Verify transactions on Aptos Explorer
- [ ] Check balance fetching works
- [ ] Test faucet button works
- [ ] Verify game settlement completes

### Deployment
- [ ] Commit all changes
- [ ] Push to main branch
- [ ] Wait for Vercel deployment
- [ ] Test deployed version on mobile
- [ ] Monitor error logs in Vercel dashboard
- [ ] Check Aptos devnet status

### Post-deployment monitoring
- [ ] Monitor transaction success rate
- [ ] Check for WebAuthn errors
- [ ] Verify balance updates
- [ ] Test on multiple devices
- [ ] Collect user feedback

## 🔍 Debug Console Logs

When passkey transactions run, you'll see:

```
🔐 Signing transaction with passkey...
📍 Passkey Aptos address: 0x...
📝 Building transaction with payload: {...}
📦 Raw transaction built
🔏 Transaction hash for signing: abc123...
🔐 Requesting WebAuthn signature...
✅ WebAuthn signature obtained
🔧 Signature normalized (64 bytes)
📋 Aptos signature constructed (130 bytes)
📡 Submitting transaction to Aptos devnet...
⏳ Transaction submitted, hash: 0x...
🔗 View on explorer: https://explorer.aptoslabs.com/txn/0x...?network=devnet
⏳ Waiting for confirmation...
✅ Transaction confirmed!
```

**If you see these logs, everything is working! 🎉**

## 💡 Tips for Best UX

1. **First-time users:**
   - Show brief tutorial on passkey benefits
   - Explain biometric authentication
   - Guide through faucet funding

2. **During gameplay:**
   - Clear status indicators (signing, confirming, etc.)
   - Show transaction links in console for debugging
   - Handle errors gracefully with retry options

3. **Mobile-specific:**
   - Auto-detect mobile and prompt for passkey
   - Larger touch targets for mobile UI
   - Clear instructions for biometric prompts

## 📊 Performance Metrics to Monitor

- **Passkey creation success rate**: Should be >95%
- **Transaction submission success rate**: Should be >90% (devnet can be flaky)
- **Biometric auth success rate**: Should be >98%
- **Average transaction confirmation time**: 2-5 seconds
- **Balance update latency**: 3-10 seconds (depends on devnet indexer)

## 🎯 Success Criteria

Your implementation is working correctly if:
- ✅ Mobile users see passkey prompt automatically
- ✅ Biometric authentication succeeds
- ✅ Transactions appear on Aptos Explorer
- ✅ Balances fetch from real blockchain
- ✅ No wallet popups on mobile
- ✅ Games complete successfully
- ✅ Settlement transfers real APT

---

**Need help?** Check console logs for detailed error messages. Most issues are related to:
1. HTTPS requirement (use ngrok or deploy to Vercel)
2. Device biometric setup
3. Devnet availability

Happy testing! 🚀
