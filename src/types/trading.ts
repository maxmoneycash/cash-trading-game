// Trading types for the cash trading game

export interface Trade {
    id: string;
    entryPrice: number;
    exitPrice?: number;
    entryTimestamp: number;
    exitTimestamp?: number;
    size: number; // Position size in APT
    pnl?: number; // P&L in APT
    status: 'open' | 'closed';
    entryCandleIndex: number;
    exitCandleIndex?: number;
}

export interface GameSession {
    seed: string;
    betAmount: number;
    startTimestamp: number;
    endTimestamp?: number;
    trades: Trade[];
    totalPnl: number;
    status: 'active' | 'completed';
}

export interface TradeForContract {
    entry_price: string; // Fixed-point as string
    exit_price: string;  // Fixed-point as string
    entry_candle_index: string;
    exit_candle_index: string;
    size: string; // In octas as string
    pnl: string;  // In octas as string (can be negative)
}
