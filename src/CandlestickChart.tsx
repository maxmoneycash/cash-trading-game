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
    const [showLiquidation, setShowLiquidation] = useState(false);
    const [rugpullType, setRugpullType] = useState(null);
    const [displayPnl, setDisplayPnl] = useState(0); // Animated display value

    // Smooth PNL animation
    useEffect(() => {
        const animationDuration = 300; // milliseconds
        const steps = 30;
        const stepDuration = animationDuration / steps;
        const difference = pnl - displayPnl;
        const increment = difference / steps;

        if (Math.abs(difference) < 0.01) {
            setDisplayPnl(pnl);
            return;
        }

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            if (currentStep >= steps) {
                setDisplayPnl(pnl);
                clearInterval(interval);
            } else {
                setDisplayPnl(prev => prev + increment);
            }
        }, stepDuration);

        return () => clearInterval(interval);
    }, [pnl]);

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

            // More realistic price ranges that avoid obvious floors/ceilings
            const yearProgress = i / 365.25; // Years since start
            let baseGrowthMultiplier = 1;

            // More realistic and less predictable growth phases
            if (yearProgress < 1) baseGrowthMultiplier = 1; // 2009: $10
            else if (yearProgress < 2) baseGrowthMultiplier = 1.5; // 2010: $15
            else if (yearProgress < 3) baseGrowthMultiplier = 3; // 2011: $30
            else if (yearProgress < 4) baseGrowthMultiplier = 8; // 2012: $80
            else if (yearProgress < 5) baseGrowthMultiplier = 25; // 2013: $250
            else if (yearProgress < 6) baseGrowthMultiplier = 18; // 2014: $180 - less dramatic crash
            else if (yearProgress < 7) baseGrowthMultiplier = 22; // 2015: $220 - less obvious bottom
            else if (yearProgress < 8) baseGrowthMultiplier = 35; // 2016: $350
            else if (yearProgress < 9) baseGrowthMultiplier = 180; // 2017: $1,800 - less extreme rally
            else if (yearProgress < 10) baseGrowthMultiplier = 85; // 2018: $850 - less dramatic crash
            else if (yearProgress < 11) baseGrowthMultiplier = 110; // 2019: $1,100
            else if (yearProgress < 12) baseGrowthMultiplier = 320; // 2020: $3,200
            else baseGrowthMultiplier = 450; // 2021+: $4,500 - more realistic peak

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

            // Balanced volatility for visual appeal and realism
            const baseVolatility = 0.02 + Math.pow(Math.random(), 0.6) * 0.12; // 2% to 14% daily moves
            const choppiness = Math.sin(i * 0.4) * 0.6 + 0.4; // More variation for visual appeal
            const alternatingBias = Math.sin(i * 0.7) * 0.25; // More alternating for varied colors

            // Balanced drawdown periods for visual variety
            const drawdownCycles = Math.sin(i * 0.001) * 0.4; // Medium amplitude for visual interest
            const miniCrashes = Math.sin(i * 0.04) * 0.2; // Medium mini crashes for variety
            const drawdownMultiplier = drawdownCycles < -0.15 ? 0.7 + (drawdownCycles + 0.15) * 1.8 : 1;

            // Add occasional consolidation periods for realism
            const consolidationCycle = Math.sin(i * 0.015) * 0.6; // Creates sideways periods
            const isConsolidating = consolidationCycle > 0.4; // 20% of the time in consolidation

            // More dynamic random direction for visual variety
            const trendBias = trendWave * 0.4 + alternatingBias; // Stronger trend influence
            const randomFactor = (Math.random() - 0.5) * 2.5; // More random variation
            const consolidationDamping = isConsolidating ? 0.4 : 1; // Less dampening
            const direction = Math.sign(trendBias + randomFactor * 0.8 + miniCrashes) * consolidationDamping;

            // Calculate current base price with controlled growth
            const basePrice = 10 * baseGrowthMultiplier;
            const currentBasePrice = basePrice * eventMultiplier * drawdownMultiplier;

            // Calculate price movement with visual appeal in mind
            const volatility = baseVolatility * eventVolatility * (1 + choppiness * 0.6); // More dynamic
            const consolidationVolatility = isConsolidating ? 0.6 : 1; // Less reduction during consolidation

            // Add occasional larger moves for visual interest
            const bigMoveChance = Math.random();
            const bigMoveMultiplier = bigMoveChance < 0.05 ? 2.5 : (bigMoveChance < 0.15 ? 1.5 : 1);

            const moveSize = volatility * currentBasePrice * (0.4 + Math.random() * 0.8) * consolidationVolatility * bigMoveMultiplier; // More varied moves

            // More realistic OHLC generation
            const open = price;

            // Create varied intraday patterns for visual appeal
            const wickMultiplier = 0.3 + Math.random() * 0.7; // 30-100% of move size for more varied wicks
            const openToHigh = Math.random() * moveSize * wickMultiplier * (direction > 0 ? 1.3 : 0.7);
            const openToLow = Math.random() * moveSize * wickMultiplier * (direction < 0 ? 1.3 : 0.7);
            const openToClose = direction * moveSize * (0.4 + Math.random() * 0.7); // More varied body sizes

            // Allow for more varied wick sizes
            const maxWickSize = moveSize * 0.8; // Wicks can be up to 80% of the total move
            const high = open + Math.min(Math.abs(openToHigh), maxWickSize);
            const low = open - Math.min(Math.abs(openToLow), maxWickSize);
            const close = Math.max(low + 0.01, Math.min(high - 0.01, open + openToClose));

            // Gradually move price towards target base price with more realistic convergence
            const targetAdjustment = (currentBasePrice - price) * 0.01; // 1% convergence rate
            const adjustedClose = close + targetAdjustment;

            // More realistic price constraints - avoid obvious floors
            const minPrice = Math.max(currentBasePrice * 0.1, 5); // Minimum 10% of base price or $5
            const finalOpen = Math.max(minPrice, open);
            const finalHigh = Math.max(finalOpen, high);
            const finalLow = Math.min(finalOpen, Math.max(minPrice, low));
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
            let animationSpeed = 1.8818; // Slowed down by another 3% from 1.94x
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

            // Rugpull/Liquidation system
            let rugpullActive = false;
            let rugpullProgress = 0;
            let rugpullTargetPrice = 0;
            let rugpullCandles = 0;
            let rugpullPattern = null;
            let rugpullSlowMotion = false;
            let rugpullZoom = 1;
            let liquidationCandleCreated = false;

            // Position tracking - now supporting multiple trades per round
            let currentPosition = null; // Current active position
            let completedTrades = []; // All completed trades in this round
            let currentPnl = 0;
            let isHoldingPosition = false;

            // Money emoji animation system
            let activeMoneyEmojis = [];
            let pnlLineEndPos = null; // Track the end position of PNL line
            let shouldExplodeEmojis = false;
            let explosionCenter = null;

            const bitcoinData = generateBitcoinData();

            // Money emoji class
            class MoneyEmoji {
                constructor(x, y) {
                    this.x = x;
                    this.y = y;
                    this.vx = (Math.random() - 0.5) * 8; // Horizontal velocity
                    this.vy = -Math.random() * 10 - 5; // Initial upward velocity
                    this.scale = 0.5 + Math.random() * 0.5;
                    this.rotation = Math.random() * 360;
                    this.rotationSpeed = (Math.random() - 0.5) * 20;
                    this.opacity = 255;
                    this.gravity = 0.5;
                    this.drag = 0.98;
                    this.lifetime = 0;
                    this.maxLifetime = 2000; // Reduced from 3000 to make them disappear faster
                    this.exploding = false;
                    this.explosionVx = 0;
                    this.explosionVy = 0;
                }

                explode(centerX, centerY) {
                    this.exploding = true;
                    const angle = Math.atan2(this.y - centerY, this.x - centerX);
                    const force = 15 + Math.random() * 10;
                    this.explosionVx = Math.cos(angle) * force;
                    this.explosionVy = Math.sin(angle) * force;
                    this.gravity = 0.8;
                }

                update() {
                    this.lifetime += 16; // ~60fps

                    if (this.exploding) {
                        this.vx = this.explosionVx;
                        this.vy = this.explosionVy;
                        this.explosionVx *= 0.95;
                        this.explosionVy *= 0.95;
                    }

                    // Physics
                    this.vy += this.gravity;
                    this.vx *= this.drag;
                    this.vy *= this.drag;

                    this.x += this.vx;
                    this.y += this.vy;
                    this.rotation += this.rotationSpeed;

                    // Fade out
                    if (this.lifetime > this.maxLifetime * 0.7) {
                        this.opacity = p.map(this.lifetime, this.maxLifetime * 0.7, this.maxLifetime, 255, 0);
                    }

                    // Return true if should be removed
                    return this.lifetime > this.maxLifetime || this.y > p.height + 50;
                }

                draw() {
                    p.push();
                    p.translate(this.x, this.y);
                    p.rotate(p.radians(this.rotation));
                    p.scale(this.scale);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(40);
                    p.fill(255, 255, 255, this.opacity);
                    p.text('💵', 0, 0);
                    p.pop();
                }
            }

            // Update money emojis
            const updateMoneyEmojis = () => {
                // Update existing emojis
                activeMoneyEmojis = activeMoneyEmojis.filter(emoji => {
                    const shouldRemove = emoji.update();
                    if (!shouldRemove) {
                        emoji.draw();
                    }
                    return !shouldRemove;
                });

                // Handle explosion when closing profitable position
                if (shouldExplodeEmojis && explosionCenter) {
                    // Dynamic number based on current active emojis to prevent overload
                    let numEmojis = 15; // Reduced base from 25
                    if (activeMoneyEmojis.length > 40) numEmojis = 8;
                    if (activeMoneyEmojis.length > 70) numEmojis = 4;

                    // Create explosion effect with dynamic number
                    for (let i = 0; i < numEmojis; i++) {
                        const emoji = new MoneyEmoji(
                            explosionCenter.x + (Math.random() - 0.5) * 30,
                            explosionCenter.y + (Math.random() - 0.5) * 30
                        );
                        emoji.explode(explosionCenter.x, explosionCenter.y);
                        activeMoneyEmojis.push(emoji);
                    }
                    shouldExplodeEmojis = false;
                }
            };

            // End game due to liquidation/rugpull
            const endGameLiquidation = () => {
                // These should already be stopped, but ensure they are
                rugpullActive = false;
                rugpullSlowMotion = false;
                rugpullZoom = 1;
                liquidationCandleCreated = false;
                isRoundActive = false; // Ensure round is stopped

                // Check if user was actually holding a position
                const wasHoldingPosition = currentPosition && isHoldingPosition;

                if (wasHoldingPosition) {
                    // User was holding - this is a true liquidation
                    const massiveLoss = -currentPosition.positionSize; // Lose entire position
                    setBalance(prevBalance => Math.max(0, prevBalance + massiveLoss));
                    setPnl(massiveLoss);

                    // Show liquidation overlay immediately (we already waited 2s)
                    setShowLiquidation(true);
                } else {
                    // User wasn't holding - this is just a rugpull, no liquidation
                    // Balance stays the same, just show rugpull message
                    setRugpullType('rugpull'); // Special type for non-liquidation

                    // Show rugpull overlay immediately (we already waited 2s)
                    setShowLiquidation(true);
                    setRugpullType('rugpull');
                }

                // Force close any position (even if not holding)
                isHoldingPosition = false;
                setIsHolding(false);
                currentPosition = null;

                // Show effects and restart (3s overlay)
                setTimeout(() => {
                    setShowLiquidation(false);
                    setRugpullType(null);
                    // Start completely new round after rugpull/liquidation
                    setTimeout(() => {
                        currentIndex = 0; // Reset to start of data
                        startRound();
                    }, 1000);
                }, 3000); // 3s overlay duration
            };

            // Start a new round
            const startRound = () => {
                roundStartTime = p.millis();
                isRoundActive = true;
                isAnimating = true; // Reset animation to true for new round
                isHistoricalView = false;
                zoomTransition = 0;
                completedTrades = [];
                currentPosition = null;
                currentPnl = 0;
                isHoldingPosition = false;
                setIsHolding(false);
                setPnl(0);
                setDisplayPnl(0); // Reset animated display
                allRoundCandles = [];
                candles = [];

                // Reset rugpull state
                rugpullActive = false;
                rugpullProgress = 0;
                rugpullTargetPrice = 0;
                rugpullCandles = 0;
                rugpullPattern = null;
                rugpullSlowMotion = false;
                rugpullZoom = 1;
                liquidationCandleCreated = false;
                setShowLiquidation(false);
                setRugpullType(null);

                // Reset money emoji system
                activeMoneyEmojis = [];
                pnlLineEndPos = null;
                shouldExplodeEmojis = false;
                explosionCenter = null;

                // No more fixed liquidation scheduling - now dynamic based on position duration
                liquidationCandleCreated = false;
                console.log(`✅ Round started - liquidation risk increases with position duration`);
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

                // Clear money emoji state
                activeMoneyEmojis = [];
                pnlLineEndPos = null;
                shouldExplodeEmojis = false;
                explosionCenter = null;

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

                    // Special handling for liquidation candles - ensure we show the full crash
                    if (candle.isLiquidation) {
                        min = Math.min(min, 0); // Force min to 0 to show full liquidation
                    }
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
                let bottomPadding = range * (isMobile ? 0.12 : 0.15); // 12% mobile, 15% desktop

                // If we have a liquidation candle, ensure extra bottom padding to see the crash
                const hasLiquidation = visible.some(c => c.isLiquidation);
                if (hasLiquidation) {
                    bottomPadding = Math.max(bottomPadding, 5); // At least $5 padding below 0
                }

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

                // Ensure scale shows full range but never goes negative
                priceScale.min = Math.max(0, min - bottomPadding);
                priceScale.max = max + topPadding;

                // Special case for liquidation - ensure we can see the crash to near-zero
                if (hasLiquidation && priceScale.min > 0) {
                    priceScale.min = 0; // Show from $0 when there's a liquidation
                }
            };

            const drawTimer = () => {
                if (!isRoundActive || isHistoricalView) return;

                const elapsed = p.millis() - roundStartTime;
                const remaining = Math.max(0, roundDuration - elapsed);
                const seconds = Math.ceil(remaining / 1000);

                // Timer background - positioned inside chart grid area, below safe area
                const isMobile = p.windowWidth < 768;
                const timerWidth = isMobile ? 60 : 70;
                const timerHeight = isMobile ? 35 : 40;
                const timerX = chartArea.x + chartArea.width - timerWidth - 15; // Position inside chart area, avoiding price labels
                // Add safe area offset for timer positioning
                const safeAreaTop = 50; // Estimate for safe area height
                const timerY = chartArea.y + 15 + safeAreaTop; // Position below safe area

                p.fill(0, 0, 0, 150);
                p.noStroke();
                p.rect(timerX, timerY, timerWidth, timerHeight, 8);

                // Timer text
                p.fill(255, 255, 255, 255);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(isMobile ? 14 : 16);
                p.text(seconds + "s", timerX + timerWidth / 2, timerY + timerHeight / 2 - 3);

                // Progress bar
                const progress = remaining / roundDuration;
                p.fill(255, 68, 68);
                const barPadding = 8;
                p.rect(timerX + barPadding, timerY + timerHeight - 6, (timerWidth - barPadding * 2) * progress, 3);
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

            // Rugpull initiation function
            const initiateRugpull = (data) => {
                rugpullActive = true;
                rugpullProgress = 0;
                rugpullCandles = 0;

                // Different rugpull patterns
                const patterns = ['instant', 'gradual', 'deadcat'];
                rugpullPattern = patterns[Math.floor(Math.random() * patterns.length)];

                rugpullTargetPrice = Math.random() * 2; // Crash to $0-2

                // Set rugpull type for UI (but don't show liquidation overlay yet)
                setRugpullType(rugpullPattern);

                console.log(`🔥 RUGPULL INITIATED: ${rugpullPattern} pattern at candle #${allRoundCandles.length + 1}`);
            };

            // Process ongoing rugpull
            const processRugpull = (data) => {
                // If liquidation candle already created, return normal data
                if (liquidationCandleCreated) {
                    return data;
                }

                rugpullCandles++;

                // All patterns now create ONE liquidation candle immediately
                rugpullSlowMotion = true;
                rugpullZoom = 1; // Keep zoom at 1 to avoid making all candles bigger
                liquidationCandleCreated = true; // Mark that we've created the liquidation candle
                rugpullActive = false; // Stop rugpull processing immediately

                // Create single liquidation candle
                return {
                    ...data,
                    open: data.open,
                    high: data.open,
                    low: rugpullTargetPrice,
                    close: rugpullTargetPrice,
                    isLiquidation: true // Mark as liquidation candle
                };
            };

            const addCandle = (data) => {
                let finalData = { ...data };

                // Dynamic liquidation probability based on position duration
                if (isRoundActive && !rugpullActive && currentPosition && isHoldingPosition) {
                    const positionDuration = currentPosition.candlesElapsed;

                    // Calculate liquidation probability based on position duration
                    // Starts at 0% and increases exponentially
                    // After 50 candles (~3 seconds): ~0.5% chance per candle
                    // After 100 candles (~6 seconds): ~2% chance per candle  
                    // After 150 candles (~9 seconds): ~4.5% chance per candle
                    // After 200 candles (~12 seconds): ~8% chance per candle
                    let liquidationProbability = 0;

                    if (positionDuration > 30) { // Grace period of ~2 seconds
                        // Exponential curve: starts slow, ramps up quickly
                        const riskFactor = (positionDuration - 30) / 100; // Normalize after grace period
                        liquidationProbability = Math.min(0.12, Math.pow(riskFactor, 1.8) * 0.15); // Cap at 12%
                    }

                    // Roll for liquidation
                    if (liquidationProbability > 0 && Math.random() < liquidationProbability) {
                        // Ensure we have space in the visible area before triggering liquidation
                        if (candles.length >= maxCandles - 1) {
                            candles.shift(); // Make space proactively
                        }
                        console.log(`💀 LIQUIDATION TRIGGERED! Duration: ${positionDuration} candles, Probability: ${(liquidationProbability * 100).toFixed(2)}%`);
                        initiateRugpull(finalData);
                    }
                }

                // Handle ongoing rugpull
                if (rugpullActive) {
                    finalData = processRugpull(finalData);

                    // Stop everything immediately when liquidation candle is created
                    if (finalData.isLiquidation) {
                        isRoundActive = false; // Stop round immediately - freeze chart
                        rugpullActive = false; // Stop rugpull processing
                        isAnimating = false; // Stop all animations and movement

                        // Wait 3 full seconds before showing overlay - let user clearly see the crash
                        setTimeout(() => {
                            endGameLiquidation();
                        }, 3000); // 3 second delay to see the liquidation candle clearly
                    }
                }

                // Add to historical round candles with all properties
                allRoundCandles.push({
                    ...finalData,
                    animation: 1 // Ensure historical candles are fully visible
                });

                // Normal candle handling for all candles including liquidation
                if (candles.length >= maxCandles) {
                    candles.shift();
                }
                candles.push({
                    ...finalData,
                    animation: finalData.isLiquidation ? 1 : 0 // Full animation for liquidation candles
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
                p.stroke(255, 255, 255, gridAlpha * 0.38); // Increased from 0.25 to 0.38 for more visible grid
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

                // Hide PNL line when liquidation is happening or current candle is liquidation
                if (currentCandle.isLiquidation || liquidationCandleCreated) return;

                // Calculate scale factor for historical view
                let scaleFactor = 1;
                if (isHistoricalView) {
                    const totalRequiredWidth = visible.length * currentCandleSpacing;
                    scaleFactor = totalRequiredWidth > chartArea.width ? chartArea.width / totalRequiredWidth : 1;
                }

                // Use fixed positions to avoid any animation dependencies
                const rightPadding = 8; // Match the padding used in drawCandles
                const currentCandleX = isHistoricalView
                    ? chartArea.x + ((visible.length - 1) * currentCandleSpacing * scaleFactor)
                    : chartArea.x + chartArea.width - currentCandleWidth - rightPadding;

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
                const finalEndX = Math.min(lineEndX, chartArea.x + chartArea.width - rightPadding - 5);

                // Track PNL line end position for money emojis (only for active position)
                if (!isCompleted && tradePnl >= 0) {
                    pnlLineEndPos = { x: finalEndX, y: lineEndY };
                }

                // Special handling for brand new positions - draw immediately!
                if (!isCompleted && entryElapsed === 0) {
                    // Draw a simple horizontal line extending to the right
                    const immediateStartX = currentCandleX + currentCandleWidth / 2;
                    const immediateEndX = Math.min(immediateStartX + 80, chartArea.x + chartArea.width - rightPadding - 10);
                    const immediateY = entryY;

                    // Track PNL line end position for new positions
                    if (tradePnl >= 0) {
                        pnlLineEndPos = { x: immediateEndX, y: immediateY };
                    }

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
                        // Add padding to ensure rightmost candle is fully visible
                        const rightPadding = 8; // Minimal padding to maximize chart usage
                        candleX = chartArea.x + chartArea.width - currentCandleWidth - rightPadding - (dist * currentCandleSpacing);
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
                    const isLiquidation = candle.isLiquidation;
                    // Force liquidation candles to be bright red regardless of direction
                    const candleColor = isLiquidation ? [255, 50, 50] : (isGreen ? [0, 255, 136] : [255, 255, 255]);

                    // Add dramatic glow for liquidation candles or subtle glow for recent candles
                    if (isLiquidation) {
                        // Dramatic pulsing red glow for liquidation candles - more reasonable size
                        const liquidationGlow = 150 + Math.sin(p.millis() * 0.01) * 50;
                        p.stroke(255, 0, 0, liquidationGlow);
                        p.strokeWeight(3);
                        p.line(candleX + currentCandleWidth / 2, highY, candleX + currentCandleWidth / 2, lowY);
                    } else if (!isHistoricalView && dist < 3) {
                        p.stroke(candleColor[0], candleColor[1], candleColor[2], 40 * candle.animation);
                        p.strokeWeight(2);
                        p.line(candleX + currentCandleWidth / 2, highY, candleX + currentCandleWidth / 2, lowY);
                    }

                    // Draw main wick
                    const wickX = isLiquidation ? candleX + currentCandleWidth / 2 : candleX + currentCandleWidth / 2;
                    p.stroke(candleColor[0], candleColor[1], candleColor[2], 160 * candle.animation);
                    p.strokeWeight(isLiquidation ? 2 : 1); // Thicker wick for liquidation
                    p.line(wickX, highY, wickX, lowY);

                    const bodyHeight = Math.abs(closeY - openY);
                    const bodyY = Math.min(openY, closeY);

                    // Subtle pulse for latest candle (only in normal view)
                    if (!isHistoricalView && dist === 0) {
                        const pulseSize = p.sin(pulseAnimation) * 1;
                        p.fill(candleColor[0], candleColor[1], candleColor[2], 25 * candle.animation);
                        p.noStroke();
                        p.rect(candleX - pulseSize, bodyY - pulseSize, currentCandleWidth + pulseSize * 2, Math.max(bodyHeight, 1) + pulseSize * 2, 1);
                    }

                    if (isLiquidation) {
                        // Liquidation candles are always bright red with dramatic effect
                        p.fill(255, 50, 50, 255 * candle.animation);
                        p.stroke(255, 0, 0, 255 * candle.animation);
                        p.strokeWeight(1); // Same weight as regular
                        p.rect(candleX, bodyY, currentCandleWidth, Math.max(bodyHeight, 1), 1);
                    } else if (isGreen) {
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

                // Increase the width of the orange box
                const labelWidth = p.width < 768 ? 50 : 60; // Adjusted width
                const labelHeight = p.width < 768 ? 18 : 22; // Made taller
                const fontSize = p.width < 768 ? 10 : 12; // Increased font size

                // Position orange box to use available margin space efficiently
                const labelX = p.width - labelWidth - 2; // 2px from right edge

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

                const labelWidth = p.width < 768 ? 30 : 35; // Match the width of the orange price tracker box

                for (let i = 0; i <= labelCount; i++) {
                    const y = chartArea.y + (chartArea.height * i / labelCount);
                    const price = p.map(i, 0, labelCount, priceScale.max, priceScale.min);
                    const priceText = price < 100 ? price.toFixed(2) : price.toFixed(0);
                    // Position Y-axis labels to align with the right edge of the orange box
                    p.text(`$${priceText}`, p.width - labelWidth - 2, y);
                }
            };

            // Position management functions
            const startPosition = () => {
                try {
                    // Only allow new positions during active rounds
                    if (currentPosition || candles.length === 0 || !isRoundActive || isHistoricalView) return;

                    const lastCandle = candles[candles.length - 1];
                    const currentBalance = balance;

                    // Calculate position size (use 20% of balance) - reduced for more realistic trading
                    const positionSize = currentBalance * 0.2;
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
                } catch (error) {
                    console.error('❌ Error in startPosition:', error);
                }
            };

            const closePosition = () => {
                try {
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

                    // Show fireworks and trigger money explosion for profit (after fees)
                    if (netProfit > 0) {
                        setShowFireworks(true);
                        setTimeout(() => setShowFireworks(false), 1000);

                        // Trigger money emoji explosion
                        if (pnlLineEndPos) {
                            shouldExplodeEmojis = true;
                            explosionCenter = { x: pnlLineEndPos.x, y: pnlLineEndPos.y };
                        }

                        // Play cash sound
                        const cashSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
                        cashSound.volume = 0.7;
                        cashSound.play().catch(err => console.log('Could not play cash sound:', err));
                    }

                    currentPosition = null;
                    currentPnl = 0;
                    setPnl(0);
                    pnlLineEndPos = null; // Clear PNL line position
                } catch (error) {
                    console.error('❌ Error in closePosition:', error);
                }
            };

            p.setup = () => {
                p.createCanvas(p.windowWidth, p.windowHeight);
                p.strokeCap(p.ROUND);

                // Optimize chart area for mobile vs desktop - Chart extends to screen edges
                const isMobile = p.windowWidth < 768;
                const leftMargin = isMobile ? 4 : 8; // Minimal left margin for maximum width
                const rightMargin = isMobile ? 42 : 58; // Keep right margin for price labels
                // Keep same margins - safe area handled by HTML padding now
                const topMargin = isMobile ? 10 : 8; // Minimal top margin
                const bottomMargin = isMobile ? 0 : 10; // Account for iOS PWA white section on mobile

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

                // Variable speed - slow motion during rugpull, stop completely after liquidation
                const currentSpeed = rugpullSlowMotion ? 0.3 : animationSpeed; // Slow motion during liquidation
                if (isAnimating && isRoundActive && !liquidationCandleCreated && !rugpullActive && p.millis() - lastUpdate > (120 / currentSpeed)) {
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

                gridAlpha = p.lerp(gridAlpha, 40, 0.1);

                // Clear PNL line position if not in profit or not holding
                if (!isHoldingPosition || currentPnl <= 0) {
                    pnlLineEndPos = null;
                }

                // Update money emojis last so they appear on top
                updateMoneyEmojis();

                // Restore original chart area if it was modified
                if (originalChartArea) {
                    chartArea = originalChartArea;
                }
            };

            p.windowResized = () => {
                p.resizeCanvas(p.windowWidth, p.windowHeight);
                p.strokeCap(p.ROUND);

                // Optimize chart area for mobile vs desktop - Chart extends to screen edges
                const isMobile = p.windowWidth < 768;
                const leftMargin = isMobile ? 4 : 8; // Minimal left margin for maximum width
                const rightMargin = isMobile ? 42 : 58; // Keep right margin for price labels
                const topMargin = isMobile ? 10 : 8; // Minimal top margin - chart almost to screen edge
                const bottomMargin = isMobile ? 0 : 10; // Account for iOS PWA white section on mobile

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
                // Don't do anything if p5 isn't ready
                try {
                    if (!touchActive) { // Prevent double triggering with touch
                        startPosition();
                    }
                } catch (error) {
                    console.log('❌ Mouse handler error, p5 not ready');
                }
                return false;
            };

            p.mouseReleased = () => {
                // Don't do anything if p5 isn't ready
                try {
                    if (!touchActive) { // Prevent double triggering with touch
                        closePosition();
                    }
                } catch (error) {
                    console.log('❌ Mouse release handler error, p5 not ready');
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
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: 'calc(100vh + env(safe-area-inset-bottom))',
            minHeight: '100svh',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0B1215 0%, #1a1a1a 50%, #0f0f0f 100%)', // Put background back
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

            {/* Fancy PNL Display - Always Visible inside chart grid */}
            <div style={{
                position: 'absolute',
                top: `calc(${window.innerWidth < 768 ? '25px' : '23px'} + env(safe-area-inset-top, 0px))`, // Add safe area offset
                left: window.innerWidth < 768 ? '19px' : '23px', // Position inside chart area
                width: window.innerWidth < 768 ? '140px' : '180px', // Fixed width to prevent resizing
                height: window.innerWidth < 768 ? '80px' : '95px', // Fixed height to prevent shape changes
                background: `linear-gradient(135deg, ${pnl >= 0 ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 68, 68, 0.15)'} 0%, ${pnl >= 0 ? 'rgba(0, 255, 136, 0.05)' : 'rgba(255, 68, 68, 0.05)'} 100%)`,
                backdropFilter: 'blur(20px) saturate(180%)',
                border: `1px solid ${pnl >= 0 ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 68, 68, 0.3)'}`,
                borderRadius: '16px',
                padding: window.innerWidth < 768 ? '12px 16px' : '16px 20px',
                boxShadow: `
                    0 10px 40px ${pnl >= 0 ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)'},
                    inset 0 1px 1px ${pnl >= 0 ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 68, 68, 0.2)'},
                    0 0 80px ${pnl >= 0 ? 'rgba(0, 255, 136, 0.05)' : 'rgba(255, 68, 68, 0.05)'}
                `,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isHolding ? 'scale(1.05)' : 'scale(1)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center' // Center content vertically
            }}>
                <div style={{
                    fontSize: window.innerWidth < 768 ? '12px' : '14px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '4px',
                    fontWeight: '500',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    textAlign: 'center'
                }}>
                    P&L
                </div>
                <div style={{
                    fontSize: window.innerWidth < 768 ? '24px' : '32px',
                    fontWeight: '700',
                    color: pnl >= 0 ? '#00FF88' : '#FF4444',
                    textShadow: `0 0 20px ${pnl >= 0 ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 68, 68, 0.5)'}`,
                    lineHeight: 1,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
                    letterSpacing: '-0.5px',
                    position: 'relative',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    textAlign: 'center' // Center the numbers within the fixed width
                }}>
                    <span style={{
                        display: 'inline-block',
                        transform: displayPnl !== 0 ? 'scale(1)' : 'scale(0.95)',
                        transition: 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                    }}>
                        {displayPnl >= 0 ? '+' : ''}${formatPnl(Math.abs(displayPnl))}
                    </span>
                </div>
                <div style={{
                    fontSize: window.innerWidth < 768 ? '10px' : '11px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginTop: '6px',
                    fontWeight: '500',
                    letterSpacing: '0.3px',
                    textAlign: 'center',
                    opacity: isHolding ? 1 : 0, // Always reserve space, just hide/show
                    transition: 'opacity 0.3s ease'
                }}>
                    ACTIVE POSITION
                </div>
            </div>

            {/* Liquidation Effect */}
            {showLiquidation && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(135deg, rgba(255,0,0,0.2) 0%, rgba(139,0,0,0.1) 100%)`,
                    backdropFilter: 'blur(20px) saturate(180%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    animation: 'liquidationPulse 0.5s ease-in-out infinite alternate',
                    boxShadow: `
                        0 10px 40px rgba(255,0,0,0.1),
                        inset 0 1px 1px rgba(255,68,68,0.2),
                        0 0 80px rgba(255,68,68,0.05)
                    `,
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    <div style={{
                        fontSize: window.innerWidth < 768 ? '32px' : '48px',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        textShadow: '0 0 20px rgba(255,0,0,0.8)',
                        marginBottom: '20px',
                        animation: 'shake 0.3s ease-in-out infinite',
                        letterSpacing: '-0.5px'
                    }}>
                        {rugpullType === 'rugpull' ? '💥 GET RUGGED 💥' : '🔥 LIQUIDATED 🔥'}
                    </div>

                    <div style={{
                        fontSize: window.innerWidth < 768 ? '18px' : '24px',
                        color: '#ffffff',
                        textAlign: 'center',
                        marginBottom: '10px',
                        textShadow: '0 0 10px rgba(255,0,0,0.4)',
                        letterSpacing: '0.5px'
                    }}>
                        {rugpullType === 'rugpull' && '📈💀 MARKET CRASHED'}
                        {rugpullType === 'instant' && '⚡ FLASH CRASH'}
                        {rugpullType === 'gradual' && '📉 DEATH SPIRAL'}
                        {rugpullType === 'deadcat' && '🐱‍💀 DEAD CAT BOUNCE'}
                    </div>

                    <div style={{
                        fontSize: window.innerWidth < 768 ? '14px' : '18px',
                        color: '#ffcccc',
                        textAlign: 'center',
                        textShadow: '0 0 5px rgba(255,0,0,0.3)',
                        letterSpacing: '0.3px'
                    }}>
                        {rugpullType === 'rugpull'
                            ? 'Game Over • Starting new round...'
                            : 'All positions closed • Starting new round...'
                        }
                    </div>

                    {/* Red particles effect */}
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                width: '6px',
                                height: '6px',
                                background: '#ff0000',
                                borderRadius: '50%',
                                animation: `fall ${1 + Math.random() * 2}s linear infinite`,
                                opacity: 0.7,
                                boxShadow: '0 0 10px rgba(255,0,0,0.5)'
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Bottom background extension to cover iOS home indicator area */}
            <div style={{
                position: 'fixed',
                bottom: '-50px', // Extend below viewport
                left: 0,
                right: 0,
                height: '100px', // Tall enough to cover any white space
                background: 'linear-gradient(135deg, #0B1215 0%, #1a1a1a 50%, #0f0f0f 100%)',
                zIndex: -1 // Below all UI elements
            }}></div>

            {/* Bottom UI Container - Positioned above iOS PWA white section */}
            <div style={{
                position: 'fixed',
                bottom: 'env(safe-area-inset-bottom)',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                padding: '0 20px 10px 20px',
                zIndex: 1001,
                pointerEvents: 'none'
            }}>
                {/* Game Stats */}
                <div style={{
                    width: window.innerWidth < 768 ? '140px' : '180px', // Fixed width matching PNL
                    height: '40px', // Fixed height for consistency
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'white',
                    padding: '0 16px',
                    borderRadius: '12px',
                    fontSize: window.innerWidth < 768 ? '14px' : '16px',
                    fontWeight: 'bold',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    pointerEvents: 'auto', // Enable interactions
                    whiteSpace: 'nowrap', // Prevent text wrapping
                    overflow: 'hidden', // Hide overflow if needed
                    textOverflow: 'ellipsis' // Ellipsis for very long text
                }}>
                    Balance: ${balance.toFixed(0)}
                </div>

                {/* Instructions */}
                {!isHolding && (
                    <div style={{
                        height: '40px', // Fixed height matching balance
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.3)',
                        color: 'white',
                        padding: '0 16px',
                        borderRadius: '12px',
                        fontSize: window.innerWidth < 768 ? '12px' : '14px',
                        fontWeight: '500',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'center',
                        pointerEvents: 'auto',
                        maxWidth: '140px',
                        lineHeight: 1.3
                    }}>
                        Hold to Buy<br />Release to Sell
                    </div>
                )}
            </div>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;500;600;700&display=swap');
        
        * {
          font-family: 'Bai Jamjuree', sans-serif !important;
        }
        
        html, body {
          font-family: 'Bai Jamjuree', sans-serif !important;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes numberChange {
          0% { 
            transform: scale(1) translateY(0);
            filter: blur(0px);
          }
          50% { 
            transform: scale(1.1) translateY(-2px);
            filter: blur(0.5px);
          }
          100% { 
            transform: scale(1) translateY(0);
            filter: blur(0px);
          }
        }
        
        @keyframes glow {
          0%, 100% { 
            box-shadow: 0 0 5px currentColor, 0 0 10px currentColor;
          }
          50% { 
            box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
          }
        }
        
        @keyframes liquidationPulse {
          0% { background: linear-gradient(45deg, rgba(255,0,0,0.7), rgba(139,0,0,0.8)); }
          100% { background: linear-gradient(45deg, rgba(255,50,50,0.9), rgba(180,0,0,0.9)); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes fall {
          0% { 
            transform: translateY(-100vh) rotate(0deg); 
            opacity: 1; 
          }
          100% { 
            transform: translateY(100vh) rotate(360deg); 
            opacity: 0; 
          }
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
        
        /* Mobile Safari specific fixes */
        @supports (padding: max(0px)) {
          .mobile-safe-area {
            padding-bottom: max(20px, env(safe-area-inset-bottom));
          }
        }
        
        /* Force viewport height on mobile Safari */
        @media screen and (max-width: 768px) {
          html, body {
            height: -webkit-fill-available;
            height: 100vh;
            height: 100svh; /* Small viewport height for newer browsers */
          }
        }
      `}</style>
        </div>
    );
};

export default CandlestickChart;
