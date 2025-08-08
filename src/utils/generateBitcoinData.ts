/**
 * Generates simulated historical Bitcoin price data for the chart.
 * Uses sine waves, events, and randomness for realistic patterns.
 */
const generateBitcoinData = () => {
    const data = [];
    let price = 10;
    const startDate = new Date('2009-01-01');
    const createSineWave = (period: number, amplitude: number, phase = 0) => (i: number) =>
        Math.sin((i * 2 * Math.PI / period) + phase) * amplitude;
    const longTermTrend = createSineWave(1200, 0.3);
    const mediumTerm = createSineWave(250, 0.15);
    const shortTerm = createSineWave(60, 0.08);
    const noise = createSineWave(12, 0.05);
    const microNoise = createSineWave(3, 0.02);
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
        { date: new Date('2014-02-01'), multiplier: 0.3, name: "Mt. Gox Collapse", duration: 120 },
        { date: new Date('2015-01-01'), multiplier: 0.4, name: "Extended Bear Market", duration: 180 },
        { date: new Date('2016-07-01'), multiplier: 1.7, name: "Second Halving", duration: 180 },
        { date: new Date('2017-01-01'), multiplier: 2.8, name: "Institutional Interest", duration: 90 },
        { date: new Date('2017-09-01'), multiplier: 0.35, name: "China Exchange Ban", duration: 45 },
        { date: new Date('2017-12-01'), multiplier: 5.5, name: "Retail FOMO", duration: 30 },
        { date: new Date('2018-01-01'), multiplier: 0.15, name: "Crypto Winter", duration: 365 },
        { date: new Date('2018-11-01'), multiplier: 0.3, name: "Hash War Crash", duration: 60 },
        { date: new Date('2020-03-01'), multiplier: 0.3, name: "COVID Crash", duration: 30 },
        { date: new Date('2020-05-01'), multiplier: 1.6, name: "Third Halving", duration: 120 },
        { date: new Date('2020-10-01'), multiplier: 2.2, name: "PayPal Integration", duration: 60 },
        { date: new Date('2021-02-01'), multiplier: 3.0, name: "Tesla Investment", duration: 90 },
        { date: new Date('2021-04-01'), multiplier: 0.4, name: "Regulation FUD", duration: 60 },
        { date: new Date('2021-05-01'), multiplier: 0.25, name: "China Mining Ban", duration: 90 },
        { date: new Date('2021-10-01'), multiplier: 1.8, name: "ETF Approval", duration: 45 }
    ];
    for (let i = 0; i < 3000; i++) {
        const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const yearProgress = i / 365.25;
        let baseGrowthMultiplier = 1;
        if (yearProgress < 1) baseGrowthMultiplier = 1;
        else if (yearProgress < 2) baseGrowthMultiplier = 1.5;
        else if (yearProgress < 3) baseGrowthMultiplier = 3;
        else if (yearProgress < 4) baseGrowthMultiplier = 8;
        else if (yearProgress < 5) baseGrowthMultiplier = 25;
        else if (yearProgress < 6) baseGrowthMultiplier = 18;
        else if (yearProgress < 7) baseGrowthMultiplier = 22;
        else if (yearProgress < 8) baseGrowthMultiplier = 35;
        else if (yearProgress < 9) baseGrowthMultiplier = 180;
        else if (yearProgress < 10) baseGrowthMultiplier = 85;
        else if (yearProgress < 11) baseGrowthMultiplier = 110;
        else if (yearProgress < 12) baseGrowthMultiplier = 320;
        else baseGrowthMultiplier = 450;
        const trendWave = longTermTrend(i) + mediumTerm(i) + shortTerm(i) + noise(i) + microNoise(i);
        let eventMultiplier = 1;
        let eventVolatility = 1;
        for (const event of events) {
            const daysDiff = Math.abs(currentDate.getTime() - event.date.getTime()) / (24 * 60 * 60 * 1000);
            if (daysDiff < event.duration) {
                const eventStrength = Math.max(0.1, 1 - (daysDiff / event.duration));
                eventMultiplier *= (1 + (event.multiplier - 1) * eventStrength * 0.3);
                eventVolatility *= (1 + eventStrength * 1.5);
            }
        }
        const baseVolatility = 0.02 + Math.pow(Math.random(), 0.6) * 0.12;
        const choppiness = Math.sin(i * 0.4) * 0.6 + 0.4;
        const alternatingBias = Math.sin(i * 0.7) * 0.25;
        const drawdownCycles = Math.sin(i * 0.001) * 0.4;
        const miniCrashes = Math.sin(i * 0.04) * 0.2;
        const drawdownMultiplier = drawdownCycles < -0.15 ? 0.7 + (drawdownCycles + 0.15) * 1.8 : 1;
        const consolidationCycle = Math.sin(i * 0.015) * 0.6;
        const isConsolidating = consolidationCycle > 0.4;
        const trendBias = trendWave * 0.4 + alternatingBias;
        const randomFactor = (Math.random() - 0.5) * 2.5;
        const consolidationDamping = isConsolidating ? 0.4 : 1;
        const direction = Math.sign(trendBias + randomFactor * 0.8 + miniCrashes) * consolidationDamping;
        const basePrice = 10 * baseGrowthMultiplier;
        const currentBasePrice = basePrice * eventMultiplier * drawdownMultiplier;
        const volatility = baseVolatility * eventVolatility * (1 + choppiness * 0.6);
        const consolidationVolatility = isConsolidating ? 0.6 : 1;
        const bigMoveChance = Math.random();
        const bigMoveMultiplier = bigMoveChance < 0.05 ? 2.5 : (bigMoveChance < 0.15 ? 1.5 : 1);
        const moveSize = volatility * currentBasePrice * (0.4 + Math.random() * 0.8) * consolidationVolatility * bigMoveMultiplier;
        const open = price;
        const wickMultiplier = 0.3 + Math.random() * 0.7;
        const openToHigh = Math.random() * moveSize * wickMultiplier * (direction > 0 ? 1.3 : 0.7);
        const openToLow = Math.random() * moveSize * wickMultiplier * (direction < 0 ? 1.3 : 0.7);
        const openToClose = direction * moveSize * (0.4 + Math.random() * 0.7);
        const maxWickSize = moveSize * 0.8;
        const high = open + Math.min(Math.abs(openToHigh), maxWickSize);
        const low = open - Math.min(Math.abs(openToLow), maxWickSize);
        const close = Math.max(low + 0.01, Math.min(high - 0.01, open + openToClose));
        const targetAdjustment = (currentBasePrice - price) * 0.01;
        const adjustedClose = close + targetAdjustment;
        const minPrice = Math.max(currentBasePrice * 0.1, 5);
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
        price = finalClose;
    }
    return data;
};

export default generateBitcoinData;
