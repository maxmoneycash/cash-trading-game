import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { db } from '../database/connection';
import gameRoutes from '../routes/game';

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

// API Routes
app.use('/api/game', gameRoutes);

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

// Database test endpoints for proof of concept
app.get('/api/test/users', async (req: Request, res: Response) => {
    try {
        const users = await db.getAllUsers();
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get users' });
    }
});

app.get('/api/test/rounds', async (req: Request, res: Response) => {
    try {
        const rounds = await db.getAllRounds();
        res.json({ rounds });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get rounds' });
    }
});

app.post('/api/test/round', async (req: Request, res: Response) => {
    try {
        // Get the test user
        const testUser = await db.getUserByWallet('0x1234567890abcdef');
        if (!testUser) {
            return res.status(404).json({ error: 'Test user not found' });
        }
        
        // Create a test round with a simple seed
        const testSeed = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
        const round = await db.createRound(testUser.id, testSeed);
        
        res.json({ 
            message: 'Test round created',
            round,
            user: testUser
        });
    } catch (error) {
        console.error('Failed to create test round:', error);
        res.status(500).json({ error: 'Failed to create test round' });
    }
});

// Initialize database and start server
async function startServer() {
    try {
        console.log('🔧 Initializing database...');
        await db.initialize();
        
        const PORT = process.env.PORT || 3001;
        server.listen(PORT, () => {
            console.log(`🚀 Trading game server running on port ${PORT}`);
            console.log(`📊 Database ready - visit http://localhost:${PORT}/api/test/users to see test data`);
            
            // Auto-start first round
            setTimeout(() => {
                gameState.isRoundActive = true;
                gameState.roundStartTime = Date.now();
                console.log('📈 Auto-started first round');
            }, 2000);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();