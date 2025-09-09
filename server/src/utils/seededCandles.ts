/**
 * Deterministic candle generation for a provably fair trading game.
 * SERVER VERSION - CommonJS compatible
 */

import crypto from 'crypto'; // Direct import for Node.js

// --- Types ------------------------------------------------------------------

export const PRICE_SCALE = 1_000_000; // 6 decimal places

export type CandleConfig = {
  fairness_version: string;
  prng: string;
  scale: number;
  interval_ms: number;
  total_candles: number;
  initial_price_fp: number;
  start_at_ms: number;
};

export type CandleFP = {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
};

export type CandleData = {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
};

// --- PRNG -------------------------------------------------------------------

export class SeededRandom {
  private state: Uint32Array;

  constructor(seedBytes: Uint8Array) {
    if (seedBytes.length !== 32) {
      throw new Error("Seed must be exactly 32 bytes");
    }
    this.state = new Uint32Array(4);
    const view = new DataView(seedBytes.buffer, seedBytes.byteOffset, seedBytes.byteLength);
    for (let i = 0; i < 4; i++) {
      this.state[i] = view.getUint32(i * 8, true) ^ view.getUint32(i * 8 + 4, true);
    }
    if ((this.state[0] | this.state[1] | this.state[2] | this.state[3]) === 0) {
      this.state[0] = 0x1;
      this.state[1] = 0x9e3779b9;
      this.state[2] = 0x243f6a88;
      this.state[3] = 0xb7e15162;
    }
    for (let i = 0; i < 16; i++) this.nextU32();
  }

  public nextU32(): number {
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

  random(): number {
    return this.nextU32() / 0x100000000;
  }

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

// --- Core generation --------------------------------------------------------

export function generateSeededCandles(seedHex: string, config: CandleConfig): CandleFP[] {
  if (config.total_candles <= 0) return [];

  const seed = hexToBytes32(seedHex);
  const rng = new SeededRandom(seed);
  const candles: CandleFP[] = [];

  const randint = (min: number, max: number) => min + (rng.nextU32() % (max - min + 1));

  let currentPrice = Math.max(1, Math.floor(config.initial_price_fp));
  const baseTs = Math.floor(config.start_at_ms);
  const { interval_ms, total_candles, scale } = config;

  let momentum_bps = 0;
  const MOM_DECAY_NUM = 85, MOM_DECAY_DEN = 100;
  const MOM_KICK_MIN = -6, MOM_KICK_MAX = 6;

  const PERIOD = 256;
  const HALF = PERIOD >> 1;
  const TREND_STEP = (rng.nextU32() % 3) + 1;
  const TREND_AMPL_BPS = 22;
  let trend_phase = 0;

  for (let i = 0; i < total_candles; i++) {
    trend_phase = (trend_phase + TREND_STEP) & 0xff;
    let trend_bps: number;
    if (trend_phase < HALF) {
      trend_bps = -TREND_AMPL_BPS + Math.floor((2 * TREND_AMPL_BPS * trend_phase) / HALF);
    } else {
      const p = trend_phase - HALF;
      trend_bps = TREND_AMPL_BPS - Math.floor((2 * TREND_AMPL_BPS * p) / HALF);
    }

    momentum_bps = Math.trunc((momentum_bps * MOM_DECAY_NUM) / MOM_DECAY_DEN) + randint(MOM_KICK_MIN, MOM_KICK_MAX);
    const shock_bps = randint(-12, 12);
    let step_bps = trend_bps + momentum_bps + shock_bps;

    if (step_bps > 60) step_bps = 60;
    if (step_bps < -60) step_bps = -60;

    const delta_fp = Math.trunc((currentPrice * step_bps) / 10000);
    const nextPrice = Math.max(Math.trunc(scale * 0.1), currentPrice + delta_fp);

    const open = currentPrice;
    const close = nextPrice;

    const body = Math.abs(close - open);
    const wickMin = Math.max(Math.trunc((body * 50) / 100), Math.trunc(currentPrice / 1000));
    const wickMax = Math.trunc((body * 250) / 100) + Math.trunc((currentPrice * 3) / 1000);
    const wickRange = Math.max(1, wickMax - wickMin);

    const high = Math.max(open, close) + randint(0, wickRange);
    const low  = Math.min(open, close) - randint(0, wickRange);

    const finalHigh = Math.max(high, Math.max(open, close));
    const finalLow  = Math.max(Math.min(low, Math.min(open, close)), Math.trunc(scale * 0.05));

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

export function toFloatingPoint(candles: CandleFP[], scale: number): CandleData[] {
  return candles.map(c => ({
    open: c.open / scale,
    high: c.high / scale,
    low:  c.low  / scale,
    close: c.close / scale,
    timestamp: c.timestamp,
  }));
}

// --- Fairness digests -------------------------------------------------------

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

export function generateCandleDigestSync(
  seedHex: string,
  config: CandleConfig,
  candles: CandleFP[]
): string {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(canonicalize(seedHex, config, candles)));
  return hash.digest("hex");
}

export async function generateCandleDigest(
  seedHex: string,
  config: CandleConfig,
  candles: CandleFP[]
): Promise<string> {
  // For Node.js, just use the sync version
  return generateCandleDigestSync(seedHex, config, candles);
}

export async function verifyCandleDigest(
  seedHex: string,
  config: CandleConfig,
  expectedDigest: string
): Promise<boolean> {
  const candles = generateSeededCandles(seedHex, config);
  const actual = generateCandleDigestSync(seedHex, config, candles);
  return actual === expectedDigest;
}

export function createDefaultConfig(start_at_ms: number): CandleConfig {
  if (!Number.isInteger(start_at_ms)) {
    throw new Error("start_at_ms must be an integer (server-aligned to interval_ms).");
  }
  return {
    fairness_version: "2",
    prng: "xorshift128",
    scale: PRICE_SCALE,
    interval_ms: 65,
    total_candles: 460,
    initial_price_fp: 100 * PRICE_SCALE,
    start_at_ms,
  };
}

export function assertAligned(cfg: CandleConfig): void {
  if (cfg.start_at_ms % cfg.interval_ms !== 0) {
    throw new Error("start_at_ms must be aligned to interval_ms for clean timestamps.");
  }
}
