import random
import math

class QuickTradingSimulator:
    def __init__(self):
        self.ROUND_DURATION_CANDLES = 470
        self.GRACE_PERIOD_CANDLES = 150
        self.TRADING_FEE_RATE = 0.002
        self.POSITION_SIZE_RATIO = 0.2

    def calculate_liquidation_probability(self, candle_num, position_duration=None):
        """Simplified liquidation probability"""
        if candle_num < self.GRACE_PERIOD_CANDLES:
            return 0
        
        # Base chance after grace period
        candles_since_grace = candle_num - self.GRACE_PERIOD_CANDLES
        ramp_period = 75
        
        if candles_since_grace < ramp_period:
            ramp_multiplier = candles_since_grace / ramp_period
            base_chance = 0.0003 * ramp_multiplier
        else:
            base_chance = 0.0003
        
        # Add time risk if holding position
        if position_duration and position_duration > 60:
            time_risk = min(0.004, ((position_duration - 60) / 200) ** 1.8 * 0.006)
            base_chance += time_risk
        
        # Random multiplier
        if candle_num >= self.GRACE_PERIOD_CANDLES:
            random_multiplier = 0.7 + random.random() * 0.8
            base_chance *= random_multiplier
        
        return min(0.01, base_chance)

def simulate_player_strategies(num_rounds=1000, players_per_type=50):
    """Simulate different player strategies"""
    simulator = QuickTradingSimulator()
    
    # Player types and their behaviors
    strategies = {
        'random_trader': {'trades_per_round': 2, 'avg_hold_time': 50, 'liquidation_modifier': 1.0},
        'buy_hold': {'trades_per_round': 1, 'avg_hold_time': 300, 'liquidation_modifier': 2.0},
        'scalper': {'trades_per_round': 8, 'avg_hold_time': 15, 'liquidation_modifier': 0.3},
        'dip_buyer': {'trades_per_round': 1, 'avg_hold_time': 80, 'liquidation_modifier': 1.2}
    }
    
    results = {}
    total_house_profit = 0
    
    print("Running quick simulation...")
    print(f"Rounds: {num_rounds}, Players per type: {players_per_type}")
    print("-" * 60)
    
    for strategy_name, params in strategies.items():
        print(f"Simulating {strategy_name}...")
        
        total_starting_balance = players_per_type * 1000
        total_fees_paid = 0
        total_liquidations = 0
        total_trades = 0
        winning_trades = 0
        
        for round_num in range(num_rounds):
            for player_id in range(players_per_type):
                # Simulate trades for this player in this round
                trades_this_round = max(1, int(random.gauss(params['trades_per_round'], 1)))
                
                for trade in range(trades_this_round):
                    # Random entry time (after grace period)
                    entry_candle = random.randint(simulator.GRACE_PERIOD_CANDLES, 400)
                    
                    # Hold time based on strategy
                    hold_time = max(5, int(random.gauss(params['avg_hold_time'], params['avg_hold_time'] * 0.3)))
                    
                    # Check for liquidation during hold
                    liquidated = False
                    for candle_offset in range(0, hold_time, 10):  # Check every 10 candles
                        current_candle = entry_candle + candle_offset
                        if current_candle >= simulator.ROUND_DURATION_CANDLES:
                            break
                            
                        liquidation_prob = simulator.calculate_liquidation_probability(
                            current_candle, candle_offset
                        ) * params['liquidation_modifier']
                        
                        if random.random() < liquidation_prob:
                            liquidated = True
                            total_liquidations += 1
                            break
                    
                    total_trades += 1
                    
                    if not liquidated:
                        # Normal trade - pay fee and random P&L
                        fee = 1000 * simulator.POSITION_SIZE_RATIO * simulator.TRADING_FEE_RATE
                        total_fees_paid += fee
                        
                        # Random win/loss (slightly negative expected value)
                        if random.random() < 0.48:  # 48% win rate
                            winning_trades += 1
        
        # Calculate results for this strategy
        liquidation_rate = (total_liquidations / total_trades) * 100
        win_rate = (winning_trades / total_trades) * 100 if total_trades > 0 else 0
        
        # Estimate final player balances
        avg_trade_result = -2  # Slightly negative due to fees and house edge
        avg_liquidation_loss = 200  # Average loss per liquidation
        
        estimated_final_balance = total_starting_balance + (total_trades * avg_trade_result) - (total_liquidations * avg_liquidation_loss)
        player_net_loss = total_starting_balance - estimated_final_balance
        strategy_house_profit = total_fees_paid + (total_liquidations * 200)  # Fees + liquidation profits
        
        total_house_profit += strategy_house_profit
        
        results[strategy_name] = {
            'total_trades': total_trades,
            'liquidation_rate': liquidation_rate,
            'win_rate': win_rate,
            'total_fees': total_fees_paid,
            'house_profit': strategy_house_profit,
            'player_net_loss': player_net_loss,
            'roi': ((estimated_final_balance - total_starting_balance) / total_starting_balance) * 100
        }
        
        print(f"  Total trades: {total_trades:,}")
        print(f"  Liquidation rate: {liquidation_rate:.1f}%")
        print(f"  Win rate: {win_rate:.1f}%")
        print(f"  House profit: ${strategy_house_profit:,.0f}")
        print(f"  Player ROI: {results[strategy_name]['roi']:+.1f}%")
        print()
    
    return results, total_house_profit

def print_simulation_summary(results, total_house_profit):
    """Print comprehensive simulation results"""
    print("=" * 80)
    print("CASH TRADING GAME SIMULATION RESULTS")
    print("=" * 80)
    
    total_trades = sum(r['total_trades'] for r in results.values())
    total_fees = sum(r['total_fees'] for r in results.values())
    total_player_loss = sum(r['player_net_loss'] for r in results.values())
    
    print(f"\nOVERALL GAME PERFORMANCE:")
    print(f"Total house profit: ${total_house_profit:,.0f}")
    print(f"Total trades executed: {total_trades:,}")
    print(f"Total fees collected: ${total_fees:,.0f}")
    print(f"Average profit per trade: ${total_house_profit/total_trades:.2f}")
    
    # Calculate house edge
    total_starting_capital = 4 * 50 * 1000 * 1000  # 4 types * 50 players * $1000 * 1000 rounds
    house_edge = (total_player_loss / total_starting_capital) * 100
    
    print(f"\nHOUSE EDGE ANALYSIS:")
    print(f"Total player starting capital: ${total_starting_capital:,.0f}")
    print(f"Total player losses: ${total_player_loss:,.0f}")
    print(f"House edge: {house_edge:.2f}%")
    
    print(f"\nSTRATEGY COMPARISON:")
    print(f"{'Strategy':<15} {'ROI':<8} {'Liq Rate':<10} {'Win Rate':<10} {'House $':<12}")
    print("-" * 65)
    
    for strategy, data in results.items():
        print(f"{strategy:<15} {data['roi']:+6.1f}% {data['liquidation_rate']:8.1f}% {data['win_rate']:8.1f}% ${data['house_profit']:>10,.0f}")
    
    print(f"\nPROFITABILITY ASSESSMENT:")
    if house_edge > 1.5:
        print("✅ HIGHLY PROFITABLE - House edge > 1.5%")
    elif house_edge > 0.5:
        print("✅ PROFITABLE - House edge > 0.5%")
    elif house_edge > 0:
        print("⚠️  MARGINALLY PROFITABLE - Low house edge")
    else:
        print("❌ NOT PROFITABLE - Negative house edge")
    
    # Compare to other games
    print(f"\nCOMPARISON TO OTHER GAMES:")
    print(f"Your game house edge: {house_edge:.2f}%")
    print(f"Crash games: 1-2%")
    print(f"Blackjack: 0.5-2%") 
    print(f"Slots: 5-15%")
    print(f"Roulette: 2.7-5.3%")

if __name__ == "__main__":
    # Run quick simulation
    results, total_house_profit = simulate_player_strategies(
        num_rounds=1000, 
        players_per_type=50
    )
    
    # Print detailed analysis
    print_simulation_summary(results, total_house_profit)