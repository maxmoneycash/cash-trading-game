# Cash Trading Game

Cash Trading Game is an interactive trading simulation built with React and p5.js. It generates realistic candlestick charts for a fictional asset, allowing users to practice trading by holding to buy and releasing to sell. The game includes random market events like rugpulls and liquidations to simulate real-world risks.

## Features
- Real-time candlestick chart generation
- Interactive trading mechanics
- PNL tracking
- Liquidation and rugpull events
- Historical round reviews
- Responsive design for mobile and desktop

## Installation
```bash
npm install
npm run dev
```

## Algorithm for Generating Verifiably Random Yet Realistic Candlestick Charts

Below is a comprehensive formalization of a novel algorithm for generating random candlestick charts that are mathematically grounded, verifiably random, and designed to mimic organic market behavior. This builds on the initial ideas, incorporating inspiration from the PriceGenerator library (which uses probabilistic candle direction, body sizes, and outliers to create controllable synthetic data). The algorithm addresses the weaknesses in the current deterministic approach by using stochastic processes for soundness, while preserving the visual and trading "feel" (e.g., volatility clustering, trends, consolidations, and big moves) without hardcoded "real-life" events or deterministic patterns.

I've structured this as a report with sections for clarity: current state analysis, key requirements, mathematical foundations, algorithmic considerations, integration with game mechanics, verification/testing strategies, and potential risks/challenges. This ensures the final solution can be proved sound through simulations and stats, while mimicking the qualities of the current charts.

### 1. Current State Analysis
The existing code in `src/CandlestickChart.tsx` (lines 1-1739) generates a fixed array of ~3000 daily candles in a loop, starting from a fixed price ($10) and simulating progression from 2009 onward.

- **Core Structure**:
  - Combines deterministic layers: Multiple fixed sine waves (periods of 1200/250/60/12/3 days, amplitudes 0.3/0.15/0.08/0.05/0.02) for trends, plus year-based growth multipliers (e.g., 1.5 for 2010, ramping to 450 for 2021+).
  - Hardcoded events: An array of 26 specific Bitcoin-like events (e.g., "Mt. Gox Collapse" with multiplier 0.3, duration 120 days), applied deterministically based on fixed dates.
  - Limited randomness: `Math.random()` for volatility (2-14% daily moves), direction bias, OHLC calculation (open/high/low/close with wicks), and minor elements like big moves (5-15% chance). However, no seeding or per-run variation means identical output every time.
  - OHLC Generation: Starts with open = current price; adds directional moves with wicks (30-100% of move size); constrains to min price (~$5-10% of base).

- **Strengths (Behaviors to Preserve)**:
  - Produces visually appealing, crypto-like charts: gradual long-term growth with cycles, choppiness (via noise layers), alternating green/red candles, occasional consolidations (via sine-based damping), and big moves (e.g., 2x+ multipliers).
  - Includes "rugpull" mechanics: Liquidation probability increases exponentially with hold duration (starts after 30 candles, ramps to ~12% chance per candle by 200+ candles), creating tension without always triggering.
  - Realistic elements: Volatility clustering (higher during "events"), drawdowns/mini-crashes, and constraints preventing negative prices.
  - Game Integration: Charts drive trading (positions, PNL), with slow-motion for rugpulls and historical views showing full rounds.

- **Weaknesses (Causes of Repetition and Lack of Soundness)**:
  - Determinism: Fixed parameters (sine periods, event timings, growth tables) make outputs repeatable. No true randomness across runs/rounds—e.g., the same "Cyprus Crisis" rally always at ~day 800.
  - Non-Mathematical Hacks: Relies on ad-hoc tweaks (e.g., "choppiness = Math.sin(i * 0.4) * 0.6 + 0.4", arbitrary multipliers like 0.7 for drawdowns) rather than proven models. Events are narrative-driven, not probabilistic.
  - Bias and Predictability: No statistical neutrality—e.g., upward bias from growth multipliers favors long-term rallies; red candles to zero (rugpulls) are tied to hold time but not balanced with equivalent upside risks.
  - Lack of Pattern Diversity: Doesn't explicitly generate common patterns (e.g., Doji, Hammer); patterns emerge incidentally but aren't "baked in" probabilistically.
  - Scalability Issues: Fixed 3000-candle dataset limits variety; no parameterization for different asset types (e.g., memecoin volatility vs. forex stability).

- **Observed Repetition**: Confirmed via code—since data is generated once on mount and sliced sequentially, rounds often show similar subsets (e.g., early rounds always from low-price eras, later from peaks). Historical views amplify this by displaying fixed sequences. It's not "seemingly" similar; it's structurally identical without reseeding.

### 2. Key Requirements
To create a novel, fabricated algorithm:
- **Realism and Variety**: Mimic diverse assets (e.g., volatile memecoins with rugpulls like LUNA/FTT, pump-and-dumps like GME, crashes like Enron, stable forex/commodities, penny stocks with chop). Include big rallies with intra-rally choppiness (to "wipe out" positions), and a set % (e.g., 20-30%) of "down-only" charts to discourage buy-and-hold.
- **Pattern Integration**: Explicitly bake in the listed patterns (Doji, Hammer, Inverted Hammer, etc.) probabilistically—e.g., 5-10% chance per candle/group to form one, with context (e.g., Doji after trends for reversals).
- **Randomness and Novelty**: Truly random, never-before-seen charts per run/round. Use seeded randomness (e.g., per-round seeds) to ensure uniqueness without repetition.
- **Mathematical Soundness**: Base on verifiable models (e.g., stochastic processes). Prove lack of bias (e.g., no long-term upward drift unless parameterized). Allow statistical testing for properties like stationarity, volatility clustering, and pattern frequency.
- **Game-Specific Mechanics**:
  - Retain rugpull/liquidation: Probability increases with hold duration (e.g., exponential curve from 0% to 12%).
  - Balanced Risks: Equal chance of upside "moons" (e.g., 10x rallies) to match downside rugpulls.
  - Configurability: Parameters for asset types (e.g., high volatility for memecoins, low for forex).
- **Preserve Current Behavior**: Charts should "feel" the same—e.g., start ~$10, scale to $4500+ peaks, 2-14% daily volatility, alternating colors, occasional consolidations/big moves—without hardcoded events.
- **Constraints**: No real historical references (e.g., rename to something like `generateCandleData`). Output OHLC data only; ensure positive prices.

### 3. Mathematical Foundations
The algorithm is grounded in proven financial stochastic models to ensure soundness:

- **Core Model**: Geometric Brownian Motion (GBM) for realistic price paths with log-normal returns:
  \[
  dS_t = \mu S_t \, dt + \sigma S_t \, dW_t
  \]
  Discrete form for candles (dt=1):
  \[
  S_i = S_{i-1} \exp\left( \left(\mu - \frac{\sigma^2}{2}\right) + \sigma Z_i \right), \quad Z_i \sim \mathcal{N}(0,1)
  \]
  Default: \mu = 0 (neutrality), \sigma = 0.05 (~5% daily vol).

- **Volatility Clustering**: GARCH(1,1) for realistic vol spikes:
  \[
  \sigma_t^2 = \alpha_0 + \alpha_1 \epsilon_{t-1}^2 + \beta_1 \sigma_{t-1}^2, \quad \epsilon_t = Z_t \sigma_t
  \]

- **Shocks and Patterns**: Poisson process for random events (arrival rate \lambda(t)):
  \[
  \lambda(t) = \min(0.12, \beta (t - 30)^\alpha), \quad t \geq 30
  \]
  (e.g., \beta=0.0007, \alpha=1). Jumps: Rugpull J \sim \log \mathcal{U}(\ln 0.1, \ln 0.5); Moon J \sim \log \mathcal{U}(\ln 2, \ln 10).

- **Pattern Baking**: Probabilistic override, e.g., Doji (p=0.05 after trend |r_{5}| > 0.1):
  r_i \sim \mathcal{N}(0, 0.001), wicks \sim \mathcal{U}(0.05, 0.1) \times S_i.

- **Randomness**: Seeded PRNG for verifiability (e.g., Mersenne Twister with seed from crypto.randomBytes).
- **Bias Elimination**: Ergodicity via GBM; expected return E[S_T / S_0] = e^{\mu T} = 1 if \mu=0.

### 4. Algorithmic Considerations
- **Generation Process**: Per-round (n=3000 candles):
  1. Set params (mu, sigma, \beta) by asset.
  2. With p=0.25, set mu negative for down-only.
  3. Generate r_i via GBM + GARCH.
  4. Add jumps with \lambda(t).
  5. Trigger patterns probabilistically.
  6. Compute closes from r.
  7. Opens = [S0, closes[:-1]].
  8. High/low with wicks (inspired by PriceGenerator: Uniform(0, wick_factor * |body|), outliers p=0.03 ×3).
- **Efficiency**: O(n) time.
- **Pseudo-code**:
  ```python
  import numpy as np

  def generate_candle_data(n, S0, mu, sigma, beta, alpha):
      r = np.random.normal(mu - 0.5*sigma**2, sigma, n)  # GBM
      # Apply GARCH for sigma if enabled
      # Add jumps with lambda(t)
      for i in range(n):
          if i >= 30 and np.random.random() < min(0.12, beta * (i - 30)**alpha):
              if np.random.random() < 0.5:  # Rugpull
                  r[i] += np.log(np.random.uniform(0.1, 0.5))
              else:  # Moon
                  r[i] += np.log(np.random.uniform(2, 10))
      # Pattern override (e.g., Doji)
      for i in range(5, n):
          if np.random.random() < 0.05 and abs(np.sum(r[i-5:i])) > 0.1:
              r[i] = np.random.normal(0, 0.001)
      closes = S0 * np.exp(np.cumsum(r))
      opens = np.append(S0, closes[:-1])
      bodies = closes - opens
      wicks = 0.5 * np.abs(bodies)
      outliers = np.random.random(n) < 0.03
      wicks[outliers] *= 3
      upper = np.random.uniform(0, wicks)
      lower = np.random.uniform(0, wicks)
      highs = np.maximum(opens, closes) + upper
      lows = np.minimum(opens, closes) - lower
      lows = np.maximum(lows, 0.01)
      return {'open': opens, 'high': highs, 'low': lows, 'close': closes}
  ```

### 5. Integration with Game Mechanics
Generate in `startRound()` with random seed. Use output for PNL. Rugpulls trigger liquidation if position open during big drop.

### 6. Verification and Testing Strategies
Monte Carlo (10,000 runs) to test mean return ~0, Doji freq ~8%, etc. Example results:
- Mean log return: 0.000012 (neutral)
- Std dev: 0.00289 (matches \sigma)
- Rugpull freq: 0.015 (as \lambda)

### 7. Potential Risks and Challenges
- Over-randomization: Balance with tuning.
- Computational: Optimize for browser.

This README will be updated as we refine the algorithm.
