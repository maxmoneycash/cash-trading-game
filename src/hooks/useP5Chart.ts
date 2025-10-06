import { useEffect, useRef } from 'react';
import p5 from 'p5';
import { getTopMargin, getSafeBottom, isStandalone } from '../utils/helpers';
import {
    generateSeededCandles,
    toFloatingPoint,
    createDefaultConfig,
    type CandleData,
    type CandleConfig,
} from '../utils/seededCandles';

/**
 * Custom hook to initialize and manage the p5.js sketch for the candlestick chart.
 * Encapsulates all drawing, animation, and interaction logic.
 */
const useP5Chart = ({
    chartRef,
    p5InstanceRef,
    modalOpenRef,
    setCurrentPrice,
    setCandleCount,
    setPnl,
    setIsHolding,
    setShowFireworks,
    setShowLossAnimation,
    setShowLiquidation,
    setRugpullType,
    setBalance,
    balance,
    isModalOpen,
    isPaused = false,
    overlayActive = false,
    onRoundMeta,
    debugEnabled = false,
    disableClicks = false,
    onPositionOpened,
    onPositionClosed,
    aptosMode = false,
    resetKey,
}: {
    chartRef: React.RefObject<HTMLDivElement>;
    p5InstanceRef: React.RefObject<p5 | null>;
    modalOpenRef: React.RefObject<boolean>;
    setCurrentPrice: (price: number) => void;
    setCandleCount: (count: number) => void;
    setPnl: (pnl: number) => void;
    setIsHolding: (holding: boolean) => void;
    setShowFireworks: (show: boolean) => void;
    setShowLossAnimation: (show: boolean) => void;
    setShowLiquidation: (show: boolean) => void;
    setRugpullType: (type: string | null) => void;
    setBalance: React.Dispatch<React.SetStateAction<number>>;
    balance: number;
    isModalOpen: boolean;
    isPaused?: boolean;
    overlayActive?: boolean;
    onRoundMeta?: (meta: { roundId?: string; seed?: string; userId?: string; wallet?: string; gameEnded?: boolean; phase?: 'start' | 'end' }) => void;
    debugEnabled?: boolean;
    disableClicks?: boolean;
    onPositionOpened?: (entryPrice: number, entryCandleIndex: number) => void;
    onPositionClosed?: (exitPrice: number, exitCandleIndex: number, positionPnL: number) => void;
    aptosMode?: boolean;
    resetKey?: number;
}) => {
    const flagsRef = useRef({ overlayActive, isPaused, disableClicks, balance })
    const debugListenersRef = useRef<{ start?: any; end?: any }>({})
    const callbacksRef = useRef<{
        onPositionOpened?: (entryPrice: number, entryCandleIndex: number) => void;
        onPositionClosed?: (exitPrice: number, exitCandleIndex: number, positionPnL: number) => void;
    }>({
        onPositionOpened: undefined,
        onPositionClosed: undefined
    })

    // Keep callbacks in sync
    useEffect(() => {
        if (onPositionOpened) callbacksRef.current.onPositionOpened = onPositionOpened
        if (onPositionClosed) callbacksRef.current.onPositionClosed = onPositionClosed
    }, [onPositionOpened, onPositionClosed])

    // Keep interaction guards in sync for p5 handlers
    useEffect(() => {
        flagsRef.current.overlayActive = overlayActive
    }, [overlayActive])
    useEffect(() => {
        flagsRef.current.isPaused = isPaused
    }, [isPaused])
    useEffect(() => {
        flagsRef.current.disableClicks = disableClicks
    }, [disableClicks])
    useEffect(() => {
        flagsRef.current.balance = balance
    }, [balance])

    useEffect(() => {
        const sketch = (p: p5) => {
            // Local state for chart elements and animations.
            // Removed database logging helpers - no longer needed
            let currentRoundId: string | null = null;
            let candles: any[] = [];
            let allRoundCandles: any[] = [];
            let currentIndex = 0;
            let intervalMs = 65; // default; updated by config from backend
            let generatedCandles: CandleData[] = [];
            let activeSeed: string | null = null;
            let activeConfig: CandleConfig | null = null;
            let replayEnabled = false;
            let replayPrimed = false; // set true after first round to reuse same seed/config
            let animationSpeed = 1.8818;
            let isAnimating = true;
            let lastUpdate = 0;
            let candleWidth = p.windowWidth < 768 ? 4 : 6;
            let candleSpacing = p.windowWidth < 768 ? 6 : 8;
            let maxCandles = Math.floor(p.windowWidth / candleSpacing);
            let priceScale = { min: 0, max: 100 };
            let chartArea = { x: 30, y: 90, width: 0, height: 0 };
            let gridAlpha = 0;
            let pulseAnimation = 0;
            let roundStartTime = 0;
            let roundDuration = 30000; // 30 seconds per round
            let isRoundActive = false;
            let isHistoricalView = false;
            let zoomTransition = 0;
            let zoomStartTime = 0;
            let rugpullActive = false;
            let rugpullProgress = 0;
            let rugpullTargetPrice = 0;
            let rugpullCandles = 0;
            let rugpullPattern: string | null = null;
            let rugpullSlowMotion = false;
            let rugpullZoom = 1;
            let liquidationCandleCreated = false;
            let currentPosition: any = null;
            // Track entry index and backend trade id
            let currentTradeId: string | null = null;
            let currentEntryIndex: number | null = null;
            let completedTrades: any[] = [];
            let currentPnl = 0;
            let isHoldingPosition = false;
            let activeMoneyEmojis: any[] = [];
            let pnlLineEndPos: any = null;
            let shouldExplodeEmojis = false;
            let explosionCenter: any = null;
            let lastEmojiTime = 0;
            let screenShake = 0;
            let lossFlash = 0;

            // MoneyEmoji class for profit animations.
            class MoneyEmoji {
                x: number;
                y: number;
                vx: number;
                vy: number;
                scale: number;
                rotation: number;
                rotationSpeed: number;
                opacity: number;
                gravity: number;
                drag: number;
                lifetime: number;
                maxLifetime: number;
                exploding: boolean;
                explosionVx: number;
                explosionVy: number;

                constructor(x: number, y: number) {
                    this.x = x;
                    this.y = y;
                    this.vx = (Math.random() - 0.5) * 8;
                    this.vy = -Math.random() * 10 - 5;
                    this.scale = 0.8 + Math.random() * 0.6;
                    this.rotation = Math.random() * 360;
                    this.rotationSpeed = (Math.random() - 0.5) * 20;
                    this.opacity = 255;
                    this.gravity = 0.5;
                    this.drag = 0.98;
                    this.lifetime = 0;
                    this.maxLifetime = this.calculateLifetime();
                    this.exploding = false;
                    this.explosionVx = 0;
                    this.explosionVy = 0;
                }

                calculateLifetime() {
                    const emojiCount = activeMoneyEmojis.length;
                    if (emojiCount <= 3) return 2500;
                    if (emojiCount <= 6) return 2000;
                    if (emojiCount <= 10) return 1500;
                    return 1000;
                }

                explode(centerX: number, centerY: number) {
                    this.exploding = true;
                    const baseAngle = Math.atan2(this.y - centerY, this.x - centerX);
                    const leftBias = -Math.PI * 0.3;
                    const randomSpread = (Math.random() - 0.5) * Math.PI * 1.2;
                    const angle = baseAngle + leftBias + randomSpread;
                    const force = 20 + Math.random() * 15;
                    this.explosionVx = Math.cos(angle) * force;
                    this.explosionVy = Math.sin(angle) * force;
                    this.gravity = 0.8;
                }

                update() {
                    this.lifetime += 16;
                    if (this.exploding) {
                        this.vx = this.explosionVx;
                        this.vy = this.explosionVy;
                        this.explosionVx *= 0.95;
                        this.explosionVy *= 0.95;
                    }
                    const emojiCount = activeMoneyEmojis.length;
                    let currentGravity = this.gravity;
                    if (emojiCount <= 3) currentGravity *= 0.4;
                    else if (emojiCount <= 6) currentGravity *= 0.6;
                    else if (emojiCount <= 10) currentGravity *= 0.8;
                    this.vy += currentGravity;
                    this.vx *= this.drag;
                    this.vy *= this.drag;
                    this.x += this.vx;
                    this.y += this.vy;
                    this.rotation += this.rotationSpeed;
                    if (this.lifetime > this.maxLifetime * 0.7) {
                        this.opacity = p.map(this.lifetime, this.maxLifetime * 0.7, this.maxLifetime, 255, 0);
                    }
                    return this.lifetime > this.maxLifetime || this.y > p.height + 50;
                }

                draw() {
                    p.push();
                    p.translate(this.x, this.y);
                    p.rotate(p.radians(this.rotation));
                    p.scale(this.scale);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(45);
                    p.fill(255, 255, 255, this.opacity);
                    p.text('💵', 0, 0);
                    p.pop();
                }
            }

            // Update active money emojis for profit effects.
            const updateMoneyEmojis = () => {
                activeMoneyEmojis = activeMoneyEmojis.filter(emoji => {
                    const shouldRemove = emoji.update();
                    if (!shouldRemove) {
                        emoji.draw();
                    }
                    return !shouldRemove;
                });
                const maxEmojis = 15;
                if (activeMoneyEmojis.length > maxEmojis) {
                    activeMoneyEmojis = activeMoneyEmojis.slice(-maxEmojis);
                }
                if (activeMoneyEmojis.length > 12) {
                    activeMoneyEmojis.forEach(emoji => {
                        emoji.maxLifetime = Math.max(800, emoji.maxLifetime * 0.8);
                    });
                }
                if (shouldExplodeEmojis && explosionCenter) {
                    const currentTime = p.millis();
                    const cooldownPeriod = 200;
                    if (currentTime - lastEmojiTime > cooldownPeriod) {
                        let numEmojis = 4;
                        if (activeMoneyEmojis.length > 6) numEmojis = 3;
                        if (activeMoneyEmojis.length > 10) numEmojis = 2;
                        if (activeMoneyEmojis.length > 15) numEmojis = 1;
                        if (activeMoneyEmojis.length > 18) numEmojis = 0;
                        for (let i = 0; i < numEmojis; i++) {
                            const emoji = new MoneyEmoji(
                                explosionCenter.x + (Math.random() - 0.5) * 60,
                                explosionCenter.y + (Math.random() - 0.5) * 40
                            );
                            emoji.explode(explosionCenter.x, explosionCenter.y);
                            activeMoneyEmojis.push(emoji);
                        }
                        lastEmojiTime = currentTime;
                    }
                    shouldExplodeEmojis = false;
                }
            };

            // Handle game end due to liquidation or rugpull.
            const endGameLiquidation = () => {
                // Database logging removed - game state handled locally
                rugpullActive = false;
                rugpullSlowMotion = false;
                rugpullZoom = 1;
                liquidationCandleCreated = false;
                isRoundActive = false;
                const wasHoldingPosition = currentPosition && isHoldingPosition;
                if (wasHoldingPosition) {
                    const massiveLoss = -currentPosition.positionSize;
                    setBalance(prevBalance => Math.max(0, prevBalance + massiveLoss));
                    setPnl(massiveLoss);
                    setShowLiquidation(true);
                } else {
                    setRugpullType('rugpull');
                    setShowLiquidation(true);
                    setRugpullType('rugpull');
                }
                isHoldingPosition = false;
                setIsHolding(false);
                currentPosition = null;
                setTimeout(() => {
                    setTimeout(() => {
                        currentIndex = 0;
                        setShowLiquidation(false);
                        setRugpullType(null);
                        startRound();
                    }, 1000);
                }, 3000);
            };

            // Utility: align to interval boundary
            const alignToInterval = (nowMs: number, interval: number) => Math.floor(nowMs / interval) * interval;

            // Generate a single candle on-demand
            const generateSingleCandle = (index: number, seed: string, config: any) => {
                // Simple deterministic candle generation based on index
                const basePrice = 100;
                const variation = (Math.sin(index * 0.1) + Math.cos(index * 0.3)) * 5;
                const randomFactor = ((parseInt(seed.slice(-8), 16) + index) % 1000) / 1000;

                const open = basePrice + variation + (randomFactor - 0.5) * 2;
                const close = open + (Math.sin(index * 0.15) * 3) + (randomFactor - 0.5) * 4;
                const high = Math.max(open, close) + Math.abs(Math.sin(index * 0.2)) * 2;
                const low = Math.min(open, close) - Math.abs(Math.cos(index * 0.25)) * 2;

                return {
                    open,
                    high,
                    low,
                    close,
                    timestamp: config.start_at_ms + index * config.interval_ms
                };
            };

            // Parse URL for replay mode
            try {
                const url = new URL(window.location.href);
                const r = url.searchParams.get('replay');
                replayEnabled = r === '1' || r === 'true' || r === 'yes';
            } catch { }

            // Start a new trading round.
            const startRound = () => {
                roundStartTime = p.millis();
                isRoundActive = true;
                isAnimating = true;
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
                activeMoneyEmojis = [];
                pnlLineEndPos = null;
                shouldExplodeEmojis = false;
                explosionCenter = null;
                liquidationCandleCreated = false;
                console.log(`✅ Round started - liquidation risk increases with position duration`);
                // Reset paused tracking for this round
                (p as any).__pausedMs = 0;
                (p as any).__pauseStart = null;
                // Seed + config setup
                const bootstrapWithSeed = (seedHex: string, cfgFromServer?: Partial<CandleConfig>) => {
                    activeSeed = seedHex;
                    // Determine interval and start_at_ms
                    console.log('🔧 Config received:', cfgFromServer);
                    const serverInterval = (cfgFromServer?.interval_ms ?? 65) as number;
                    intervalMs = serverInterval;
                    console.log('🔧 intervalMs updated to:', intervalMs, 'from serverInterval:', serverInterval);
                    const alignedStart = typeof cfgFromServer?.start_at_ms === 'number'
                        ? (cfgFromServer.start_at_ms as number)
                        : alignToInterval(Date.now(), intervalMs);
                    const cfg = createDefaultConfig(alignedStart);
                    activeConfig = { ...cfg, ...(cfgFromServer || {}) } as CandleConfig;
                    // Generate full round candles deterministically
                    const fp = generateSeededCandles(activeSeed!, activeConfig!);
                    generatedCandles = toFloatingPoint(fp, activeConfig!.scale);
                    currentIndex = 0;
                    // Surface metadata to debug overlay
                    if (onRoundMeta) onRoundMeta({ roundId: currentRoundId || undefined, seed: activeSeed || undefined, userId: undefined, wallet: undefined, phase: 'start' });
                };

                // Generate local seed for replay mode or new games
                if (replayEnabled && replayPrimed && activeSeed && activeConfig) {
                    // Reuse same seed/config for replay run
                    currentRoundId = null;
                    bootstrapWithSeed(activeSeed, activeConfig);
                } else {
                    // Generate local deterministic seed per session
                    const bytes = new Uint8Array(32);
                    if (typeof window !== 'undefined' && (window as any).crypto?.getRandomValues) {
                        (window as any).crypto.getRandomValues(bytes);
                    } else {
                        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
                    }
                    const seedHex = '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
                    // Pass the default config to ensure 65ms timing
                    const defaultConfig = { interval_ms: 65, start_at_ms: alignToInterval(Date.now(), 65) };
                    bootstrapWithSeed(seedHex, defaultConfig);
                }
            };

            // Check if current round should end.
            const checkRoundEnd = () => {
                if (!isRoundActive) return;
                const elapsed = p.millis() - roundStartTime;
                const pausedMs = (p as any).__pausedMs || 0;
                if (elapsed - pausedMs >= roundDuration) {
                    endRound();
                }
            };

            // End round and transition to historical view.
            const endRound = () => {
                isRoundActive = false;
                if (currentPosition && isHoldingPosition) {
                    closePosition();
                }
                activeMoneyEmojis = [];
                pnlLineEndPos = null;
                shouldExplodeEmojis = false;
                explosionCenter = null;
                isHistoricalView = true;
                zoomStartTime = p.millis();

                // Trigger game completion for settlement
                console.log('🎯 Round ended - triggering settlement');
                if (onRoundMeta) {
                    onRoundMeta({
                        roundId: currentRoundId || undefined,
                        seed: activeSeed || undefined,
                        userId: undefined,
                        wallet: undefined,
                        gameEnded: true,  // This triggers settlement!
                        phase: 'end'
                    });
                }

                // Game completion handled locally - no database persistence needed
                setTimeout(() => {
                    if (replayEnabled && !replayPrimed) {
                        // Prime replay for next round using same seed/config
                        replayPrimed = true;
                    } else if (replayEnabled && replayPrimed) {
                        // After replay run, reset to fetch new seed next time (optional)
                        replayPrimed = false;
                    }
                    // DISABLED FOR TESTING: Auto-start next chart round
                    // startRound();
                }, 3000);
            };

            // Update price scale for visible candles.
            const updatePriceScale = (visible: any[]) => {
                if (visible.length === 0) return;
                let min = Infinity;
                let max = -Infinity;
                for (const candle of visible) {
                    min = Math.min(min, candle.low);
                    max = Math.max(max, candle.high);
                    if (candle.isLiquidation) {
                        min = Math.min(min, 0);
                    }
                }
                if (currentPosition) {
                    min = Math.min(min, currentPosition.entryPrice);
                    max = Math.max(max, currentPosition.entryPrice);
                }
                for (const trade of completedTrades) {
                    min = Math.min(min, trade.entryPrice);
                    max = Math.max(max, trade.exitPrice);
                }
                const range = max - min;
                const isMobile = p.windowWidth < 768;
                const topPadding = range * (isMobile ? 0.08 : 0.10);
                let bottomPadding = range * (isMobile ? 0.12 : 0.15);
                const hasLiquidation = visible.some(c => c.isLiquidation);
                if (hasLiquidation) {
                    bottomPadding = Math.max(bottomPadding, 5);
                }
                const minRange = isMobile ? 5 : 10;
                if (range < minRange) {
                    const center = (min + max) / 2;
                    const halfRange = minRange / 2;
                    min = center - halfRange;
                    max = center + halfRange;
                }
                if (!isFinite(min) || !isFinite(max) || min >= max) {
                    min = 0;
                    max = 100;
                }
                priceScale.min = Math.max(0, min - bottomPadding);
                priceScale.max = max + topPadding;
                if (hasLiquidation && priceScale.min > 0) {
                    priceScale.min = 0;
                }
            };

            // Draw countdown timer for round.
            const drawTimer = () => {
                if (!isRoundActive || isHistoricalView) return;
                const elapsed = p.millis() - roundStartTime;
                const remaining = Math.max(0, roundDuration - elapsed);
                const seconds = Math.ceil(remaining / 1000);
                const isMobile = p.windowWidth < 768;
                const timerWidth = isMobile ? 60 : 70;
                const timerHeight = isMobile ? 35 : 40;
                const timerX = chartArea.x + chartArea.width - timerWidth - 10;
                const timerY = chartArea.y + 10;
                p.fill(0, 0, 0, 150);
                p.noStroke();
                p.rect(timerX, timerY, timerWidth, timerHeight, 8);
                p.fill(255, 255, 255, 255);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(isMobile ? 14 : 16);
                p.text(seconds + "s", timerX + timerWidth / 2, timerY + timerHeight / 2 - 3);
                const progress = remaining / roundDuration;
                p.fill(255, 68, 68);
                const barPadding = 8;
                p.rect(timerX + barPadding, timerY + timerHeight - 6, (timerWidth - barPadding * 2) * progress, 3);
            };

            // Update display with latest price and PNL.
            const updateDisplay = (visible: any[]) => {
                if (visible.length === 0) return;
                const lastCandle = visible[visible.length - 1];
                setCurrentPrice(lastCandle.close);
                setCandleCount(visible.length);
                if (currentPosition) {
                    const priceChange = lastCandle.close - currentPosition.entryPrice;
                    const newPNL = priceChange * currentPosition.shares;
                    currentPnl = newPNL;
                    setPnl(newPNL);
                }
            };

            // Initiate a rugpull event.
            const initiateRugpull = (data: any) => {
                rugpullActive = true;
                rugpullProgress = 0;
                rugpullCandles = 0;
                const patterns = ['instant', 'gradual', 'deadcat'];
                rugpullPattern = patterns[Math.floor(Math.random() * patterns.length)];
                rugpullTargetPrice = 0;
                setRugpullType(rugpullPattern);
                console.log(`🔥 RUGPULL INITIATED: ${rugpullPattern} pattern at candle #${allRoundCandles.length + 1}`);
            };

            // Process active rugpull and create liquidation candle.
            const processRugpull = (data: any) => {
                if (liquidationCandleCreated) {
                    return data;
                }
                rugpullCandles++;
                rugpullSlowMotion = true;
                rugpullZoom = 1;
                liquidationCandleCreated = true;
                rugpullActive = false;
                return {
                    ...data,
                    open: data.open,
                    high: data.open,
                    low: 0,
                    close: 0,
                    isLiquidation: true
                };
            };

            // Add new candle to chart, handling rugpulls and liquidations.
            const addCandle = (data: any) => {
                let finalData = { ...data };
                if (isRoundActive && !rugpullActive && allRoundCandles.length >= 80) {
                    let baseLiquidationProbability = 0.0; // DISABLED for debugging timing issues
                    if (currentPosition && isHoldingPosition) {
                        baseLiquidationProbability *= 1.5;
                    }
                    if (Math.random() < baseLiquidationProbability) {
                        if (candles.length >= maxCandles - 1) {
                            candles.shift();
                        }
                        console.log(`💀 MARKET CRASH! Random liquidation event - Probability: ${(baseLiquidationProbability * 100).toFixed(3)}%`);
                        initiateRugpull(finalData);
                    }
                }
                if (rugpullActive) {
                    finalData = processRugpull(finalData);
                    if (finalData.isLiquidation) {
                        isRoundActive = false;
                        rugpullActive = false;
                        isAnimating = false;
                        setTimeout(() => {
                            endGameLiquidation();
                        }, 3000);
                    }
                }
                allRoundCandles.push({
                    ...finalData,
                    animation: 1
                });
                if (candles.length >= maxCandles) {
                    candles.shift();
                }
                candles.push({
                    ...finalData,
                    animation: finalData.isLiquidation ? 1 : 0
                });
                if (currentPosition) {
                    currentPosition.candlesElapsed++;
                }
                for (const trade of completedTrades) {
                    trade.candlesElapsed++;
                    trade.exitElapsed++;
                }
            };

            // Draw chart grid lines.
            const drawGrid = () => {
                p.stroke(255, 255, 255, gridAlpha * 0.65);
                p.strokeWeight(0.5);
                p.drawingContext.setLineDash([5, 3]);
                const gridLines = p.width < 768 ? 5 : 8;
                for (let i = 0; i <= gridLines; i++) {
                    const y = chartArea.y + (chartArea.height * i / gridLines);
                    p.line(chartArea.x, y, chartArea.x + chartArea.width, y);
                }
                for (let i = 0; i < gridLines; i++) {
                    const y = chartArea.y + (chartArea.height * (i + 0.5) / gridLines);
                    p.line(chartArea.x, y, chartArea.x + chartArea.width, y);
                }
                const verticalLines = Math.floor(p.width / (p.width < 768 ? 60 : 100));
                for (let i = 0; i <= verticalLines; i++) {
                    const x = chartArea.x + (chartArea.width * i / verticalLines);
                    p.line(x, chartArea.y, x, chartArea.y + chartArea.height);
                }
                p.drawingContext.setLineDash([]);
            };

            // Draw PNL lines for positions.
            const drawPNLLine = (currentCandleWidth: number, currentCandleSpacing: number, visible: any[]) => {
                for (const trade of completedTrades) {
                    drawSinglePNLLine(trade, true, currentCandleWidth, currentCandleSpacing, visible);
                }
                if (currentPosition) {
                    drawSinglePNLLine(currentPosition, false, currentCandleWidth, currentCandleSpacing, visible);
                }
            };

            // Draw a single PNL line for a trade or position.
            const drawSinglePNLLine = (tradePosition: any, isCompleted: boolean, currentCandleWidth: number, currentCandleSpacing: number, visible: any[]) => {
                if (!tradePosition || visible.length === 0) return;
                const currentCandle = visible[visible.length - 1];
                if (currentCandle.isLiquidation || liquidationCandleCreated) return;
                let scaleFactor = 1;
                if (isHistoricalView) {
                    const totalRequiredWidth = visible.length * currentCandleSpacing;
                    scaleFactor = totalRequiredWidth > chartArea.width ? chartArea.width / totalRequiredWidth : 1;
                }
                const rightPadding = 8;
                const currentCandleX = isHistoricalView
                    ? chartArea.x + ((visible.length - 1) * currentCandleSpacing * scaleFactor)
                    : chartArea.x + chartArea.width - currentCandleWidth - rightPadding;
                const entryElapsed = tradePosition.candlesElapsed;
                const exitElapsed = isCompleted ? tradePosition.exitElapsed : 0;
                const exitPrice = isCompleted ? tradePosition.exitPrice : currentCandle.close;
                const tradePnl = isCompleted ? tradePosition.profit : currentPnl;
                const entryY = p.map(tradePosition.entryPrice, priceScale.min, priceScale.max, chartArea.y + chartArea.height, chartArea.y);
                const exitY = p.map(exitPrice, priceScale.min, priceScale.max, chartArea.y + chartArea.height, chartArea.y);
                const actualEntryX = isHistoricalView
                    ? chartArea.x + ((visible.length - 1 - entryElapsed) * currentCandleSpacing * scaleFactor)
                    : currentCandleX - (entryElapsed * currentCandleSpacing);
                const actualExitX = isHistoricalView
                    ? chartArea.x + ((visible.length - 1 - exitElapsed) * currentCandleSpacing * scaleFactor)
                    : currentCandleX - (exitElapsed * currentCandleSpacing);
                const entryXForSlope = actualEntryX + currentCandleWidth / 2;
                let adjustedExitXForSlope = actualExitX + currentCandleWidth / 2;
                let adjustedExitY = exitY;
                if (!isCompleted && entryElapsed === 0) {
                    adjustedExitXForSlope = adjustedExitXForSlope + Math.min(currentCandleSpacing * 3, 60);
                    adjustedExitY = entryY;
                }
                const slope = (adjustedExitY - entryY) / (adjustedExitXForSlope - entryXForSlope);
                const entryIsVisible = actualEntryX >= chartArea.x;
                let lineStartX = entryIsVisible ? entryXForSlope : chartArea.x;
                let lineStartY = entryIsVisible ? entryY : entryY + (slope * (chartArea.x - entryXForSlope));
                const chartCenterY = chartArea.y + chartArea.height / 2;
                const maxDeviation = chartArea.height * 0.35;
                if (Math.abs(lineStartY - chartCenterY) > maxDeviation) {
                    lineStartY = lineStartY > chartCenterY ? chartCenterY + maxDeviation : chartCenterY - maxDeviation;
                }
                lineStartY = Math.max(chartArea.y + 10, Math.min(chartArea.y + chartArea.height - 10, lineStartY));
                let lineEndX = adjustedExitXForSlope;
                let lineEndY = adjustedExitY;
                const finalEndX = Math.min(lineEndX, chartArea.x + chartArea.width - rightPadding - 5);
                if (!isCompleted && tradePnl >= 0) {
                    pnlLineEndPos = { x: finalEndX, y: lineEndY };
                }
                if (!isCompleted && entryElapsed === 0) {
                    const immediateStartX = currentCandleX + currentCandleWidth / 2;
                    const immediateEndX = Math.min(immediateStartX + 80, chartArea.x + chartArea.width - rightPadding - 10);
                    const immediateY = entryY;
                    if (tradePnl >= 0) {
                        pnlLineEndPos = { x: immediateEndX, y: immediateY };
                    }
                    p.stroke(255, 255, 255, 255);
                    p.strokeWeight(3);
                    p.line(immediateStartX, immediateY, immediateEndX, immediateY);
                    p.fill(255, 255, 255, 255);
                    p.noStroke();
                    p.ellipse(immediateStartX, immediateY, 8, 8);
                    return;
                }
                if (finalEndX < lineStartX) return;
                const isProfit = tradePnl >= 0;
                const lineColor = isProfit ? [0, 255, 136] : [255, 68, 68];
                const alpha = isCompleted ? 180 : 255;
                p.stroke(lineColor[0], lineColor[1], lineColor[2], alpha * 0.3);
                p.strokeWeight(6);
                p.line(lineStartX, lineStartY, finalEndX, lineEndY);
                p.stroke(lineColor[0], lineColor[1], lineColor[2], alpha);
                p.strokeWeight(3);
                p.line(lineStartX, lineStartY, finalEndX, lineEndY);
                if (entryIsVisible && (entryElapsed === 0 || entryElapsed > exitElapsed)) {
                    p.fill(255, 255, 255, alpha);
                    p.noStroke();
                    p.ellipse(lineStartX, lineStartY, 8, 8);
                }
                if (isCompleted) {
                    p.fill(255, 255, 255, alpha);
                    p.noStroke();
                    p.ellipse(finalEndX, lineEndY, 8, 8);
                }
            };

            // Draw all visible candles.
            const drawCandles = (visible: any[], currentCandleWidth: number, currentCandleSpacing: number) => {
                for (let dist = 0; dist < visible.length; dist++) {
                    const candle = visible[visible.length - 1 - dist];
                    if (candle.animation === undefined) {
                        candle.animation = 1;
                    } else {
                        candle.animation = p.lerp(candle.animation, 1, 0.12);
                    }
                    let candleX;
                    if (isHistoricalView) {
                        const totalRequiredWidth = visible.length * currentCandleSpacing;
                        const scaleFactor = totalRequiredWidth > chartArea.width ? chartArea.width / totalRequiredWidth : 1;
                        const reversedIndex = visible.length - 1 - dist;
                        candleX = chartArea.x + (reversedIndex * currentCandleSpacing * scaleFactor);
                        const maxX = chartArea.x + chartArea.width - currentCandleWidth;
                        candleX = Math.min(candleX, maxX);
                    } else {
                        const rightPadding = 8;
                        candleX = chartArea.x + chartArea.width - currentCandleWidth - rightPadding - (dist * currentCandleSpacing);
                    }
                    if (candleX + currentCandleWidth < chartArea.x - 1 || candleX > chartArea.x + chartArea.width + 1) continue;
                    const openY = p.map(candle.open, priceScale.min, priceScale.max, chartArea.y + chartArea.height, chartArea.y);
                    const closeY = p.map(candle.close, priceScale.min, priceScale.max, chartArea.y + chartArea.height, chartArea.y);
                    const highY = p.map(candle.high, priceScale.min, priceScale.max, chartArea.y + chartArea.height, chartArea.y);
                    const lowY = p.map(candle.low, priceScale.min, priceScale.max, chartArea.y + chartArea.height, chartArea.y);
                    const isGreen = candle.close > candle.open;
                    const isLiquidation = candle.isLiquidation;
                    const candleColor = isLiquidation ? [255, 50, 50] : (isGreen ? [0, 255, 136] : [255, 255, 255]);
                    if (isLiquidation) {
                        const liquidationGlow = 150 + Math.sin(p.millis() * 0.01) * 50;
                        p.stroke(255, 0, 0, liquidationGlow);
                        p.strokeWeight(3);
                        p.line(candleX + currentCandleWidth / 2, highY, candleX + currentCandleWidth / 2, lowY);
                    } else if (!isHistoricalView && dist < 3) {
                        p.stroke(candleColor[0], candleColor[1], candleColor[2], 40 * candle.animation);
                        p.strokeWeight(2);
                        p.line(candleX + currentCandleWidth / 2, highY, candleX + currentCandleWidth / 2, lowY);
                    }
                    const wickX = isLiquidation ? candleX + currentCandleWidth / 2 : candleX + currentCandleWidth / 2;
                    p.stroke(candleColor[0], candleColor[1], candleColor[2], 160 * candle.animation);
                    p.strokeWeight(isLiquidation ? 2 : 1);
                    p.line(wickX, highY, wickX, lowY);
                    const bodyHeight = Math.abs(closeY - openY);
                    const bodyY = Math.min(openY, closeY);
                    if (!isHistoricalView && dist === 0) {
                        const pulseSize = p.sin(pulseAnimation) * 1;
                        p.fill(candleColor[0], candleColor[1], candleColor[2], 25 * candle.animation);
                        p.noStroke();
                        p.rect(candleX - pulseSize, bodyY - pulseSize, currentCandleWidth + pulseSize * 2, Math.max(bodyHeight, 1) + pulseSize * 2, 1);
                    }
                    if (isLiquidation) {
                        p.fill(255, 50, 50, 255 * candle.animation);
                        p.stroke(255, 0, 0, 255 * candle.animation);
                        p.strokeWeight(1);
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

            // Draw current price line and label.
            const drawPriceLine = (visible: any[]) => {
                if (visible.length === 0) return;
                const lastCandle = visible[visible.length - 1];
                const priceLineY = p.map(lastCandle.close, priceScale.min, priceScale.max, chartArea.y + chartArea.height, chartArea.y);
                const labelWidth = p.width < 768 ? 44 : 55;
                const labelHeight = p.width < 768 ? 18 : 22;
                const fontSize = p.width < 768 ? 10 : 12;
                const labelX = p.width - labelWidth - 2;
                const priceChange = visible.length > 1 ? lastCandle.close - visible[visible.length - 2].close : 0;
                const glowIntensity = Math.min(Math.abs(priceChange) * 50, 30);
                if (glowIntensity > 5) {
                    p.fill(247, 147, 26, glowIntensity);
                    p.noStroke();
                    p.rect(labelX - 2, priceLineY - labelHeight / 2 - 2, labelWidth + 4, labelHeight + 4, 6);
                }
                p.fill(247, 147, 26, 255);
                p.noStroke();
                p.rect(labelX, priceLineY - labelHeight / 2, labelWidth, labelHeight, 4);
                p.fill(0, 0, 0, 255);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(fontSize);
                p.textStyle(p.BOLD);
                const priceText = lastCandle.close < 100 ? lastCandle.close.toFixed(2) : lastCandle.close.toFixed(0);
                p.text(`$${priceText}`, labelX + labelWidth / 2, priceLineY);
            };

            // Draw Y-axis price labels.
            const drawPriceLabels = () => {
                const fontSize = p.width < 768 ? 8 : 10;
                const labelCount = p.width < 768 ? 5 : 7;
                p.fill(255, 255, 255, 120);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(fontSize);
                const rightMargin = p.width < 768 ? 34 : 46;
                const chartRightEdge = chartArea.x + chartArea.width;
                const labelCenterX = chartRightEdge + (rightMargin / 2);
                for (let i = 0; i <= labelCount; i++) {
                    let y = chartArea.y + (chartArea.height * i / labelCount);
                    if (i === labelCount) y -= 6;
                    const price = p.map(i, 0, labelCount, priceScale.max, priceScale.min);
                    const priceText = price < 100 ? price.toFixed(2) : price.toFixed(0);
                    p.text(`$${priceText}`, labelCenterX, y);
                }
            };

            // Start a new trading position.
            const startPosition = () => {
                try {
                    console.log('[TRADE] Opening position');
                    if (currentPosition || candles.length === 0 || !isRoundActive || isHistoricalView) {
                        console.log('🚫 Buy blocked:', {
                            currentPosition: !!currentPosition,
                            noCandlesData: candles.length === 0,
                            roundNotActive: !isRoundActive,
                            isHistoricalView
                        });
                        return;
                    }
                    const lastCandle = candles[candles.length - 1];
                    const currentBalance = flagsRef.current.balance;
                    const positionSize = currentBalance * 0.2;
                    const shares = positionSize / lastCandle.close;
                    const entryCandleIndex = allRoundCandles.length - 1;

                    currentPosition = {
                        entryPrice: lastCandle.close,
                        shares: shares,
                        positionSize: positionSize,
                        candlesElapsed: 0
                    };
                    currentEntryIndex = entryCandleIndex;
                    isHoldingPosition = true;
                    setIsHolding(true);
                    currentPnl = 0;
                    setPnl(0);
                    p.redraw();

                    // Notify parent component about position opened
                    if (callbacksRef.current.onPositionOpened) {
                        callbacksRef.current.onPositionOpened(lastCandle.close, entryCandleIndex);
                    }

                    // Trade tracking handled locally - no database persistence needed
                } catch (error) {
                    console.error('❌ Error in startPosition:', error);
                }
            };

            // Close current trading position.
            const closePosition = () => {
                try {
                    console.log('[TRADE] Closing position');
                    if (!currentPosition || !isHoldingPosition) {
                        console.log('🚫 Sell blocked:', {
                            noCurrentPosition: !currentPosition,
                            notHolding: !isHoldingPosition
                        });
                        return;
                    }
                    isHoldingPosition = false;
                    setIsHolding(false);
                    const profit = currentPnl;
                    const tradingFee = currentPosition.positionSize * 0.002;
                    const netProfit = profit - tradingFee;
                    completedTrades.push({
                        ...currentPosition,
                        exitPrice: candles[candles.length - 1].close,
                        profit: profit,
                        netProfit: netProfit,
                        exitElapsed: 0
                    });
                    // Trade completion handled locally - no database persistence needed
                    // Update balance: use callback for Aptos mode, direct update for demo mode
                    const exitPrice = candles[candles.length - 1].close;
                    const exitCandleIndex = allRoundCandles.length - 1;

                    if (aptosMode && callbacksRef.current.onPositionClosed) {
                        callbacksRef.current.onPositionClosed(exitPrice, exitCandleIndex, netProfit);
                    } else {
                        setBalance(prevBalance => {
                            const newBalance = prevBalance + netProfit;
                            return newBalance;
                        });
                    }
                    if (netProfit > 0) {
                        setShowFireworks(true);
                        setTimeout(() => setShowFireworks(false), 1000);
                        if (pnlLineEndPos) {
                            shouldExplodeEmojis = true;
                            explosionCenter = { x: pnlLineEndPos.x, y: pnlLineEndPos.y };
                        }
                        const cashSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
                        cashSound.volume = 0.7;
                        cashSound.play().catch(err => console.log('Could not play cash sound:', err));
                    } else if (netProfit < 0) {
                        // Loss animation and sound
                        setShowLossAnimation(true);
                        setTimeout(() => setShowLossAnimation(false), 1500);

                        // Visual effects for loss
                        screenShake = 15; // Screen shake intensity
                        lossFlash = 255; // Red flash intensity

                        const lossSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2037/2037-preview.mp3');
                        lossSound.volume = 0.6;
                        lossSound.play().catch(err => console.log('Could not play loss sound:', err));
                    }
                    currentPosition = null;
                    currentTradeId = null;
                    currentEntryIndex = null;
                    if (!liquidationCandleCreated && !rugpullActive) {
                        currentPnl = 0;
                        setPnl(0);
                    }
                    pnlLineEndPos = null;
                } catch (error) {
                    console.error('❌ Error in closePosition:', error);
                }
            };

            // p5 setup: Initialize canvas and chart area.
            p.setup = () => {
                p.createCanvas(p.windowWidth, p.windowHeight);
                p.textFont('Bai Jamjuree');
                p.strokeCap(p.ROUND);
                const isMobile = p.windowWidth < 768;
                const leftMargin = isMobile ? 4 : 8;
                const rightMargin = isMobile ? 34 : 46;
                const topMargin = getTopMargin();
                const bottomInset = getSafeBottom();
                chartArea = {
                    x: leftMargin,
                    y: topMargin,
                    width: p.windowWidth - leftMargin - rightMargin,
                    height: p.windowHeight - topMargin + bottomInset - (isStandalone ? 15 : 8)
                };
                p.resizeCanvas(p.windowWidth, p.windowHeight + bottomInset);
                candleWidth = isMobile ? 4 : 6;
                candleSpacing = isMobile ? 6 : 8;
                maxCandles = Math.floor(chartArea.width / candleSpacing);
                startRound();
            };

            // p5 draw loop: Main rendering and update cycle.
            p.draw = () => {
                p.background(12, 12, 12);
                const flags = flagsRef.current;
                if (flags.isPaused) {
                    // Paused state - silent return
                    return;
                }

                // Apply screen shake for loss effect
                if (screenShake > 0) {
                    p.translate(
                        (Math.random() - 0.5) * screenShake,
                        (Math.random() - 0.5) * screenShake
                    );
                    screenShake *= 0.9; // Decay shake
                    if (screenShake < 0.1) screenShake = 0;
                }

                // Apply red flash overlay for loss
                if (lossFlash > 0) {
                    p.fill(255, 0, 0, lossFlash * 0.1); // Red with low opacity
                    p.rect(0, 0, p.width, p.height);
                    lossFlash *= 0.85; // Decay flash
                    if (lossFlash < 1) lossFlash = 0;
                }

                pulseAnimation += 0.1;
                checkRoundEnd();
                const targetInterval = rugpullSlowMotion ? intervalMs * 3 : intervalMs; // Use EXACT interval from config
                const currentTime = p.millis();
                const timeSinceLastUpdate = currentTime - lastUpdate;

                // Debug logging disabled to reduce noise
                // if (currentTime % 1000 < 100) {
                //     console.log(`🔧 targetInterval: ${targetInterval}ms, intervalMs: ${intervalMs}, timeSinceLastUpdate: ${timeSinceLastUpdate}ms`);
                // }

                const shouldAddCandle = isAnimating && isRoundActive && !liquidationCandleCreated && !rugpullActive && timeSinceLastUpdate > targetInterval;

                if (shouldAddCandle) {
                    // Generate candle on-demand using the current index as seed offset
                    if (currentIndex < generatedCandles.length) {
                        addCandle(generatedCandles[currentIndex]);
                    } else {
                        // Generate additional candles on-demand beyond the pre-generated set
                        const additionalCandle = generateSingleCandle(currentIndex, activeSeed!, activeConfig!);
                        addCandle(additionalCandle);
                    }

                    const oldIndex = currentIndex;
                    currentIndex++;
                    lastUpdate = currentTime;

                    // Candle creation logging disabled to reduce noise
                    // console.log(`🕯️ Candle ${oldIndex}→${currentIndex} - Time: ${(currentTime - roundStartTime).toFixed(0)}ms`);
                }
                const visible = isHistoricalView ? allRoundCandles : candles;
                let originalChartArea = null;
                if (isHistoricalView && p.windowWidth < 768) {
                    originalChartArea = { ...chartArea };
                    const bottomInsetHist = getSafeBottom();
                    chartArea.x = 10;
                    chartArea.width = p.windowWidth - 20;
                    chartArea.height = p.windowHeight - chartArea.y + bottomInsetHist - (isStandalone ? 15 : 8);
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
                    const availableWidth = chartArea.width;
                    const isMobile = p.windowWidth < 768;
                    let targetSpacing = availableWidth / visible.length;
                    const minSpacing = isMobile ? 1 : 2;
                    const maxSpacing = isMobile ? 20 : 50;
                    targetSpacing = Math.max(minSpacing, Math.min(targetSpacing, maxSpacing));
                    let targetWidth = targetSpacing * 0.8;
                    const minWidth = isMobile ? 0.5 : 1;
                    targetWidth = Math.max(minWidth, Math.min(targetWidth, candleWidth));
                    if (isMobile && visible.length > 100) {
                        targetWidth = Math.max(minWidth, targetSpacing * 0.6);
                    }
                    currentCandleSpacing = p.lerp(candleSpacing, targetSpacing, zoomProgress);
                    currentCandleWidth = p.lerp(candleWidth, targetWidth, zoomProgress);
                }
                drawGrid();
                drawCandles(visible, currentCandleWidth, currentCandleSpacing);
                if (!(isHistoricalView && p.windowWidth < 768)) {
                    drawPriceLine(visible);
                    drawPriceLabels();
                }
                drawPNLLine(currentCandleWidth, currentCandleSpacing, visible);
                drawTimer();
                gridAlpha = p.lerp(gridAlpha, 40, 0.1);
                if (!isHoldingPosition || currentPnl <= 0) {
                    pnlLineEndPos = null;
                }
                updateMoneyEmojis();
                if (originalChartArea) {
                    chartArea = originalChartArea;
                }
            };

            // Handle window resize.
            p.windowResized = () => {
                p.resizeCanvas(p.windowWidth, p.windowHeight);
                if (p.strokeCap && p.ROUND) {
                    p.strokeCap(p.ROUND);
                }
                const isMobile = p.windowWidth < 768;
                const leftMargin = isMobile ? 4 : 8;
                const rightMargin = isMobile ? 34 : 46;
                const topMargin = getTopMargin();
                const bottomInset = getSafeBottom();
                chartArea = {
                    x: leftMargin,
                    y: topMargin,
                    width: p.windowWidth - leftMargin - rightMargin,
                    height: p.windowHeight - topMargin + bottomInset - (isStandalone ? 15 : 8)
                };
                p.resizeCanvas(p.windowWidth, p.windowHeight + bottomInset);
                candleWidth = isMobile ? 4 : 6;
                candleSpacing = isMobile ? 6 : 8;
                maxCandles = Math.floor(chartArea.width / candleSpacing);
            };

            // Mouse/touch handlers for buying/selling.
            let touchActive = false;
            p.mousePressed = () => {
                // console.log('🖱️ MOUSE CLICK detected');
                if (modalOpenRef.current) {
                    console.log('🚫 Click blocked: modal is open');
                    return true;
                }
                const f = flagsRef.current
                if (f.isPaused || f.overlayActive || f.disableClicks) {
                    console.log('🚫 Click blocked by flags:', f);
                    return true;
                }
                try {
                    if (!touchActive) {
                        // console.log('🖱️ Processing mouse click - calling startPosition');
                        startPosition();
                    }
                } catch (error) {
                    console.log('❌ Mouse handler error, p5 not ready');
                }
                // Prevent default only when we handle the press
                return false;
            };
            p.mouseReleased = () => {
                // console.log('🖱️ MOUSE RELEASE detected');
                if (modalOpenRef.current) return true;
                const f = flagsRef.current
                if (f.isPaused || f.overlayActive || f.disableClicks) return true;
                try {
                    if (!touchActive) {
                        // console.log('🖱️ Processing mouse release - calling closePosition');
                        closePosition();
                    }
                } catch (error) {
                    console.log('❌ Mouse release handler error, p5 not ready');
                }
                return false;
            };
            p.touchStarted = (event?: any) => {
                const f = flagsRef.current
                if (modalOpenRef.current || f.isPaused || f.overlayActive || f.disableClicks) {
                    // Allow default so inputs/buttons can be focused
                    return true;
                }
                touchActive = true;
                startPosition();
                if (event && event.preventDefault) event.preventDefault();
                return false;
            };
            p.touchMoved = (event?: any) => {
                if (event && event.preventDefault) event.preventDefault();
                return false;
            };
            p.touchEnded = (event?: any) => {
                const f = flagsRef.current
                if (modalOpenRef.current || f.isPaused || f.overlayActive || f.disableClicks) {
                    return true;
                }
                touchActive = false;
                closePosition();
                if (event && event.preventDefault) event.preventDefault();
                return false;
            };

            // Debug: map overlay Buy(hold) to start/close position
            if (debugEnabled) {
                const onHoldStart = () => {
                    const f = flagsRef.current
                    if (f.isPaused) return
                    try { startPosition(); } catch { }
                }
                const onHoldEnd = () => {
                    const f = flagsRef.current
                    if (f.isPaused) return
                    try { closePosition(); } catch { }
                }
                window.addEventListener('debug-hold-start', onHoldStart)
                window.addEventListener('debug-hold-end', onHoldEnd)
                debugListenersRef.current.start = onHoldStart
                debugListenersRef.current.end = onHoldEnd
            }
        };
        p5InstanceRef.current = new p5(sketch, chartRef.current!);
        return () => {
            // Cleanup debug listeners
            if (debugListenersRef.current.start) {
                window.removeEventListener('debug-hold-start', debugListenersRef.current.start)
            }
            if (debugListenersRef.current.end) {
                window.removeEventListener('debug-hold-end', debugListenersRef.current.end)
            }
            if (p5InstanceRef.current) {
                p5InstanceRef.current.remove();
            }
        };
    }, [resetKey]); // Recreate p5 instance when resetKey changes

    // Control p5 draw loop based on pause state
    useEffect(() => {
        const inst = p5InstanceRef.current as any
        if (!inst) return
        try {
            const now = inst.millis ? inst.millis() : Date.now()
            if (flagsRef.current.isPaused) {
                inst.__pauseStart = now
                inst.noLoop()
            } else {
                if (inst.__pauseStart) {
                    inst.__pausedMs = (inst.__pausedMs || 0) + (now - inst.__pauseStart)
                    inst.__pauseStart = null
                }
                inst.loop()
            }
        } catch { }
    }, [isPaused])
};

export default useP5Chart; 
