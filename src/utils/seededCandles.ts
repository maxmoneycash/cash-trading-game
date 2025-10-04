/**
 * Deterministic candle generation for a provably fair trading game.
 * - Fixed-point arithmetic (scale-based) for cross-platform consistency
 * - Deterministic timestamps based on start_at_ms + i * interval_ms
 * - 100% integer math - NO floats in generation to avoid JS engine differences
 * - Identical outputs in Node and browsers for a given (seed, config)
 *
 * IMPORTANT:
 *   - Server MUST provide `start_at_ms` (grid-aligned to interval_ms) in the config.
 *   - Client MUST use the server-provided config verbatim.
 */

// --- Environment-safe crypto -----------------------------------------------

const getCrypto = (): any => {
    // Browser SubtleCrypto available?
    if (typeof window !== "undefined" && (window as any).crypto) {
        return (window as any).crypto;
    }
    // Node.js 'crypto'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    try { return require("crypto"); } catch { /* fallthrough */ }
    throw new Error("No crypto implementation found");
};

// --- Types ------------------------------------------------------------------

export const PRICE_SCALE = 1_000_000; // 6 decimal places

export type CandleConfig = {
    fairness_version: string;     // e.g. '2' (bumped due to algorithm change)
    prng: string;                 // label the PRNG (e.g. 'xorshift128')
    scale: number;                // fixed-point price scale
    interval_ms: number;          // candle interval in ms
    total_candles: number;        // number of candles to generate
    initial_price_fp: number;     // starting price in fixed-point
    start_at_ms: number;          // deterministic start timestamp (set by server)
};

export type CandleFP = {
    open: number;   // fixed-point
    high: number;   // fixed-point
    low: number;    // fixed-point
    close: number;  // fixed-point
    timestamp: number; // epoch ms, deterministic from start_at_ms
};

export type CandleData = {
    open: number;
    high: number;
    low: number;
    close: number;
    timestamp: number;
};

// --- PRNG (xorshift128 style; 4x32-bit state; deterministic everywhere) -----

/**
 * PRNG with 128 bits of state (4x32). This matches an xorshift128 variant,
 * not the 64-bit xorshift128+; hence we label 'xorshift128' in config.prng.
 * Output is a 32-bit unsigned integer per step.
 */
export class SeededRandom {
    private state: Uint32Array;

    constructor(seedBytes: Uint8Array) {
        if (seedBytes.length !== 32) {
            throw new Error("Seed must be exactly 32 bytes");
        }
        this.state = new Uint32Array(4);
        // Little-endian load for stability
        const view = new DataView(seedBytes.buffer, seedBytes.byteOffset, seedBytes.byteLength);
        for (let i = 0; i < 4; i++) {
            this.state[i] = view.getUint32(i * 8, true) ^ view.getUint32(i * 8 + 4, true);
        }
        // Avoid all-zero state
        if ((this.state[0] | this.state[1] | this.state[2] | this.state[3]) === 0) {
            this.state[0] = 0x1;
            this.state[1] = 0x9e3779b9; // some non-zero constants
            this.state[2] = 0x243f6a88;
            this.state[3] = 0xb7e15162;
        }
        // Warm up
        for (let i = 0; i < 16; i++) this.nextU32();
    }

    // Make nextU32 public for integer-only generation
    public nextU32(): number {
        // xorshift128 (Marsaglia) with 32-bit ops
        let t = this.state[3];
        t ^= t << 11;
        t ^= t >>> 8;

        this.state[3] = this.state[2];
        this.state[2] = this.state[1];
        this.state[1] = this.state[0];

        let s = this.state[0];
        t ^= s;
        t ^= s >>> 19;

        this.state[0] = t >>> 0;
        return this.state[0];
    }

    /** Uniform in [0, 1) using 32-bit precision */
    random(): number {
        // Divide by 2^32 to get [0,1)
        return this.nextU32() / 0x100000000;
    }

    /** Uniform in [min, max) */
    randomRange(min: number, max: number): number {
        return min + this.random() * (max - min);
    }
}

// --- Helpers ----------------------------------------------------------------

const hexToBytes32 = (seedHex: string): Uint8Array => {
    const clean = seedHex.startsWith("0x") ? seedHex.slice(2) : seedHex;
    if (clean.length !== 64) throw new Error("Seed must be 64 hex chars (32 bytes)");
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
};

// --- Core generation (100% INTEGER MATH) ------------------------------------

/**
 * Generate deterministic candles from (seed, config).
 * - Uses ONLY integer math for OHLC (no floats, no trig)
 * - Timestamps are: t(i) = start_at_ms + i * interval_ms
 */
export function generateSeededCandles(seedHex: string, config: CandleConfig): CandleFP[] {
    if (config.total_candles <= 0) return [];

    const seed = hexToBytes32(seedHex);
    const rng = new SeededRandom(seed);
    const candles: CandleFP[] = [];

    // Helper: uniform int in [min, max] inclusive using only integers
    const randint = (min: number, max: number) => min + (rng.nextU32() % (max - min + 1));

    let currentPrice = Math.max(1, Math.floor(config.initial_price_fp));
    const baseTs = Math.floor(config.start_at_ms);
    const { interval_ms, total_candles, scale } = config;

    // Integer-only state (no floats!)
    let momentum_bps = 0;                              // basis points (1 bps = 0.01%)
    const MOM_DECAY_NUM = 90, MOM_DECAY_DEN = 100;     // ≈0.90 decay
    const MOM_KICK_MIN = -8, MOM_KICK_MAX = 8;         // random kick each step

    // Volatility regime (captures clustering); 0=calm,1=volatile,2=very volatile
    let vol_regime = 0;                                 // start calm
    const VOL_MULT = [1, 2, 4];                        // multiplier per regime
    const BASE_VOL_BPS = 10;                            // base shock scale in bps
    // Regime transition probabilities (per candle)
    const REGIME_CHANGE_PERMILLE = 8;                   // ~0.8% chance to change

    for (let i = 0; i < total_candles; i++) {
        // Possibly change volatility regime (small probability)
        if ((rng.nextU32() % 1000) < REGIME_CHANGE_PERMILLE) {
            const dir = (rng.nextU32() & 1) ? 1 : -1; // up or down
            vol_regime = Math.min(2, Math.max(0, vol_regime + dir));
        }

        // Momentum update (integer decay + random kick scaled by regime)
        momentum_bps = Math.trunc((momentum_bps * MOM_DECAY_NUM) / MOM_DECAY_DEN)
                      + (randint(MOM_KICK_MIN, MOM_KICK_MAX) * VOL_MULT[vol_regime]);

        // Shock term (scaled by regime)
        const shock_scale = BASE_VOL_BPS * VOL_MULT[vol_regime];
        const shock_bps = randint(-2 * shock_scale, 2 * shock_scale); // wider uniform

        // Occasional jumps (rare, larger moves) scaled by regime
        let jump_bps = 0;
        if ((rng.nextU32() % 1000) < 4) { // ~0.4% per candle
            const mag = randint(30, 120) * VOL_MULT[vol_regime]; // 0.3%..1.2% (times regime)
            jump_bps = (rng.nextU32() & 1) ? mag : -mag;
        }

        // Total step in bps
        let step_bps = momentum_bps + shock_bps + jump_bps;

        // Clamp overall step to a sane range
        if (step_bps > 120) step_bps = 120;
        if (step_bps < -120) step_bps = -120;

        // Integer delta: price * step_bps / 10_000
        const delta_fp = Math.trunc((currentPrice * step_bps) / 10000);
        const nextPrice = Math.max(Math.trunc(scale * 0.1), currentPrice + delta_fp); // floor at 10% of scale

        const open = currentPrice;
        const close = nextPrice;

        // Wicks (all integer)
        const body = Math.abs(close - open);
        const wickMin = Math.max(Math.trunc((body * 40) / 100), Math.trunc(currentPrice / 1200));      // max(40% body, ~0.083%)
        const wickMax = Math.trunc((body * 280) / 100) + Math.trunc((currentPrice * 4) / 1000);        // 280% body + 0.4%
        const wickRange = Math.max(1, wickMax - wickMin);

        const high = Math.max(open, close) + randint(0, wickRange);
        const low = Math.min(open, close) - randint(0, wickRange);

        const finalHigh = Math.max(high, Math.max(open, close));
        const finalLow = Math.max(Math.min(low, Math.min(open, close)), Math.trunc(scale * 0.05)); // never below 5% of scale

        candles.push({
            open,
            high: finalHigh,
            low: finalLow,
            close,
            timestamp: baseTs + i * interval_ms,
        });

        currentPrice = nextPrice;
    }

    return candles;
}

/** Convert fixed-point candles to float for rendering */
export function toFloatingPoint(candles: CandleFP[], scale: number): CandleData[] {
    return candles.map(c => ({
        open: c.open / scale,
        high: c.high / scale,
        low: c.low / scale,
        close: c.close / scale,
        timestamp: c.timestamp,
    }));
}

// --- Fairness digests --------------------------------------------------------

/**
 * Canonical JSON used for digesting (seed + config + compacted candles).
 * NOTE: Keep field order stable.
 */
const canonicalize = (seedHex: string, cfg: CandleConfig, candles: CandleFP[]) => ({
    seed: seedHex,
    config: {
        fairness_version: cfg.fairness_version,
        prng: cfg.prng,
        scale: cfg.scale,
        interval_ms: cfg.interval_ms,
        total_candles: cfg.total_candles,
        initial_price_fp: cfg.initial_price_fp,
        start_at_ms: cfg.start_at_ms,
    },
    candles: candles.map(c => ({ o: c.open, h: c.high, l: c.low, c: c.close, t: c.timestamp })),
});

/**
 * Async (browser-friendly) digest generator.
 * - Browser: uses SubtleCrypto
 * - Node: uses crypto.createHash (sync under the hood)
 */
export async function generateCandleDigest(
    seedHex: string,
    config: CandleConfig,
    candles: CandleFP[]
): Promise<string> {
    const canonicalString = JSON.stringify(canonicalize(seedHex, config, candles));
    const crypto = getCrypto();

    // Browser path (SubtleCrypto)
    if (typeof window !== "undefined" && crypto?.subtle?.digest) {
        const enc = new TextEncoder();
        const buf = enc.encode(canonicalString);
        const hashBuf: ArrayBuffer = await crypto.subtle.digest("SHA-256", buf);
        const bytes = Array.from(new Uint8Array(hashBuf));
        return bytes.map(b => b.toString(16).padStart(2, "0")).join("");
    }

    // Node path (sync)
    const hash = crypto.createHash("sha256");
    hash.update(canonicalString);
    return hash.digest("hex");
}

/** Node-only synchronous digest (useful on the server) */
export function generateCandleDigestSync(
    seedHex: string,
    config: CandleConfig,
    candles: CandleFP[]
): string {
    if (typeof window !== "undefined") {
        throw new Error("Use generateCandleDigest() in browser environments");
    }
    const crypto = getCrypto();
    const hash = crypto.createHash("sha256");
    hash.update(JSON.stringify(canonicalize(seedHex, config, candles)));
    return hash.digest("hex");
}

/** Verify that seed+config reproduce a candle set matching expected digest */
export async function verifyCandleDigest(
    seedHex: string,
    config: CandleConfig,
    expectedDigest: string
): Promise<boolean> {
    const candles = generateSeededCandles(seedHex, config);
    const actual = await generateCandleDigest(seedHex, config, candles);
    return actual === expectedDigest;
}

// --- Defaults (NO Date.now() fallback!) -------------------------------------

/**
 * Create a default config. 
 * REQUIRES server-computed, interval-aligned `start_at_ms`.
 * NO fallback to Date.now() to ensure deterministic digests.
 */
export function createDefaultConfig(start_at_ms: number): CandleConfig {
    if (!Number.isInteger(start_at_ms)) {
        throw new Error("start_at_ms must be an integer (server-aligned to interval_ms).");
    }
    return {
        fairness_version: "2",        // Bumped due to algorithm change
        prng: "xorshift128",
        scale: PRICE_SCALE,
        interval_ms: 65,
        total_candles: 462, // Exactly 30s at 65ms interval (30000ms ÷ 65ms)
        initial_price_fp: 100 * PRICE_SCALE, // $100
        start_at_ms,
    };
}

/**
 * Alignment guard - call on server to ensure proper timestamp alignment
 */
export function assertAligned(cfg: CandleConfig): void {
    if (cfg.start_at_ms % cfg.interval_ms !== 0) {
        throw new Error("start_at_ms must be aligned to interval_ms for clean timestamps.");
    }
}
