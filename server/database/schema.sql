-- Cash Trading Game - Basic Database Schema
-- Simple proof of concept with essential tables

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    balance REAL DEFAULT 1000.0,
    locked_balance REAL DEFAULT 0.0,
    total_pnl REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT NOT NULL,
    seed TEXT NOT NULL,
    block_height INTEGER,
    aptos_transaction_hash TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'DISPUTED')),
    final_price REAL,
    config TEXT, -- JSON string
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, seed) -- Prevent seed reuse
);

CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    round_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    size REAL NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    entry_candle_index INTEGER NOT NULL,
    exit_candle_index INTEGER,
    pnl REAL DEFAULT 0.0,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (round_id) REFERENCES rounds (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_rounds_user_started ON rounds(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(status);
CREATE INDEX IF NOT EXISTS idx_trades_round ON trades(round_id);
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);