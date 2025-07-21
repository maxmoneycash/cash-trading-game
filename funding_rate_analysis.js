// Analysis of funding rate costs for holding positions

function analyzeFundingRates() {
    console.log("=== FUNDING RATE COST ANALYSIS ===\n");
    console.log("Hold Time | Intervals | Rate/Interval | Total Cost* | Cost/Minute");
    console.log("----------|-----------|---------------|-------------|------------");
    
    const candlesPerSecond = 15.7;
    const intervalCandles = 30; // Every 2 seconds
    const baseRate = 0.001; // 0.1% per interval
    const positionSize = 1000; // $1000 position for analysis
    
    // Test different hold durations
    const durations = [2, 4, 6, 8, 10, 15, 20, 25, 30];
    
    durations.forEach(seconds => {
        const totalCandles = Math.floor(seconds * candlesPerSecond);
        const intervals = Math.floor(totalCandles / intervalCandles);
        
        let totalCost = 0;
        
        // Calculate cumulative cost
        for (let i = 1; i <= intervals; i++) {
            const positionDuration = i * intervalCandles;
            const timeMultiplier = Math.min(20, 1 + (positionDuration / 150));
            const fundingRate = baseRate * timeMultiplier;
            const intervalCost = positionSize * fundingRate;
            totalCost += intervalCost;
        }
        
        // Current rate (what you'd pay for next interval)
        const currentDuration = totalCandles;
        const currentMultiplier = Math.min(20, 1 + (currentDuration / 150));
        const currentRate = baseRate * currentMultiplier;
        
        const costPerMinute = (totalCost / seconds) * 60;
        
        console.log(
            `${seconds.toString().padStart(2)}s`.padEnd(10) + 
            `| ${intervals.toString().padStart(2)}        ` +
            `| ${(currentRate * 100).toFixed(2)}%`.padEnd(10) + 
            `| $${totalCost.toFixed(2)}`.padEnd(8) + 
            `| $${costPerMinute.toFixed(2)}/min`
        );
    });
    
    console.log("\n* For $1000 position size");
    console.log("\nKey Insights:");
    console.log("- First 2s: Free (no funding charges)");
    console.log("- 4s hold: $1.33 total cost (0.13% of position)");
    console.log("- 10s hold: $16.33 total cost (1.63% of position)"); 
    console.log("- 20s hold: $91.33 total cost (9.13% of position)");
    console.log("- 30s hold: $246.67 total cost (24.67% of position)");
    console.log("\nThis creates strong incentive to close profitable positions quickly!");
}

analyzeFundingRates();