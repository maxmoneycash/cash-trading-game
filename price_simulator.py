"""
import pandas as pd
from pricegenerator import PriceGenerator
import random
import math
import statistics

# Parameters from the game's generateBitcoinData function
HORIZON = 3000  # Number of candles to generate (daily)
START_PRICE = 10  # Starting price
MIN_CLOSE = 5  # Minimum price constraint
MAX_BODY_RATIO = 0.8  # Max body as % of range
OUTLIERS_PROB = 0.05  # Chance of large wicks
UP_CANDLE_PROB = 0.5  # Balanced up/down
TIMEFRAME = 1440  # Minutes in a day (for daily candles)
TREND_DEVIATION = 0.005  # For trend detection

# Simulation parameters
NUM_SIMULATIONS = 10000  # Number of full price series to generate
CANDLES_PER_ROUND = 470  # ~30 seconds at 15.7 candles/sec
BASE_RUG_CHANCE = 0.0001  # From updated code
MULTIPLIER_MIN = 0.5
MULTIPLIER_MAX = 2.0
AVERAGE_PROFIT_NON_RUG = 0.10  # 10% profit in non-rug rounds (assumption)
AVERAGE_LOSS_RUG = 0.75  # 75% loss if rug while holding (assumption)
HOLD_PROB = 0.5  # Chance player is holding during rug

def generate_price_series():
    pg = PriceGenerator()
    pg.horizon = HORIZON
    pg.initClose = START_PRICE
    pg.minClose = MIN_CLOSE
    pg.maxClose = START_PRICE * 450  # Max growth from game (to ~$4500)
    pg.maxCandleBody = pg.maxOutlier * MAX_BODY_RATIO
    pg.upCandlesProb = UP_CANDLE_PROB
    pg.outliersProb = OUTLIERS_PROB
    pg.trendDeviation = TREND_DEVIATION
    pg.timeframe = pd.Timedelta(minutes=TIMEFRAME)  # Daily
    pg.Generate()
    return pg.prices  # Returns Pandas DataFrame with OHLC

def simulate_rug_in_round(candles_per_round, base_rug_chance, hold_prob):
    rug_occurred = False
    for _ in range(candles_per_round):
        m = random.uniform(MULTIPLIER_MIN, MULTIPLIER_MAX)
        p_l = min(0.01, base_rug_chance * m)  # Simplified baseline (idle case)
        if random.random() < p_l:
            rug_occurred = True
            is_holding = random.random() < hold_prob
            if is_holding:
                return -AVERAGE_LOSS_RUG  # Loss if holding during rug
            else:
                return 0  # No direct loss if not holding
    # No rug: profit
    return AVERAGE_PROFIT_NON_RUG

def run_simulation(num_simulations):
    returns = []
    rugs = 0
    total_loss = 0
    total_profit = 0

    for _ in range(num_simulations):
        # Generate full series (for insights on generator)
        series = generate_price_series()
        
        # Simulate round on subset
        round_return = simulate_rug_in_round(CANDLES_PER_ROUND, BASE_RUG_CHANCE, HOLD_PROB)
        returns.append(round_return)
        
        if round_return < 0:
            rugs += 1
            total_loss += abs(round_return)
        elif round_return > 0:
            total_profit += round_return

    # Stats
    rug_frequency = rugs / num_simulations
    avg_return = statistics.mean(returns)
    house_edge = -avg_return  # Positive for house
    rtp = 1 + avg_return  # Assuming bet=1, RTP=expected return
    variance = statistics.variance(returns)

    # Generator insights from last series
    series_stats = series.describe()
    up_candles = (series['close'] > series['open']).mean()

    return {
        'rug_frequency': rug_frequency,
        'house_edge': house_edge,
        'rtp': rtp,
        'variance': variance,
        'avg_profit_non_rug': total_profit / (num_simulations - rugs) if (num_simulations - rugs) > 0 else 0,
        'avg_loss_rug': total_loss / rugs if rugs > 0 else 0,
        'generator_insights': {
            'mean_close': series_stats['close']['mean'],
            'std_close': series_stats['close']['std'],
            'up_candle_ratio': up_candles
        }
    }

if __name__ == "__main__":
    results = run_simulation(NUM_SIMULATIONS)
    print("Simulation Results:")
    for key, value in results.items():
        if isinstance(value, dict):
            print(f"{key}:")
            for subkey, subvalue in value.items():
                print(f"  {subkey}: {subvalue}")
        else:
            print(f"{key}: {value}")
""" 
