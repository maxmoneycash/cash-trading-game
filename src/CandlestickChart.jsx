import React, { useRef, useEffect, useState } from 'react';
import p5 from 'p5';

const CandlestickChart = () => {
    const chartRef = useRef();
    const p5InstanceRef = useRef();
    const [currentPrice, setCurrentPrice] = useState(0);
    const [balance, setBalance] = useState(1000);
    const [pnl, setPnl] = useState(0);
    const [candleCount, setCandleCount] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [showFireworks, setShowFireworks] = useState(false);

    // More realistic Bitcoin historical data simulation
    const generateBitcoinData = () => {
        const data = [];
        let price = 10; // Start at $10 instead of $0.0008 for playable values
        const startDate = new Date('2009-01-01');

        // Multiple sine wave layers for realistic market behavior
        const createSineWave = (period, amplitude, phase = 0) => (i) =>
            Math.sin((i * 2 * Math.PI / period) + phase) * amplitude;

        // Different wave layers
        const longTermTrend = createSineWave(1200, 0.3); // 3+ year cycles
        const mediumTerm = createSineWave(250, 0.15);    // ~8 month cycles
        const shortTerm = createSineWave(60, 0.08);      // ~2 month cycles
        const noise = createSineWave(12, 0.05);          // ~12 day cycles
        const microNoise = createSineWave(3, 0.02);      // 3 day cycles

        // Major Bitcoin events with their impact - REBALANCED
        const events = [
            { date: new Date('2010-05-22'), multiplier: 1.5, name: "First Bitcoin Pizza", duration: 30 },
            { date: new Date('2010-11-01'), multiplier: 1.8, name: "Mt. Gox Launch", duration: 45 },
            { date: new Date('2011-04-01'), multiplier: 2.5, name: "First Major Rally", duration: 60 },
            { date: new Date('2011-06-01'), multiplier: 0.2, name: "First Major Crash", duration: 90 },
            { date: new Date('2012-11-01'), multiplier: 1.5, name: "First Halving", duration: 120 },
            { date: new Date('2013-03-01'), multiplier: 3.0, name: "Cyprus Crisis", duration: 45 },
            { date: new Date('2013-04-01'), multiplier: 0.3, name: "Crash from $266", duration: 60 },
            { date: new Date('2013-11-01'), multiplier: 4.5, name: "China Interest", duration: 30 },
            { date: new Date('2013-12-01'), multiplier: 0.25, name: "China Ban", duration: 90 },
            { date: new Date('2014-02-01'), multiplier: 0.3, name: "Mt. Gox Collapse", duration: 120 }, // Added
            { date: new Date('2015-01-01'), multiplier: 0.4, name: "Extended Bear Market", duration: 180 }, // Added
            { date: new Date('2016-07-01'), multiplier: 1.7, name: "Second Halving", duration: 180 },
            { date: new Date('2017-01-01'), multiplier: 2.8, name: "Institutional Interest", duration: 90 },
            { date: new Date('2017-09-01'), multiplier: 0.35, name: "China Exchange Ban", duration: 45 }, // Added
            { date: new Date('2017-12-01'), multiplier: 5.5, name: "Retail FOMO", duration: 30 },
            { date: new Date('2018-01-01'), multiplier: 0.15, name: "Crypto Winter", duration: 365 },
            { date: new Date('2018-11-01'), multiplier: 0.3, name: "Hash War Crash", duration: 60 }, // Added
            { date: new Date('2020-03-01'), multiplier: 0.3, name: "COVID Crash", duration: 30 },
            { date: new Date('2020-05-01'), multiplier: 1.6, name: "Third Halving", duration: 120 },
            { date: new Date('2020-10-01'), multiplier: 2.2, name: "PayPal Integration", duration: 60 },
            { date: new Date('2021-02-01'), multiplier: 3.0, name: "Tesla Investment", duration: 90 },
            { date: new Date('2021-04-01'), multiplier: 0.4, name: "Regulation FUD", duration: 60 },
            { date: new Date('2021-05-01'), multiplier: 0.25, name: "China Mining Ban", duration: 90 }, // Added
            { date: new Date('2021-10-01'), multiplier: 1.8, name: "ETF Approval", duration: 45 }
        ];

        for (let i = 0; i < 3000; i++) { // Reasonable timeline
            const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);

            // Much more controlled growth - realistic for Bitcoin's actual growth
            const yearProgress = i / 365.25; // Years since start
            let baseGrowthMultiplier = 1;

            // Scaled up growth phases for playable values - REDUCED GROWTH
            if (yearProgress < 1) baseGrowthMultiplier = 1; // 2009: $10
            else if (yearProgress < 2) baseGrowthMultiplier = 1.8; // 2010: $18 (was 2.5)
            else if (yearProgress < 3) baseGrowthMultiplier = 5; // 2011: $50 (was 10)
            else if (yearProgress < 4) baseGrowthMultiplier = 12; // 2012: $120 (was 25)
            else if (yearProgress < 5) baseGrowthMultiplier = 40; // 2013: $400 (was 100)
            else if (yearProgress < 6) baseGrowthMultiplier = 20; // 2014: $200 (was 50) - bigger crash
            else if (yearProgress < 7) baseGrowthMultiplier = 15; // 2015: $150 (was 40) - extended bear
            else if (yearProgress < 8) baseGrowthMultiplier = 30; // 2016: $300 (was 80)
            else if (yearProgress < 9) baseGrowthMultiplier = 600; // 2017: $6,000 (was 1500)
            else if (yearProgress < 10) baseGrowthMultiplier = 200; // 2018: $2,000 (was 600) - bigger crash
            else if (yearProgress < 11) baseGrowthMultiplier = 350; // 2019: $3,500 (was 900)
            else if (yearProgress < 12) baseGrowthMultiplier = 1200; // 2020: $12,000 (was 3000)
            else baseGrowthMultiplier = 2000; // 2021+: $20,000 (was 5000)

            // Combine all sine wave layers for organic movement
            const trendWave = longTermTrend(i) + mediumTerm(i) + shortTerm(i) + noise(i) + microNoise(i);

            // Check for major events
            let eventMultiplier = 1;
            let eventVolatility = 1;
            for (const event of events) {
                const daysDiff = Math.abs(currentDate.getTime() - event.date.getTime()) / (24 * 60 * 60 * 1000);
                if (daysDiff < event.duration) {
                    const eventStrength = Math.max(0.1, 1 - (daysDiff / event.duration));
                    eventMultiplier *= (1 + (event.multiplier - 1) * eventStrength * 0.3); // Reduced event impact
                    eventVolatility *= (1 + eventStrength * 1.5); // Reduced volatility spike
                }
            }

            // Enhanced volatility with choppy alternating pattern
            const baseVolatility = 0.02 + Math.pow(Math.random(), 0.6) * 0.15; // 2% to 17% daily moves
            const choppiness = Math.sin(i * 0.3) * 0.5 + 0.5; // Choppy alternating pattern
            const alternatingBias = Math.sin(i * 0.8) * 0.3; // Creates alternating green/red periods

            // Massive drawdown periods (bear markets) - MORE FREQUENT
            const drawdownCycles = Math.sin(i * 0.0008) * 0.5; // Increased amplitude for bigger crashes
            const miniCrashes = Math.sin(i * 0.05) * 0.3; // Add mini crashes every ~20 candles
            const drawdownMultiplier = drawdownCycles < -0.15 ? 0.3 + (drawdownCycles + 0.15) * 2 : 1;

            // Random direction with more realistic distribution - ADD DOWNWARD BIAS
            const trendBias = trendWave * 0.4 + alternatingBias - 0.1; // Reduced trend strength, added -0.1 downward bias
            const randomFactor = (Math.random() - 0.52) * 2; // Slightly favor downward moves
            const direction = Math.sign(trendBias + randomFactor * 0.8 + miniCrashes);

            // Calculate current base price with controlled growth
            const basePrice = 10 * baseGrowthMultiplier;
            const currentBasePrice = basePrice * eventMultiplier * drawdownMultiplier;

            // Calculate price movement with higher volatility
            const volatility = baseVolatility * eventVolatility * (1 + choppiness * 0.7); // Increased from 0.5
            const moveSize = volatility * currentBasePrice * (0.5 + Math.random() * 0.8); // Bigger moves

            // More realistic OHLC generation
            const open = price;

            // Create realistic intraday patterns with more controlled wicks
            const wickMultiplier = 0.3 + Math.random() * 0.5; // 30-80% of move size for wicks
            const openToHigh = Math.random() * moveSize * wickMultiplier * (direction > 0 ? 1.2 : 0.5);
            const openToLow = Math.random() * moveSize * wickMultiplier * (direction < 0 ? 1.2 : 0.5);
            const openToClose = direction * moveSize * (0.4 + Math.random() * 0.6);

            // Ensure wicks aren't too extreme
            const maxWickSize = moveSize * 0.8; // Wicks shouldn't be more than 80% of the total move
            const high = open + Math.min(Math.abs(openToHigh), maxWickSize);
            const low = open - Math.min(Math.abs(openToLow), maxWickSize);
            const close = Math.max(low + 0.01, Math.min(high - 0.01, open + openToClose));

            // Gradually move price towards target base price
            const targetAdjustment = (currentBasePrice - price) * 0.02; // 2% convergence rate
            const adjustedClose = close + targetAdjustment;

            // Ensure realistic price constraints
            const finalOpen = Math.max(1, open); // Minimum $1
            const finalHigh = Math.max(finalOpen, high);
            const finalLow = Math.min(finalOpen, Math.max(1, low));
            const finalClose = Math.max(finalLow, Math.min(finalHigh, adjustedClose));

            data.push({
                date: new Date(currentDate),
                open: finalOpen,
                high: finalHigh,
                low: finalLow,
                close: finalClose
            });

            // Update price for next iteration
            price = finalClose;
        }

        return data;
    };

    useEffect(() => {
        const sketch = (p) => {
            let candles = [];
            let allRoundCandles = [];
            let currentIndex = 0;
            let animationSpeed = 2; // Fixed at 2x speed
            let isAnimating = true;
            let lastUpdate = 0;
            let candleWidth = p.windowWidth < 768 ? 4 : 6;
            let candleSpacing = p.windowWidth < 768 ? 6 : 8;
            let maxCandles = Math.floor(p.windowWidth / candleSpacing);
            let priceScale = { min: 0, max: 100 };
            let chartArea = { x: 30, y: 90, width: 0, height: 0 }; // Increased y from 80 to 90
            let gridAlpha = 0;
            let pulseAnimation = 0;

            // Round management system
            let roundStartTime = 0;
            let roundDuration = 30000; // 30 seconds in milliseconds
            let isRoundActive = false;
            let isHistoricalView = false;
            let zoomTransition = 0; // 0 = normal view, 1 = fully zoomed out
            let zoomStartTime = 0;

            // Position tracking - now supporting multiple trades per round
            let currentPosition = null; // Current active position
            let completedTrades = []; // All completed trades in this round
            let currentPnl = 0;
            let isHoldingPosition = false;

            const bitcoinData = generateBitcoinData();

            // Start a new round
            const startRound = () => {
                roundStartTime = p.millis();
                isRoundActive = true;
                isHistoricalView = false;
                zoomTransition = 0;
                completedTrades = [];
                currentPosition = null;
                currentPnl = 0;
                isHoldingPosition = false;
                setIsHolding(false);
                setPnl(0);
                allRoundCandles = [];
                candles = [];
            };

            // Check if round should end
            const checkRoundEnd = () => {
                if (!isRoundActive) return;

                const elapsed = p.millis() - roundStartTime;
                if (elapsed >= roundDuration) {
                    endRound();
                }
            };

            // End the current round and start historical view
            const endRound = () => {
                isRoundActive = false;

                // Close any active position
                if (currentPosition && isHoldingPosition) {
                    closePosition();
                }

                // Start zoom-out transition
                isHistoricalView = true;
                zoomStartTime = p.millis();

                // After 3 seconds of historical view, start new round
                setTimeout(() => {
                    startRound();
                }, 3000);
            };

            const updatePriceScale = (visible) => {
                if (visible.length === 0) return;

                let min = Infinity;
                let max = -Infinity;

                for (const candle of visible) {
                    min = Math.min(min, candle.low);
                    max = Math.max(max, candle.high);
                }

                // If we have positions, make sure they're visible in the scale
                if (currentPosition) {
                    min = Math.min(min, currentPosition.entryPrice);
                    max = Math.max(max, currentPosition.entryPrice);
                }

                // Include completed trades in the scale
                for (const trade of completedTrades) {
                    min = Math.min(min, trade.entryPrice);
                    max = Math.max(max, trade.exitPrice);
                }

                // Dynamic padding based on screen size and range
                const range = max - min;
                const isMobile = p.windowWidth < 768;

                // Less padding on mobile for better visibility
                const topPadding = range * (isMobile ? 0.08 : 0.10);    // 8% mobile, 10% desktop
                const bottomPadding = range * (isMobile ? 0.12 : 0.15); // 12% mobile, 15% desktop

                // Ensure minimum range for very stable prices
                const minRange = isMobile ? 5 : 10;
                if (range < minRange) {
                    const center = (min + max) / 2;
                    const halfRange = minRange / 2;
                    min = center - halfRange;
                    max = center + halfRange;
                }

                // Ensure we have valid min/max values
                if (!isFinite(min) || !isFinite(max) || min >= max) {
                    min = 0;
                    max = 100;
                }

                priceScale.min = Math.max(0, min - bottomPadding);
                priceScale.max = max + topPadding;
            };

            const drawTimer = () => {
                if (!isRoundActive || isHistoricalView) return;

                const elapsed = p.millis() - roundStartTime;
                const remaining = Math.max(0, roundDuration - elapsed);
                const seconds = Math.ceil(remaining / 1000);

                // Timer background
                p.fill(0, 0, 0, 150);
                p.noStroke();
                p.rect(chartArea.x + chartArea.width - 60, chartArea.y - 50, 55, 30, 5); // Reduced from 80/70

                // Timer text
                p.fill(255, 255, 255, 255);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(16);
                p.text(seconds + "s", chartArea.x + chartArea.width - 32, chartArea.y - 35); // Adjusted position

                // Progress bar
                const progress = remaining / roundDuration;
                p.fill(255, 68, 68);
                p.rect(chartArea.x + chartArea.width - 55, chartArea.y - 20, 45 * progress, 3); // Reduced from 75/60
            };

            const drawHistoricalOverlay = () => {
                if (!isHistoricalView) return;

                // Fade in the overlay
                zoomTransition = p.lerp(zoomTransition, 1, 0.05);

                // Semi-transparent overlay
                p.fill(0, 0, 0, 100 * zoomTransition);
                p.noStroke();
                p.rect(0, 0, p.width, p.height);

                // Historical view label - responsive sizing
                const isMobile = p.windowWidth < 768;
                p.fill(255, 255, 255, 255 * zoomTransition);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(isMobile ? 18 : 24);
                p.text('Round Summary', p.width / 2, isMobile ? 30 : 40);

                // Show round stats with mobile-friendly sizing
                const totalTrades = completedTrades.length;
                const profitableTrades = completedTrades.filter(t => t.netProfit > 0).length;
                const totalPnl = completedTrades.reduce((sum, t) => sum + t.netProfit, 0);

                p.textSize(isMobile ? 12 : 16);
                p.text("Trades: " + totalTrades + " | Profitable: " + profitableTrades, p.width / 2, isMobile ? 50 : 70);
                p.text("Total P&L: $" + totalPnl.toFixed(2), p.width / 2, isMobile ? 70 : 90);
            };

            const updateDisplay = (visible) => {
                if (visible.length === 0) return;

                const lastCandle = visible[visible.length - 1];

                setCurrentPrice(lastCandle.close);
                setCandleCount(visible.length);

                // Calculate PNL if in position
                if (currentPosition) {
                    // More realistic PNL calculation based on position size
                    const priceChange = lastCandle.close - currentPosition.entryPrice;
                    const newPNL = priceChange * currentPosition.shares;
                    currentPnl = newPNL;
                    setPnl(newPNL);
                }
            };

            const addCandle = (data) => {
                // Add to historical round candles with all properties
                allRoundCandles.push({
                    ...data,
                    animation: 1 // Ensure historical candles are fully visible
                });

                if (candles.length >= maxCandles) {
                    candles.shift();
                }

                candles.push({
                    ...data,
                    animation: 0
                });

                // Track candles elapsed if we have a position
                if (currentPosition) {
                    currentPosition.candlesElapsed++;
                }

                // Update elapsed counters for completed trades
                for (const trade of completedTrades) {
                    trade.candlesElapsed++;
                    trade.exitElapsed++;
                }
            };

            const drawGrid = () => {
                p.stroke(255, 255, 255, gridAlpha * 0.15);
                p.strokeWeight(0.5);

                const gridLines = p.width < 768 ? 5 : 8;

                for (let i = 0; i <= gridLines; i++) {
                    const y = chartArea.y + (chartArea.height * i / gridLines);
                    p.line(chartArea.x, y, chartArea.x + chartArea.width, y);
                }

                const verticalLines = Math.floor(p.width / (p.width < 768 ? 60 : 100));
                for (let i = 0; i <= verticalLines; i++) {
                    const x = chartArea.x + (chartArea.width * i / verticalLines);
                    p.line(x, chartArea.y, x, chartArea.y + chartArea.height);
                }
            };

            const drawPNLLine = (currentCandleWidth, currentCandleSpacing, visible) => {
                // Draw all completed trades from this round
                for (const trade of completedTrades) {
                    drawSinglePNLLine(trade, true, currentCandleWidth, currentCandleSpacing, visible);
                }

                // Draw current active position if any
                if (currentPosition) {
                    drawSinglePNLLine(currentPosition, false, currentCandleWidth, currentCandleSpacing, visible);
                }
            };

            const drawSinglePNLLine = (tradePosition, isCompleted, currentCandleWidth, currentCandleSpacing, visible) => {
                if (!tradePosition || visible.length === 0) return;

                const currentCandle = visible[visible.length - 1];

                // Calculate scale factor for historical view
                let scaleFactor = 1;
                if (isHistoricalView) {
                    const totalRequiredWidth = visible.length * currentCandleSpacing;
                    scaleFactor = totalRequiredWidth > chartArea.width ? chartArea.width / totalRequiredWidth : 1;
                }

                // Use fixed positions to avoid any animation dependencies
                const currentCandleX = isHistoricalView
                    ? chartArea.x + ((visible.length - 1) * currentCandleSpacing * scaleFactor)
                    : chartArea.x + chartArea.width - currentCandleWidth;

                const entryElapsed = tradePosition.candlesElapsed;
                const exitElapsed = isCompleted ? tradePosition.exitElapsed : 0;
                const exitPrice = isCompleted ? tradePosition.exitPrice : currentCandle.close;
                const tradePnl = isCompleted ? tradePosition.profit : currentPnl;

                // Map prices to Y coordinates
                const entryY = p.map(tradePosition.entryPrice, priceScale.min, priceScale.max,
                    chartArea.y + chartArea.height, chartArea.y);
                const exitY = p.map(exitPrice, priceScale.min, priceScale.max,
                    chartArea.y + chartArea.height, chartArea.y);

                // Calculate actual positions with scaling for historical view
                const actualEntryX = isHistoricalView
                    ? chartArea.x + ((visible.length - 1 - entryElapsed) * currentCandleSpacing * scaleFactor)
                    : currentCandleX - (entryElapsed * currentCandleSpacing);
                const actualExitX = isHistoricalView
                    ? chartArea.x + ((visible.length - 1 - exitElapsed) * currentCandleSpacing * scaleFactor)
                    : currentCandleX - (exitElapsed * currentCandleSpacing);

                // Determine start position
                let lineStartX, lineStartY;
                const entryXForSlope = actualEntryX + currentCandleWidth / 2;
                const exitXForSlope = actualExitX + currentCandleWidth / 2;

                // Special handling for brand new positions (candlesElapsed = 0)
                let adjustedExitXForSlope = exitXForSlope;
                let adjustedExitY = exitY;
                if (!isCompleted && entryElapsed === 0) {
                    // For new positions, create a visible horizontal line extending to the right
                    adjustedExitXForSlope = exitXForSlope + Math.min(currentCandleSpacing * 3, 60);
                    // Keep the same Y coordinate to make it perfectly horizontal
                    adjustedExitY = entryY;
                }

                const slope = (adjustedExitY - entryY) / (adjustedExitXForSlope - entryXForSlope);

                const entryIsVisible = actualEntryX >= chartArea.x;

                if (entryIsVisible) {
                    lineStartX = entryXForSlope;
                    lineStartY = entryY;
                } else {
                    lineStartX = chartArea.x;
                    const distanceFromActualEntry = chartArea.x - entryXForSlope;
                    lineStartY = entryY + (slope * distanceFromActualEntry);

                    // Constrain Y to reasonable bounds
                    const chartCenterY = chartArea.y + chartArea.height / 2;
                    const maxDeviation = chartArea.height * 0.35;

                    if (Math.abs(lineStartY - chartCenterY) > maxDeviation) {
                        lineStartY = lineStartY > chartCenterY
                            ? chartCenterY + maxDeviation
                            : chartCenterY - maxDeviation;
                    }

                    // Ensure within chart bounds
                    lineStartY = Math.max(
                        chartArea.y + 10,
                        Math.min(chartArea.y + chartArea.height - 10, lineStartY)
                    );
                }

                // Determine end position
                let lineEndX = adjustedExitXForSlope;
                let lineEndY = adjustedExitY;

                // Allow line to extend to the full chart width (no more clipping for price label)
                const finalEndX = Math.min(lineEndX, chartArea.x + chartArea.width - 5);

                // Special handling for brand new positions - draw immediately!
                if (!isCompleted && entryElapsed === 0) {
                    // Draw a simple horizontal line extending to the right
                    const immediateStartX = currentCandleX + currentCandleWidth / 2;
                    const immediateEndX = Math.min(immediateStartX + 80, chartArea.x + chartArea.width - 10);
                    const immediateY = entryY;

                    // Draw immediate line with white color to show it's just started
                    p.stroke(255, 255, 255, 255);
                    p.strokeWeight(3);
                    p.line(immediateStartX, immediateY, immediateEndX, immediateY);

                    // Draw entry point
                    p.fill(255, 255, 255, 255);
                    p.noStroke();
                    p.ellipse(immediateStartX, immediateY, 8, 8);
                    return; // Skip the complex logic for brand new positions
                }

                // Don't draw if the entire line is off-screen to the left
                if (finalEndX < lineStartX) return;

                // Draw PNL line
                const isProfit = tradePnl >= 0;
                const lineColor = isProfit ? [0, 255, 136] : [255, 68, 68];

                // Use slightly different opacity for completed vs active trades
                const alpha = isCompleted ? 180 : 255;

                // Glowing effect
                p.stroke(lineColor[0], lineColor[1], lineColor[2], alpha * 0.3);
                p.strokeWeight(6);
                p.line(lineStartX, lineStartY, finalEndX, lineEndY);

                // Main line
                p.stroke(lineColor[0], lineColor[1], lineColor[2], alpha);
                p.strokeWeight(3);
                p.line(lineStartX, lineStartY, finalEndX, lineEndY);

                // Entry point - always show for new positions, or when visible and not at same position as exit
                if (entryIsVisible && (entryElapsed === 0 || entryElapsed > exitElapsed)) {
                    p.fill(255, 255, 255, alpha);
                    p.noStroke();
                    p.ellipse(lineStartX, lineStartY, 8, 8);
                }
            };

            const drawCandles = (visible, currentCandleWidth, currentCandleSpacing) => {
                for (let dist = 0; dist < visible.length; dist++) {
                    const candle = visible[visible.length - 1 - dist];

                    // Ensure candle has animation property
                    if (candle.animation === undefined) {
                        candle.animation = 1; // Start fully animated for historical candles
                    } else {
                        candle.animation = p.lerp(candle.animation, 1, 0.12);
                    }

                    let candleX;
                    if (isHistoricalView) {
                        // During historical view, spread candles across entire chart width
                        // Ensure candles fit within bounds by adjusting for total width
                        const totalRequiredWidth = visible.length * currentCandleSpacing;
                        const scaleFactor = totalRequiredWidth > chartArea.width ? chartArea.width / totalRequiredWidth : 1;

                        // Reverse the order so oldest candles are on the left
                        const reversedIndex = visible.length - 1 - dist;
                        candleX = chartArea.x + (reversedIndex * currentCandleSpacing * scaleFactor);

                        // Ensure we don't exceed chart bounds
                        const maxX = chartArea.x + chartArea.width - currentCandleWidth;
                        candleX = Math.min(candleX, maxX);
                    } else {
                        // Normal view: position from right edge
                        candleX = chartArea.x + chartArea.width - currentCandleWidth - (dist * currentCandleSpacing);
                    }

                    // Skip if candle is off-screen - adjusted for smaller candles
                    if (candleX + currentCandleWidth < chartArea.x - 1 || candleX > chartArea.x + chartArea.width + 1) continue;

                    const openY = p.map(candle.open, priceScale.min, priceScale.max,
                        chartArea.y + chartArea.height, chartArea.y);
                    const closeY = p.map(candle.close, priceScale.min, priceScale.max,
                        chartArea.y + chartArea.height, chartArea.y);
                    const highY = p.map(candle.high, priceScale.min, priceScale.max,
                        chartArea.y + chartArea.height, chartArea.y);
                    const lowY = p.map(candle.low, priceScale.min, priceScale.max,
                        chartArea.y + chartArea.height, chartArea.y);

                    const isGreen = candle.close > candle.open;
                    const candleColor = isGreen ? [0, 255, 136] : [255, 255, 255]; // Reverted to original white for red candles

                    // Add subtle glow for recent candles (only in normal view)
                    if (!isHistoricalView && dist < 3) {
                        p.stroke(candleColor[0], candleColor[1], candleColor[2], 40 * candle.animation);
                        p.strokeWeight(2);
                        p.line(candleX + currentCandleWidth / 2, highY, candleX + currentCandleWidth / 2, lowY);
                    }

                    // Draw main wick
                    p.stroke(candleColor[0], candleColor[1], candleColor[2], 160 * candle.animation);
                    p.strokeWeight(1);
                    p.line(candleX + currentCandleWidth / 2, highY, candleX + currentCandleWidth / 2, lowY);

                    const bodyHeight = Math.abs(closeY - openY);
                    const bodyY = Math.min(openY, closeY);

                    // Subtle pulse for latest candle (only in normal view)
                    if (!isHistoricalView && dist === 0) {
                        const pulseSize = p.sin(pulseAnimation) * 1;
                        p.fill(candleColor[0], candleColor[1], candleColor[2], 25 * candle.animation);
                        p.noStroke();
                        p.rect(candleX - pulseSize, bodyY - pulseSize, currentCandleWidth + pulseSize * 2, Math.max(bodyHeight, 1) + pulseSize * 2, 1);
                    }

                    if (isGreen) {
                        p.fill(candleColor[0], candleColor[1], candleColor[2], 180 * candle.animation);
                        p.noStroke();
                        p.rect(candleX, bodyY, currentCandleWidth, Math.max(bodyHeight, 1), 1);
                    } else {
                        p.fill(12, 12, 12, 220 * candle.animation);
                        p.stroke(candleColor[0], candleColor[1], candleColor[2], 200 * candle.animation);
                        p.strokeWeight(1);
                        p.rect(candleX, bodyY, currentCandleWidth, Math.max(bodyHeight, 1), 1);
                    }

                    if (bodyHeight < 1) {
                        p.stroke(candleColor[0], candleColor[1], candleColor[2], 180 * candle.animation);
                        p.strokeWeight(1.5);
                        p.line(candleX, openY, candleX + currentCandleWidth, openY);
                    }
                }
            };

            const drawPriceLine = (visible) => {
                if (visible.length === 0) return;

                const lastCandle = visible[visible.length - 1];
                const priceLineY = p.map(lastCandle.close, priceScale.min, priceScale.max,
                    chartArea.y + chartArea.height, chartArea.y);

                // Draw price label in the right margin area
                const labelWidth = p.width < 768 ? 45 : 55; // Made wider for better readability
                const labelHeight = p.width < 768 ? 18 : 22; // Made taller
                const fontSize = p.width < 768 ? 10 : 12; // Increased font size

                // Position in the right margin (after the chart area)
                const labelX = chartArea.x + chartArea.width + 5; // 5px padding from chart edge

                // Add subtle glow effect based on price movement
                const priceChange = visible.length > 1 ? lastCandle.close - visible[visible.length - 2].close : 0;
                const glowIntensity = Math.min(Math.abs(priceChange) * 50, 30);

                // Subtle shadow/glow
                if (glowIntensity > 5) {
                    p.fill(247, 147, 26, glowIntensity);
                    p.noStroke();
                    p.rect(labelX - 2, priceLineY - labelHeight / 2 - 2, labelWidth + 4, labelHeight + 4, 6);
                }

                // Background with better contrast
                p.fill(247, 147, 26, 255);
                p.noStroke();
                p.rect(labelX, priceLineY - labelHeight / 2, labelWidth, labelHeight, 4);

                // Text with high contrast
                p.fill(0, 0, 0, 255);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(fontSize);
                p.textStyle(p.BOLD);
                const priceText = lastCandle.close < 100 ? lastCandle.close.toFixed(2) : lastCandle.close.toFixed(0);
                p.text(`$${priceText}`, labelX + labelWidth / 2, priceLineY);
            };

            const drawPriceLabels = () => {
                const fontSize = p.width < 768 ? 8 : 10; // Slightly larger for better readability
                const labelCount = p.width < 768 ? 5 : 7;

                p.fill(255, 255, 255, 120); // Slightly brighter
                p.textAlign(p.LEFT, p.CENTER);
                p.textSize(fontSize);

                for (let i = 0; i <= labelCount; i++) {
                    const y = chartArea.y + (chartArea.height * i / labelCount);
                    const price = p.map(i, 0, labelCount, priceScale.max, priceScale.min);
                    const priceText = price < 100 ? price.toFixed(2) : price.toFixed(0);
                    p.text(`$${priceText}`, chartArea.x + chartArea.width + 5, y); // Positioned properly
                }
            };

            // Position management functions
            const startPosition = () => {
                // Only allow new positions during active rounds
                if (currentPosition || candles.length === 0 || !isRoundActive || isHistoricalView) return;

                const lastCandle = candles[candles.length - 1];
                const currentBalance = balance;

                // Calculate position size (use 30% of balance) - reduced from 50%
                const positionSize = currentBalance * 0.3;
                const shares = positionSize / lastCandle.close;

                currentPosition = {
                    entryPrice: lastCandle.close,
                    shares: shares,
                    positionSize: positionSize,
                    candlesElapsed: 0 // Track how many candles have passed since entry
                };

                isHoldingPosition = true;
                setIsHolding(true);
                currentPnl = 0;
                setPnl(0);

                // Force immediate redraw to show the line
                p.redraw();
            };

            const closePosition = () => {
                if (!currentPosition || !isHoldingPosition) return;

                isHoldingPosition = false;
                setIsHolding(false);

                // Calculate profit and update balance
                const profit = currentPnl;

                // Apply a small trading fee (0.2% of position size)
                const tradingFee = currentPosition.positionSize * 0.002;
                const netProfit = profit - tradingFee;

                // Save the completed trade
                completedTrades.push({
                    ...currentPosition,
                    exitPrice: candles[candles.length - 1].close,
                    profit: profit,
                    netProfit: netProfit,
                    exitElapsed: 0
                });

                // Update balance immediately in React state
                setBalance(prevBalance => {
                    const newBalance = prevBalance + netProfit;
                    return newBalance;
                });

                // Show fireworks for profit (after fees)
                if (netProfit > 0) {
                    setShowFireworks(true);
                    setTimeout(() => setShowFireworks(false), 1000);
                }

                currentPosition = null;
                currentPnl = 0;
                setPnl(0);
            };

            p.setup = () => {
                p.createCanvas(p.windowWidth, p.windowHeight);
                p.strokeCap(p.ROUND);

                // Optimize chart area for mobile vs desktop
                const isMobile = p.windowWidth < 768;
                const leftMargin = isMobile ? 20 : 30;
                const rightMargin = isMobile ? 50 : 70; // Increased for Y-axis labels + wider orange box
                const topMargin = isMobile ? 70 : 90;
                const bottomMargin = isMobile ? 40 : 60;

                chartArea = {
                    x: leftMargin,
                    y: topMargin,
                    width: p.windowWidth - leftMargin - rightMargin,
                    height: p.windowHeight - topMargin - bottomMargin
                };

                // Recalculate candle dimensions and max candles for the new area
                candleWidth = isMobile ? 4 : 6;
                candleSpacing = isMobile ? 6 : 8;
                maxCandles = Math.floor(chartArea.width / candleSpacing);

                // Initialize first round
                startRound();
            };

            p.draw = () => {
                p.background(12, 12, 12);

                pulseAnimation += 0.1;

                // Check if round should end
                checkRoundEnd();

                // Fixed 2x speed - only animate if round is active
                if (isAnimating && isRoundActive && p.millis() - lastUpdate > (120 / animationSpeed)) {
                    if (currentIndex < bitcoinData.length) {
                        addCandle(bitcoinData[currentIndex]);
                        currentIndex++;
                        lastUpdate = p.millis();
                    }
                }

                const visible = isHistoricalView ? allRoundCandles : candles;

                // Temporarily adjust chart area for historical view on mobile
                let originalChartArea = null;
                if (isHistoricalView && p.windowWidth < 768) {
                    // Save original chart area
                    originalChartArea = { ...chartArea };

                    // Expand chart area for historical view
                    chartArea.x = 10;
                    chartArea.width = p.windowWidth - 20;
                    chartArea.y = 60;
                    chartArea.height = p.windowHeight - 80;
                }

                updatePriceScale(visible);
                updateDisplay(visible);

                let zoomProgress = 0;
                if (isHistoricalView) {
                    zoomProgress = Math.min(1, (p.millis() - zoomStartTime) / 1000);
                }

                let currentCandleWidth = candleWidth;
                let currentCandleSpacing = candleSpacing;
                if (isHistoricalView && visible.length > 0) {
                    // Calculate spacing to fit all candles across chart width
                    const availableWidth = chartArea.width;
                    const isMobile = p.windowWidth < 768;

                    // Account for candle width when calculating spacing
                    let targetSpacing = availableWidth / visible.length;

                    // Different minimum spacing for mobile vs desktop
                    const minSpacing = isMobile ? 1 : 2;
                    const maxSpacing = isMobile ? 20 : 50;

                    // Ensure minimum spacing and reasonable maximum
                    targetSpacing = Math.max(minSpacing, Math.min(targetSpacing, maxSpacing));

                    // Calculate target width based on spacing
                    let targetWidth = targetSpacing * 0.8; // 80% of spacing for candle width

                    // Ensure minimum width for visibility
                    const minWidth = isMobile ? 0.5 : 1;
                    targetWidth = Math.max(minWidth, Math.min(targetWidth, candleWidth));

                    // On mobile, if we have too many candles, reduce width further
                    if (isMobile && visible.length > 100) {
                        targetWidth = Math.max(minWidth, targetSpacing * 0.6);
                    }

                    currentCandleSpacing = p.lerp(candleSpacing, targetSpacing, zoomProgress);
                    currentCandleWidth = p.lerp(candleWidth, targetWidth, zoomProgress);
                }

                // Draw in optimal order for smoothness
                drawGrid();
                drawCandles(visible, currentCandleWidth, currentCandleSpacing);

                // Hide price line and labels during historical view on mobile to save space
                if (!(isHistoricalView && p.windowWidth < 768)) {
                    drawPriceLine(visible); // Draw price label before PNL line
                    drawPriceLabels(); // Y-axis labels back for professional look
                }

                drawPNLLine(currentCandleWidth, currentCandleSpacing, visible); // Draw PNL line last so it's on top
                drawTimer(); // Draw timer
                drawHistoricalOverlay(); // Draw historical overlay

                gridAlpha = p.lerp(gridAlpha, 40, 0.1);

                // Restore original chart area if it was modified
                if (originalChartArea) {
                    chartArea = originalChartArea;
                }
            };

            p.windowResized = () => {
                p.resizeCanvas(p.windowWidth, p.windowHeight);
                p.strokeCap(p.ROUND);

                // Optimize chart area for mobile vs desktop
                const isMobile = p.windowWidth < 768;
                const leftMargin = isMobile ? 20 : 30;
                const rightMargin = isMobile ? 50 : 70; // Increased for Y-axis labels + wider orange box
                const topMargin = isMobile ? 70 : 90;
                const bottomMargin = isMobile ? 40 : 60;

                chartArea = {
                    x: leftMargin,
                    y: topMargin,
                    width: p.windowWidth - leftMargin - rightMargin,
                    height: p.windowHeight - topMargin - bottomMargin
                };

                // Recalculate candle dimensions and max candles for the new area
                candleWidth = isMobile ? 4 : 6;
                candleSpacing = isMobile ? 6 : 8;
                maxCandles = Math.floor(chartArea.width / candleSpacing);
            };

            // Touch/mouse handlers for the chart canvas
            let touchActive = false;

            p.mousePressed = () => {
                if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
                    if (!touchActive) { // Prevent double triggering with touch
                        startPosition();
                    }
                    return false;
                }
            };

            p.mouseReleased = () => {
                if (!touchActive) { // Prevent double triggering with touch
                    closePosition();
                }
                return false;
            };

            p.touchStarted = (event) => {
                touchActive = true;
                startPosition();
                // Prevent all default behaviors
                if (event && event.preventDefault) {
                    event.preventDefault();
                }
                return false;
            };

            p.touchMoved = (event) => {
                // Keep the position open while finger moves
                // Prevent all default behaviors
                if (event && event.preventDefault) {
                    event.preventDefault();
                }
                return false;
            };

            p.touchEnded = (event) => {
                touchActive = false;
                closePosition();
                // Prevent all default behaviors
                if (event && event.preventDefault) {
                    event.preventDefault();
                }
                return false;
            };
        };

        p5InstanceRef.current = new p5(sketch, chartRef.current);

        return () => {
            if (p5InstanceRef.current) {
                p5InstanceRef.current.remove();
            }
        };
    }, []); // Removed balance dependency to prevent chart resets

    // Prevent scrolling and unwanted mobile behaviors
    useEffect(() => {
        // Prevent scroll
        const preventScroll = (e) => e.preventDefault();

        // Prevent context menu on long press
        const preventContextMenu = (e) => {
            e.preventDefault();
            return false;
        };

        // Prevent selection on double tap
        const preventSelection = (e) => {
            e.preventDefault();
            return false;
        };

        // Add event listeners
        document.body.addEventListener('touchmove', preventScroll, { passive: false });
        document.addEventListener('contextmenu', preventContextMenu);
        document.addEventListener('selectstart', preventSelection);
        document.addEventListener('selectionchange', preventSelection);

        // Disable pinch zoom on iOS
        document.addEventListener('gesturestart', preventScroll);
        document.addEventListener('gesturechange', preventScroll);
        document.addEventListener('gestureend', preventScroll);

        // Clean up
        return () => {
            document.body.removeEventListener('touchmove', preventScroll);
            document.removeEventListener('contextmenu', preventContextMenu);
            document.removeEventListener('selectstart', preventSelection);
            document.removeEventListener('selectionchange', preventSelection);
            document.removeEventListener('gesturestart', preventScroll);
            document.removeEventListener('gesturechange', preventScroll);
            document.removeEventListener('gestureend', preventScroll);
        };
    }, []);

    const formatPnl = (value) => {
        return value.toFixed(2);
    };

    const formatPrice = (price) => {
        return price < 100 ? price.toFixed(2) : price.toFixed(0);
    };

    return (
        <div style={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent',
            cursor: 'pointer'
        }}>
            <div ref={chartRef} style={{
                width: '100%',
                height: '100%',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                touchAction: 'none',
                WebkitTouchCallout: 'none',
                WebkitTapHighlightColor: 'transparent'
            }}></div>

            {/* Hold Indicator */}
            {isHolding && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 255, 136, 0.9)',
                    color: 'black',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    animation: 'pulse 1s infinite',
                    zIndex: 1000
                }}>
                    HOLDING POSITION
                </div>
            )}

            {/* Live PNL Display */}
            {isHolding && (
                <div style={{
                    position: 'absolute',
                    top: '60px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: pnl >= 0 ? 'rgba(0, 255, 136, 0.9)' : 'rgba(255, 68, 68, 0.9)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '15px',
                    fontSize: window.innerWidth < 768 ? '18px' : '24px',
                    fontWeight: 'bold',
                    zIndex: 1000,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    {pnl >= 0 ? '+' : ''}${formatPnl(pnl)}
                </div>
            )}

            {/* Fireworks */}
            {showFireworks && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 999
                }}>
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                width: '40px',
                                height: '40px',
                                background: 'radial-gradient(circle, #ffff00 2px, transparent 2px)',
                                backgroundSize: '8px 8px',
                                animation: `firework 0.8s ease-out ${Math.random() * 0.3}s`,
                                opacity: 0
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Game Stats */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: window.innerWidth < 768 ? '14px' : '16px',
                fontWeight: 'bold',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                Balance: ${balance.toFixed(0)}
            </div>

            {/* Price Display */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: window.innerWidth < 768 ? '14px' : '16px',
                fontWeight: 'bold',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                ${formatPrice(currentPrice)}
            </div>

            {/* Instructions */}
            {!isHolding && (
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    fontSize: window.innerWidth < 768 ? '12px' : '14px',
                    fontWeight: '500',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'center'
                }}>
                    Hold to Buy<br />Release to Sell
                </div>
            )}

            <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes firework {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          100% { transform: scale(1) rotate(180deg); opacity: 0; }
        }
        
        /* Prevent text selection and Safari highlighting */
        * {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Prevent image dragging */
        img {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
        }
        
        /* Ensure the entire app prevents selection */
        html, body {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          overflow: hidden;
          position: fixed;
          width: 100%;
          height: 100%;
        }
      `}</style>
        </div>
    );
};

export default CandlestickChart;
