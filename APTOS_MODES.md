# Cash Trading Game - Aptos Integration

The game now runs on Aptos blockchain by default, with real APT betting on devnet for testing.

## 🎮 Game Modes

### **Default: Aptos Mode (Real APT Betting)**
```
http://localhost:5173/
```
**The main experience** - Connect your wallet and bet real APT tokens!

- ✅ **Wallet connection required** - Professional onboarding modal
- ✅ **Real APT betting** - Place actual bets on devnet
- ✅ **Blockchain transactions** - All games recorded on-chain
- ✅ **Treasury system** - House can withdraw profits
- ✅ **Game pauses** until wallet connects

### **Demo Mode (Try Without Wallet)**
```
http://localhost:5173/?demo=true
```
**For users who want to try the game first**

- 🎮 **No wallet needed** - Instant play
- 💰 **$1000 mock balance** - Virtual money
- ⚡ **Same game mechanics** - Identical trading experience
- 🔄 **Easy switch** - Connect wallet anytime to play with real APT

### **Developer Test Page**
```
http://localhost:5173/?test=true
```
**For testing and debugging smart contracts**

- 🔧 **Contract functions** - Direct smart contract interaction
- 📊 **Transaction testing** - Test start/complete game flows
- 🏦 **Treasury management** - House profit withdrawal testing
- 🐛 **Debug tools** - Error handling and gas estimation

## 🚀 Quick Start

**New users:**
1. Go to `http://localhost:5173/`
2. Try "Play Demo Mode" to test the game
3. When ready, "Connect Aptos Wallet" for real betting

**Developers:**
1. Test contracts: `http://localhost:5173/?test=true`
2. Debug with: `http://localhost:5173/?debug=true`

## 💳 Wallet Setup

1. **Install Petra Wallet** (Chrome extension)
2. **Switch to Aptos Devnet** in wallet settings
3. **Get test APT** from the [Aptos Faucet](https://aptoslabs.com/testnet-faucet)
4. **Minimum bet**: 0.001 APT

## 🏗️ Smart Contract Details

- **Network**: Aptos Devnet (for testing)
- **Contract**: `0xfa887d8e30148e28d79c16025e72f88f34d7d3e5a2814c68bae8e8c09f407607`
- **Treasury**: `0xa93d5776703af771af8965dc229a054547cb68416b29dfc4656fec7ea3eca1a4`

### Functions
- `start_game(bet_amount)` - Place your bet
- `complete_game(seed, is_profit, amount)` - Settle game results
- `withdraw_house_profits(amount)` - House withdraws profits

## 🎯 Production Plan

Currently running on **Aptos Devnet** for testing. For mainnet deployment:

1. **Security audit** smart contracts
2. **Deploy to Aptos Mainnet**
3. **Update contract addresses**
4. **Real APT betting** goes live

The game is **production-ready** - just needs mainnet deployment when you're ready!

## 🛠️ Technical Notes

- **Non-disruptive integration** - Original game mechanics unchanged
- **Graceful fallbacks** - Handles wallet disconnections
- **Professional UX** - Clear onboarding and error states
- **Scalable architecture** - Easy to add new features