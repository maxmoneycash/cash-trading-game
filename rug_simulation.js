// Simulation of the liquidation/rug system to calculate true house edge
// Based on the current implementation in CandlestickChart.tsx

function simulateRugSystem() {
    // Parameters from the code
    const baseRugChance = 0.0004; // Updated value
    const candlesPerRound = 470; // 30 seconds at ~15.7 candles/second
    const simulations = 10000; // Number of rounds to simulate
    
    // Risk factors for position holding (from code)
    const riskFactors = {
        timeRiskAfter: 60, // Grace period candles
        maxTimeRisk: 0.003,
        maxSizeRisk: 0.002,
        maxLeverageRisk: 0.002,
        maxGreedRisk: 0.003,
        trendRisk: 0.001
    };
    
    let results = {
        rugRounds: 0,
        totalRugsWhileHolding: 0,
        totalRugsWhileIdle: 0,
        earlyRugs: 0, // Before candle 100
        lateRugs: 0,  // After candle 300
        averageRugCandle: 0,
        playerProfits: 0,
        playerLosses: 0
    };
    
    for (let round = 0; round < simulations; round++) {
        let rugOccurred = false;
        let rugCandle = -1;
        let holdingWhenRugged = false;
        
        // Simulate typical player behavior
        const startHoldingAt = Math.floor(Math.random() * 100) + 50; // Start holding between candles 50-150
        const holdDuration = Math.floor(Math.random() * 200) + 50; // Hold for 50-250 candles
        const positionSize = 0.3 + Math.random() * 0.4; // 30-70% of balance
        const leverage = 5 + Math.random() * 20; // 5-25x leverage
        
        for (let candle = 0; candle < candlesPerRound; candle++) {
            const isHolding = candle >= startHoldingAt && candle < startHoldingAt + holdDuration;
            
            // Calculate liquidation probability for this candle
            let liquidationProbability = baseRugChance;
            
            if (isHolding) {
                const positionDuration = candle - startHoldingAt;
                
                // Time risk (escalating for longer holds)
                if (positionDuration > 60) {
                    const timeRisk = Math.min(0.004, Math.pow((positionDuration - 60) / 200, 1.8) * 0.006);
                    liquidationProbability += timeRisk;
                }
                
                // Size risk (further reduced)
                if (positionSize > 0.7) {
                    const sizeRisk = Math.min(0.0005, (positionSize - 0.7) * 0.0005);
                    liquidationProbability += sizeRisk;
                }
                
                // Leverage risk (further reduced)
                if (leverage > 15) {
                    const leverageRisk = Math.min(0.0005, (leverage - 15) / 100 * 0.001);
                    liquidationProbability += leverageRisk;
                }
                
                // Simulate some greed risk (20% chance of being greedy, further reduced)
                if (Math.random() < 0.2 && positionDuration > 30) {
                    const greedRisk = Math.min(0.0008, Math.random() * 0.001);
                    liquidationProbability += greedRisk;
                }
                
                // Trend risk (30% chance of trading against trend, further reduced)
                if (Math.random() < 0.3) {
                    liquidationProbability += 0.0002;
                }
            }
            
            // Apply random multiplier
            const randomMultiplier = 0.5 + Math.random() * 1.5;
            liquidationProbability *= randomMultiplier;
            liquidationProbability = Math.min(0.01, liquidationProbability);
            
            // Check if rug occurs
            if (Math.random() < liquidationProbability) {
                rugOccurred = true;
                rugCandle = candle;
                holdingWhenRugged = isHolding;
                break;
            }
        }
        
        // Record results
        if (rugOccurred) {
            results.rugRounds++;
            results.averageRugCandle += rugCandle;
            
            if (holdingWhenRugged) {
                results.totalRugsWhileHolding++;
                // Player loses their position
                results.playerLosses += positionSize * 100; // Assume $100 starting balance
            } else {
                results.totalRugsWhileIdle++;
            }
            
            if (rugCandle < 100) results.earlyRugs++;
            if (rugCandle > 300) results.lateRugs++;
        } else {
            // No rug - simulate player trading outcome
            // Assume 60% chance of profit, 40% chance of loss on non-rug rounds
            if (Math.random() < 0.6) {
                // Profitable trade
                const profit = positionSize * (5 + Math.random() * 15); // 5-20% profit
                results.playerProfits += profit;
            } else {
                // Losing trade
                const loss = positionSize * (2 + Math.random() * 8); // 2-10% loss
                results.playerLosses += loss;
            }
        }
    }
    
    // Calculate statistics
    results.averageRugCandle = results.rugRounds > 0 ? results.averageRugCandle / results.rugRounds : 0;
    
    const rugFrequency = (results.rugRounds / simulations) * 100;
    const rugWhileHoldingRate = results.rugRounds > 0 ? (results.totalRugsWhileHolding / results.rugRounds) * 100 : 0;
    
    const totalBetsValue = simulations * 50; // Assume average $50 bet per round
    const netPlayerLoss = results.playerLosses - results.playerProfits;
    const houseEdge = (netPlayerLoss / totalBetsValue) * 100;
    
    console.log("=== RUG SYSTEM SIMULATION RESULTS ===");
    console.log(`Simulated rounds: ${simulations.toLocaleString()}`);
    console.log(`\nRUG FREQUENCY:`);
    console.log(`- Rounds with rugs: ${results.rugRounds.toLocaleString()} (${rugFrequency.toFixed(2)}%)`);
    console.log(`- Rugs while holding: ${results.totalRugsWhileHolding.toLocaleString()} (${rugWhileHoldingRate.toFixed(1)}% of rugs)`);
    console.log(`- Rugs while idle: ${results.totalRugsWhileIdle.toLocaleString()}`);
    console.log(`\nRUG TIMING:`);
    console.log(`- Average rug candle: ${results.averageRugCandle.toFixed(1)} (~${(results.averageRugCandle/15.7).toFixed(1)}s)`);
    console.log(`- Early rugs (<100 candles): ${results.earlyRugs} (${(results.earlyRugs/results.rugRounds*100).toFixed(1)}%)`);
    console.log(`- Late rugs (>300 candles): ${results.lateRugs} (${(results.lateRugs/results.rugRounds*100).toFixed(1)}%)`);
    console.log(`\nFINANCIAL IMPACT:`);
    console.log(`- Total player profits: $${results.playerProfits.toFixed(0)}`);
    console.log(`- Total player losses: $${results.playerLosses.toFixed(0)}`);
    console.log(`- Net player loss: $${netPlayerLoss.toFixed(0)}`);
    console.log(`- House edge: ${houseEdge.toFixed(2)}%`);
    console.log(`\nCOMPARISON:`);
    console.log(`- Crash game house edge: ~1-2%`);
    console.log(`- Slots house edge: ~5-15%`);
    console.log(`- Your game house edge: ${houseEdge.toFixed(2)}%`);
    
    return {
        rugFrequency,
        houseEdge,
        rugWhileHoldingRate,
        averageRugTime: results.averageRugCandle/15.7
    };
}

// Run the simulation
simulateRugSystem();