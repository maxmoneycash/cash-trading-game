import random
import numpy as np
import matplotlib.pyplot as plt
import math

class TradingGameSimulator:
    def __init__(self):
        self.ROUND_DURATION_CANDLES = 470  # 30 seconds at ~15.6 FPS
        self.GRACE_PERIOD_CANDLES = 150    # 10 seconds
        self.RAMP_UP_PERIOD = 75          # 5 seconds
        self.TRADING_FEE_RATE = 0.002     # 0.2% of position size
        self.POSITION_SIZE_RATIO = 0.2    # 20% of balance per trade

    def generate_realistic_price_data(self, seed=None):
        """Generate realistic market price data for one round"""
        if seed:
            random.seed(seed)
            np.random.seed(seed)
        
        data = []
        price = 10 + random.random() * 5  # Start at $10-15
        
        # Multiple sine wave layers for organic movement
        base_period = 100 + random.random() * 100
        medium_period = 30 + random.random() * 20  
        short_period = 8 + random.random() * 8
        
        # Random phase offsets
        base_phase = random.random() * math.pi * 2
        medium_phase = random.random() * math.pi * 2
        short_phase = random.random() * math.pi * 2
        
        for i in range(self.ROUND_DURATION_CANDLES):
            # Combine sine waves for organic movement
            base_trend = math.sin((i * 2 * math.pi / base_period) + base_phase) * 0.15
            medium_trend = math.sin((i * 2 * math.pi / medium_period) + medium_phase) * 0.08
            short_trend = math.sin((i * 2 * math.pi / short_period) + short_phase) * 0.04
            
            trend_wave = base_trend + medium_trend + short_trend
            
            # Base volatility with some choppiness
            volatility = 0.02 + random.random() * 0.06  # 2-8% moves
            direction = random.choice([-1, 1])
            random_factor = (random.random() - 0.5) * 2
            
            # Apply trend bias
            final_direction = direction + trend_wave + random_factor * 0.3
            move = price * volatility * math.copysign(1, final_direction)
            
            # Generate OHLC
            open_price = price
            close_price = max(0.01, open_price + move * (0.5 + random.random() * 0.5))
            
            # Create realistic wicks
            wick_multiplier = 0.3 + random.random() * 0.4
            high_price = max(open_price, close_price) + abs(move) * wick_multiplier * random.random()
            low_price = min(open_price, close_price) - abs(move) * wick_multiplier * random.random()
            low_price = max(0.01, low_price)
            
            data.append({
                'candle': i,
                'open': open_price,
                'high': high_price,
                'low': low_price,
                'close': close_price
            })
            
            price = close_price
        
        return data

    def calculate_liquidation_probability(self, candle_num, position_duration=None, position_size_ratio=None, pnl_percent=None):
        """Calculate liquidation probability for a given candle"""
        if candle_num < self.GRACE_PERIOD_CANDLES:
            return 0  # Grace period - no liquidations
        
        # Base chance after grace period
        candles_since_grace = candle_num - self.GRACE_PERIOD_CANDLES
        
        if candles_since_grace < self.RAMP_UP_PERIOD:
            # Ramp up period
            ramp_multiplier = candles_since_grace / self.RAMP_UP_PERIOD
            base_chance = 0.0003 * ramp_multiplier
        else:
            # Full risk period
            base_chance = 0.0003
        
        total_risk = base_chance
        
        # Additional risks when holding position
        if position_duration is not None:
            # Time risk after 60 candles (4 seconds)
            if position_duration > 60:
                time_risk = min(0.004, ((position_duration - 60) / 200) ** 1.8 * 0.006)
                total_risk += time_risk
            
            # Size risk for large positions
            if position_size_ratio and position_size_ratio > 0.7:
                size_risk = min(0.0005, (position_size_ratio - 0.7) * 0.0005)
                total_risk += size_risk
            
            # Greed risk for high profits
            if pnl_percent and pnl_percent > 0.3:
                greed_risk = min(0.0008, (pnl_percent - 0.3) * 0.001)
                total_risk += greed_risk
        
        # Random multiplier
        if candle_num >= self.GRACE_PERIOD_CANDLES:
            random_multiplier = 0.7 + random.random() * 0.8  # 0.7x to 1.5x
            total_risk *= random_multiplier
        
        # Cap at 1%
        return min(0.01, total_risk)

    def check_liquidation(self, candle_num, position_duration=None, position_size_ratio=None, pnl_percent=None):
        """Check if liquidation occurs"""
        prob = self.calculate_liquidation_probability(candle_num, position_duration, position_size_ratio, pnl_percent)
        return random.random() < prob

class Player:
    def __init__(self, player_type, initial_balance=1000):
        self.type = player_type
        self.balance = initial_balance
        self.initial_balance = initial_balance
        self.total_trades = 0
        self.winning_trades = 0
        self.total_fees_paid = 0
        self.liquidations_suffered = 0

class PlayerStrategy:
    @staticmethod
    def random_trader(player, price_data, simulator):
        """Random entry/exit with varying hold times"""
        trades = []
        
        # Random number of trades (0-5 per round)
        num_trades = random.choices([0, 1, 2, 3, 4, 5], weights=[10, 30, 25, 20, 10, 5])[0]
        
        for _ in range(num_trades):
            if player.balance <= 0:
                break
                
            # Random entry time (after grace period)
            entry_candle = random.randint(simulator.GRACE_PERIOD_CANDLES, len(price_data) - 50)
            
            # Random hold duration (10-100 candles)
            hold_duration = random.randint(10, 100)
            exit_candle = min(entry_candle + hold_duration, len(price_data) - 1)
            
            entry_price = price_data[entry_candle]['close']
            position_size = player.balance * simulator.POSITION_SIZE_RATIO
            
            # Check for liquidation during hold
            liquidated = False
            for candle in range(entry_candle, exit_candle + 1):
                duration = candle - entry_candle
                current_price = price_data[candle]['close']
                pnl = (current_price - entry_price) * (position_size / entry_price)
                pnl_percent = pnl / player.balance
                
                if simulator.check_liquidation(candle, duration, simulator.POSITION_SIZE_RATIO, pnl_percent):
                    # Liquidated - lose entire position
                    player.balance -= position_size
                    player.liquidations_suffered += 1
                    liquidated = True
                    break
            
            if not liquidated:
                # Normal exit
                exit_price = price_data[exit_candle]['close']
                gross_pnl = (exit_price - entry_price) * (position_size / entry_price)
                trading_fee = position_size * simulator.TRADING_FEE_RATE
                net_pnl = gross_pnl - trading_fee
                
                player.balance += net_pnl
                player.total_fees_paid += trading_fee
                player.total_trades += 1
                if net_pnl > 0:
                    player.winning_trades += 1
                
                trades.append({
                    'entry_candle': entry_candle,
                    'exit_candle': exit_candle,
                    'entry_price': entry_price,
                    'exit_price': exit_price,
                    'gross_pnl': gross_pnl,
                    'net_pnl': net_pnl,
                    'fee': trading_fee
                })
        
        return trades

    @staticmethod
    def buy_and_hold(player, price_data, simulator):
        """Buy at start, hold until end or liquidation"""
        if player.balance <= 0:
            return []
        
        entry_candle = simulator.GRACE_PERIOD_CANDLES + 10  # Enter right after grace period
        entry_price = price_data[entry_candle]['close']
        position_size = player.balance * simulator.POSITION_SIZE_RATIO
        
        # Hold until end or liquidation
        for candle in range(entry_candle, len(price_data)):
            duration = candle - entry_candle
            current_price = price_data[candle]['close']
            pnl = (current_price - entry_price) * (position_size / entry_price)
            pnl_percent = pnl / player.balance
            
            if simulator.check_liquidation(candle, duration, simulator.POSITION_SIZE_RATIO, pnl_percent):
                # Liquidated
                player.balance -= position_size
                player.liquidations_suffered += 1
                return []
        
        # Survived to end
        exit_price = price_data[-1]['close']
        gross_pnl = (exit_price - entry_price) * (position_size / entry_price)
        trading_fee = position_size * simulator.TRADING_FEE_RATE
        net_pnl = gross_pnl - trading_fee
        
        player.balance += net_pnl
        player.total_fees_paid += trading_fee
        player.total_trades += 1
        if net_pnl > 0:
            player.winning_trades += 1
        
        return [{
            'entry_candle': entry_candle,
            'exit_candle': len(price_data) - 1,
            'entry_price': entry_price,
            'exit_price': exit_price,
            'gross_pnl': gross_pnl,
            'net_pnl': net_pnl,
            'fee': trading_fee
        }]

    @staticmethod
    def scalper(player, price_data, simulator):
        """Many quick trades, holding for short periods"""
        trades = []
        
        # Many small trades
        num_trades = random.randint(5, 15)
        
        for _ in range(num_trades):
            if player.balance <= 0:
                break
            
            # Quick entries throughout the round
            entry_candle = random.randint(simulator.GRACE_PERIOD_CANDLES, len(price_data) - 20)
            
            # Short hold (5-30 candles)
            hold_duration = random.randint(5, 30)
            exit_candle = min(entry_candle + hold_duration, len(price_data) - 1)
            
            entry_price = price_data[entry_candle]['close']
            position_size = player.balance * (simulator.POSITION_SIZE_RATIO * 0.5)  # Smaller positions
            
            # Check for liquidation (less likely due to short holds)
            liquidated = False
            for candle in range(entry_candle, exit_candle + 1):
                duration = candle - entry_candle
                current_price = price_data[candle]['close']
                pnl = (current_price - entry_price) * (position_size / entry_price)
                pnl_percent = pnl / player.balance
                
                if simulator.check_liquidation(candle, duration, simulator.POSITION_SIZE_RATIO * 0.5, pnl_percent):
                    player.balance -= position_size
                    player.liquidations_suffered += 1
                    liquidated = True
                    break
            
            if not liquidated:
                exit_price = price_data[exit_candle]['close']
                gross_pnl = (exit_price - entry_price) * (position_size / entry_price)
                trading_fee = position_size * simulator.TRADING_FEE_RATE
                net_pnl = gross_pnl - trading_fee
                
                player.balance += net_pnl
                player.total_fees_paid += trading_fee
                player.total_trades += 1
                if net_pnl > 0:
                    player.winning_trades += 1
        
        return trades

    @staticmethod
    def dip_buyer(player, price_data, simulator):
        """Wait for price drops, then buy expecting recovery"""
        if player.balance <= 0:
            return []
        
        # Find significant dips (price drops >5% from recent high)
        entry_opportunities = []
        lookback = 20
        
        for i in range(simulator.GRACE_PERIOD_CANDLES + lookback, len(price_data) - 30):
            recent_high = max(price_data[j]['high'] for j in range(i - lookback, i))
            current_price = price_data[i]['close']
            drop_percent = (recent_high - current_price) / recent_high
            
            if drop_percent > 0.05:  # 5% drop
                entry_opportunities.append(i)
        
        if not entry_opportunities:
            return []
        
        # Take first good opportunity
        entry_candle = entry_opportunities[0]
        entry_price = price_data[entry_candle]['close']
        position_size = player.balance * simulator.POSITION_SIZE_RATIO
        
        # Hold for recovery (30-80 candles)
        hold_duration = random.randint(30, 80)
        exit_candle = min(entry_candle + hold_duration, len(price_data) - 1)
        
        # Check for liquidation
        for candle in range(entry_candle, exit_candle + 1):
            duration = candle - entry_candle
            current_price = price_data[candle]['close']
            pnl = (current_price - entry_price) * (position_size / entry_price)
            pnl_percent = pnl / player.balance
            
            if simulator.check_liquidation(candle, duration, simulator.POSITION_SIZE_RATIO, pnl_percent):
                player.balance -= position_size
                player.liquidations_suffered += 1
                return []
        
        # Exit
        exit_price = price_data[exit_candle]['close']
        gross_pnl = (exit_price - entry_price) * (position_size / entry_price)
        trading_fee = position_size * simulator.TRADING_FEE_RATE
        net_pnl = gross_pnl - trading_fee
        
        player.balance += net_pnl
        player.total_fees_paid += trading_fee
        player.total_trades += 1
        if net_pnl > 0:
            player.winning_trades += 1
        
        return [{
            'entry_candle': entry_candle,
            'exit_candle': exit_candle,
            'entry_price': entry_price,
            'exit_price': exit_price,
            'gross_pnl': gross_pnl,
            'net_pnl': net_pnl,
            'fee': trading_fee
        }]

def run_trading_simulation(num_rounds=1000, players_per_type=25):
    """Run comprehensive trading simulation"""
    simulator = TradingGameSimulator()
    
    # Create different player types
    player_types = {
        'random': PlayerStrategy.random_trader,
        'hodl': PlayerStrategy.buy_and_hold,
        'scalper': PlayerStrategy.scalper,
        'dip_buyer': PlayerStrategy.dip_buyer
    }
    
    # Initialize players
    all_players = []
    for player_type in player_types:
        for i in range(players_per_type):
            all_players.append(Player(player_type))
    
    # Simulation results
    house_profits = []
    total_fees_collected = []
    total_liquidations = []
    round_data = []
    
    print(f"Running simulation with {num_rounds} rounds and {len(all_players)} players...")
    
    for round_num in range(num_rounds):
        if round_num % 100 == 0:
            print(f"Round {round_num}/{num_rounds}")
        
        # Generate price data for this round
        price_data = simulator.generate_realistic_price_data(seed=round_num)
        
        round_fees = 0
        round_liquidations = 0
        
        # Each player plays this round
        for player in all_players:
            if player.balance <= 0:
                continue
                
            strategy = player_types[player.type]
            trades = strategy(player, price_data, simulator)
            
            # Collect fees from this player's trades
            for trade in trades:
                round_fees += trade['fee']
        
        # Count liquidations this round
        round_liquidations = sum(1 for p in all_players if hasattr(p, '_round_liquidations'))
        
        # Reset liquidation tracking
        for player in all_players:
            if hasattr(player, '_round_liquidations'):
                delattr(player, '_round_liquidations')
        
        house_profit = round_fees  # Fees are immediate house profit
        house_profits.append(house_profit)
        total_fees_collected.append(round_fees)
        total_liquidations.append(round_liquidations)
        
        round_data.append({
            'round': round_num,
            'house_profit': house_profit,
            'fees_collected': round_fees,
            'liquidations': round_liquidations,
            'start_price': price_data[0]['close'],
            'end_price': price_data[-1]['close'],
            'price_change': (price_data[-1]['close'] - price_data[0]['close']) / price_data[0]['close']
        })
    
    return all_players, house_profits, round_data, simulator

def analyze_results(players, house_profits, round_data):
    """Analyze and display simulation results"""
    
    # Player analysis by type
    player_stats = {}
    for player_type in ['random', 'hodl', 'scalper', 'dip_buyer']:
        type_players = [p for p in players if p.type == player_type]
        
        balances = [p.balance for p in type_players]
        total_trades = sum(p.total_trades for p in type_players)
        total_wins = sum(p.winning_trades for p in type_players)
        total_fees = sum(p.total_fees_paid for p in type_players)
        total_liquidations = sum(p.liquidations_suffered for p in type_players)
        
        player_stats[player_type] = {
            'avg_balance': np.mean(balances),
            'median_balance': np.median(balances),
            'min_balance': np.min(balances),
            'max_balance': np.max(balances),
            'total_trades': total_trades,
            'win_rate': (total_wins / total_trades * 100) if total_trades > 0 else 0,
            'total_fees_paid': total_fees,
            'liquidation_rate': (total_liquidations / len(type_players) * 100),
            'avg_roi': ((np.mean(balances) - 1000) / 1000 * 100)
        }
    
    # House analysis
    total_house_profit = sum(house_profits)
    avg_profit_per_round = np.mean(house_profits)
    total_fees = sum(r['fees_collected'] for r in round_data)
    total_liquidation_events = sum(r['liquidations'] for r in round_data)
    
    # Print results
    print("\n" + "="*80)
    print("TRADING GAME SIMULATION RESULTS")
    print("="*80)
    
    print(f"\nHOUSE PERFORMANCE:")
    print(f"Total rounds: {len(round_data):,}")
    print(f"Total house profit: ${total_house_profit:,.2f}")
    print(f"Average profit per round: ${avg_profit_per_round:.2f}")
    print(f"Total fees collected: ${total_fees:,.2f}")
    print(f"Total liquidation events: {total_liquidation_events:,}")
    
    print(f"\nPLAYER PERFORMANCE BY TYPE:")
    for player_type, stats in player_stats.items():
        print(f"\n{player_type.upper()}:")
        print(f"  Average balance: ${stats['avg_balance']:,.2f}")
        print(f"  Median balance: ${stats['median_balance']:,.2f}")
        print(f"  Balance range: ${stats['min_balance']:,.2f} - ${stats['max_balance']:,.2f}")
        print(f"  Average ROI: {stats['avg_roi']:+.1f}%")
        print(f"  Total trades: {stats['total_trades']:,}")
        print(f"  Win rate: {stats['win_rate']:.1f}%")
        print(f"  Liquidation rate: {stats['liquidation_rate']:.1f}%")
        print(f"  Total fees paid: ${stats['total_fees_paid']:,.2f}")
    
    # Calculate house edge
    total_player_starting_balance = len(players) * 1000
    total_player_ending_balance = sum(p.balance for p in players)
    player_net_loss = total_player_starting_balance - total_player_ending_balance
    
    print(f"\nOVERALL STATISTICS:")
    print(f"Total player starting balance: ${total_player_starting_balance:,.2f}")
    print(f"Total player ending balance: ${total_player_ending_balance:,.2f}")
    print(f"Player net loss: ${player_net_loss:,.2f}")
    print(f"House edge: {(player_net_loss / total_player_starting_balance * 100):.2f}%")
    
    return player_stats, house_profits, round_data

def plot_results(player_stats, house_profits, round_data):
    """Create visualization plots"""
    plt.style.use('dark_background')
    neon_green = '#39FF14'
    
    # 1. Player balance distribution by type
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    fig.patch.set_facecolor('black')
    fig.suptitle('Player Performance by Strategy Type', color=neon_green, fontsize=16, fontweight='bold')
    
    player_types = ['random', 'hodl', 'scalper', 'dip_buyer']
    type_names = ['Random Trader', 'Buy & Hold', 'Scalper', 'Dip Buyer']
    
    for i, (player_type, name) in enumerate(zip(player_types, type_names)):
        ax = axes[i//2, i%2]
        stats = player_stats[player_type]
        
        # Create performance bars
        metrics = ['Avg ROI (%)', 'Win Rate (%)', 'Liquidation Rate (%)']
        values = [stats['avg_roi'], stats['win_rate'], stats['liquidation_rate']]
        colors = [neon_green if v >= 0 else 'red' for v in values]
        
        bars = ax.bar(metrics, values, color=colors, alpha=0.8)
        ax.set_title(f'{name}\nAvg Balance: ${stats["avg_balance"]:,.0f}', color='white')
        ax.tick_params(colors='white')
        ax.grid(True, alpha=0.3)
        
        # Add value labels
        for bar, value in zip(bars, values):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + (1 if height >= 0 else -3),
                   f'{value:.1f}%', ha='center', va='bottom' if height >= 0 else 'top', color='white')
    
    plt.tight_layout()
    plt.show()
    
    # 2. House profit over time
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10))
    fig.patch.set_facecolor('black')
    
    # Cumulative house profit
    cumulative_profit = np.cumsum(house_profits)
    rounds = range(len(house_profits))
    
    ax1.plot(rounds, cumulative_profit, color=neon_green, linewidth=2)
    ax1.set_title('Cumulative House Profit Over Time', color=neon_green, fontweight='bold')
    ax1.set_xlabel('Round Number', color='white')
    ax1.set_ylabel('Cumulative Profit ($)', color='white')
    ax1.tick_params(colors='white')
    ax1.grid(True, alpha=0.3)
    
    # House profit per round histogram
    ax2.hist(house_profits, bins=50, color=neon_green, alpha=0.8, edgecolor='black')
    ax2.axvline(np.mean(house_profits), color='red', linestyle='--', linewidth=2, 
                label=f'Mean: ${np.mean(house_profits):.2f}')
    ax2.set_title('House Profit Distribution Per Round', color=neon_green, fontweight='bold')
    ax2.set_xlabel('Profit per Round ($)', color='white')
    ax2.set_ylabel('Frequency', color='white')
    ax2.tick_params(colors='white')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.show()
    
    # 3. ROI comparison
    fig, ax = plt.subplots(figsize=(12, 8))
    fig.patch.set_facecolor('black')
    
    roi_values = [player_stats[pt]['avg_roi'] for pt in player_types]
    colors = [neon_green if roi >= 0 else 'red' for roi in roi_values]
    
    bars = ax.bar(type_names, roi_values, color=colors, alpha=0.8)
    ax.axhline(y=0, color='white', linestyle='-', alpha=0.5)
    ax.set_title('Average ROI by Player Strategy', color=neon_green, fontweight='bold')
    ax.set_ylabel('ROI (%)', color='white')
    ax.tick_params(colors='white')
    ax.grid(True, alpha=0.3)
    
    # Add value labels
    for bar, roi in zip(bars, roi_values):
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + (1 if height >= 0 else -2),
               f'{roi:+.1f}%', ha='center', va='bottom' if height >= 0 else 'top', 
               color='white', fontweight='bold')
    
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    # Run simulation
    players, house_profits, round_data, simulator = run_trading_simulation(
        num_rounds=1000, 
        players_per_type=25
    )
    
    # Analyze results
    player_stats, house_profits, round_data = analyze_results(players, house_profits, round_data)
    
    # Create visualizations
    plot_results(player_stats, house_profits, round_data)
    
    print(f"\nSimulation complete! Check the plots for detailed analysis.")