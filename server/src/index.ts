import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

interface CandleData {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    isLiquidation?: boolean;
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Vite dev server
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Game state
let gameState = {
    currentPrice: 100,
    isRoundActive: false,
    roundStartTime: 0,
    candleHistory: [] as CandleData[]
};

// Generate realistic market price data
const generateCandleData = (currentPrice: number): CandleData => {
    const volatility = 0.02 + Math.random() * 0.08; // 2-10% moves
    const direction = Math.random() > 0.5 ? 1 : -1;
    const move = currentPrice * volatility * direction;
    
    const open = currentPrice;
    const close = Math.max(0.01, open + move);
    
    // Generate high/low with some wicks
    const wickMultiplier = 0.3 + Math.random() * 0.4;
    const high = Math.max(open, close) + Math.abs(move) * wickMultiplier;
    const low = Math.min(open, close) - Math.abs(move) * wickMultiplier;
    
    return {
        date: new Date(),
        open,
        high: Math.max(high, 0.01),
        low: Math.max(low, 0.01),
        close: Math.max(close, 0.01)
    };
};

// Generate candles every ~64ms (matching your frontend speed)
setInterval(() => {
    if (gameState.isRoundActive) {
        const newCandle = generateCandleData(gameState.currentPrice);
        gameState.currentPrice = newCandle.close;
        gameState.candleHistory.push(newCandle);
        
        // Keep only last 500 candles to prevent memory issues
        if (gameState.candleHistory.length > 500) {
            gameState.candleHistory.shift();
        }
        
        // Broadcast to all connected clients
        io.emit('new_candle', newCandle);
    }
}, 64); // ~15.6 FPS, close to your 63.75ms

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Send current game state to new client
    socket.emit('game_state', {
        ...gameState,
        recentCandles: gameState.candleHistory.slice(-100) // Last 100 candles
    });
    
    // Start a new round
    socket.on('start_round', () => {
        gameState.isRoundActive = true;
        gameState.roundStartTime = Date.now();
        gameState.candleHistory = [];
        
        io.emit('round_started', {
            startTime: gameState.roundStartTime
        });
        
        console.log('New round started');
    });
    
    // Stop round
    socket.on('stop_round', () => {
        gameState.isRoundActive = false;
        io.emit('round_stopped');
        console.log('Round stopped');
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', gameState });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Trading game server running on port ${PORT}`);
    
    // Auto-start first round
    setTimeout(() => {
        gameState.isRoundActive = true;
        gameState.roundStartTime = Date.now();
        console.log('📈 Auto-started first round');
    }, 2000);
});