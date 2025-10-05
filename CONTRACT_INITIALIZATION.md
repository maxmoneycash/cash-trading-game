# 🔴 Critical: Contract Initialization Required

## Problem

The game contract at `0x37691b1a87e7d1054007c5687424ef10438993722925b189c09f1bc7fe172ac5` was deployed but **never initialized**. This causes all games to fail because the `ActiveGames` resource doesn't exist.

### Error Message
```
Resource not found: 0x37691b1a87e7d1054007c5687424ef10438993722925b189c09f1bc7fe172ac5::game::ActiveGames
```

## Root Cause

When a Move contract is deployed, the `init_module` function should run automatically. However, in some cases (like contract upgrades or redeployments), the initialization doesn't happen. The contract includes a public `initialize_treasury` function for this purpose.

## Solution

**You must initialize the contract using the contract OWNER account.**

### Steps:

1. **Connect with the Contract Owner Wallet**
   - The owner address must be: `0x37691b1a87e7d1054007c5687424ef10438993722925b189c09f1bc7fe172ac5`
   - Connect this account in Petra wallet

2. **Run the Initialization Command**
   - Open your browser console (F12 → Console tab)
   - The app will detect you're the owner and show instructions
   - Run:
     ```javascript
     await window.initializeContract()
     ```

3. **Approve the Transaction**
   - Petra will ask you to approve the initialization transaction
   - Approve it

4. **Verify Success**
   - You should see: `✅ Contract initialized successfully: [tx_hash]`
   - The `ActiveGames`, `EventHandles`, and `GameTreasury` resources will now exist

## What Gets Initialized

The `initialize_treasury` function creates:

1. **GameTreasury** - Resource account for holding player bets and payouts
2. **EventHandles** - Event emitters for game tracking
3. **ActiveGames** - Storage for tracking in-progress games

## After Initialization

Once initialized, the contract will work normally:
- Players can start games with `start_game(bet_amount, seed)`
- Games get tracked in `ActiveGames`
- Completions work with `complete_game(seed, is_profit, amount)`
- Payouts are calculated correctly based on the stored bet amount

## Technical Details

From `game.move`:
```move
public entry fun initialize_treasury(account: &signer) {
    // Only allow the contract owner to initialize
    assert!(signer::address_of(account) == @cash_trading_game, 999);

    // Initialize treasury if missing
    if (!exists<GameTreasury>(@cash_trading_game)) {
        // ... creates treasury
    };

    // Initialize event handles if missing
    if (!exists<EventHandles>(@cash_trading_game)) {
        // ... creates event handles
    };

    // Initialize active game tracking if missing
    if (!exists<ActiveGames>(@cash_trading_game)) {
        move_to(account, ActiveGames {
            games: vector::empty<ActiveGame>(),
        });
    };
}
```

## Troubleshooting

### "Only the contract owner can initialize"
- Make sure you're connected with the exact address that deployed the contract
- The contract checks: `assert!(signer::address_of(account) == @cash_trading_game, 999)`

### "Transaction failed"
- Check you have enough APT for gas (should be minimal, ~0.001 APT)
- Try increasing gas limit if needed

### Still getting "Resource not found"
- Refresh the page after initialization
- Check the transaction was successful on the explorer
- Verify the resources exist by querying the contract address

## Prevention

For future deployments:
1. Always run `initialize_treasury` immediately after deploying
2. Or ensure `init_module` runs during deployment
3. Add initialization to deployment scripts
