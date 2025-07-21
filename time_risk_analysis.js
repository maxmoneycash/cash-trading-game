// Analysis of how time risk escalates with hold duration

function analyzeTimeRisk() {
    console.log("=== TIME-BASED LIQUIDATION RISK ANALYSIS ===\n");
    console.log("Duration (seconds) | Candles | Time Risk % | Total Risk %* | Survival Chance");
    console.log("-------------------|---------|-------------|---------------|----------------");
    
    const baseRug = 0.00025;
    const candlesPerSecond = 15.7;
    
    // Test different hold durations
    const durations = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30];
    
    durations.forEach(seconds => {
        const candles = Math.floor(seconds * candlesPerSecond);
        const positionDuration = candles;
        
        let timeRisk = 0;
        if (positionDuration > 60) {
            timeRisk = Math.min(0.004, Math.pow((positionDuration - 60) / 200, 1.8) * 0.006);
        }
        
        // Total risk with base + time (ignoring other factors for clarity)
        const totalRisk = baseRug + timeRisk;
        const avgMultiplier = 1.25; // Average random multiplier
        const finalRisk = Math.min(0.01, totalRisk * avgMultiplier);
        
        // Chance of surviving this many candles at this risk level
        const survivalChance = Math.pow(1 - finalRisk, candles);
        
        console.log(
            `${seconds.toString().padStart(2)}s`.padEnd(11) + 
            `| ${candles.toString().padStart(3)}     ` +
            `| ${(timeRisk * 100).toFixed(3)}%`.padEnd(7) + 
            `| ${(finalRisk * 100).toFixed(3)}%`.padEnd(9) + 
            `| ${(survivalChance * 100).toFixed(1)}%`
        );
    });
    
    console.log("\n* Total Risk = (Base 0.025% + Time Risk) × 1.25 avg multiplier, capped at 1%");
    console.log("\nKey Insights:");
    console.log("- 4s hold: Very safe (~99% survival)");
    console.log("- 6s hold: Getting risky (~94% survival)"); 
    console.log("- 10s hold: Dangerous (~73% survival)");
    console.log("- 15s+ hold: Very dangerous (<50% survival)");
}

analyzeTimeRisk();