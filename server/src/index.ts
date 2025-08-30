import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { db } from '../database/connection';
import gameRoutes from '../routes/game';

// Load env vars if dotenv is installed; otherwise continue with defaults
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
} catch {}

const app = express();
const server = createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// API Routes
app.use('/api/game', gameRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Read-only users listing (admin/read use)
app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    const users = await db.getAllUsers();
    res.json({ success: true, users });
  } catch (error: any) {
    console.error('❌ Failed to get users:', error);
    res.status(500).json({ success: false, error: 'Failed to get users', details: error.message });
  }
});

// Admin: clear data (dangerous). Body: { keepTestUser?: boolean }
app.post('/api/admin/clear', async (req: Request, res: Response) => {
  try {
    const keepTestUser = req.body?.keepTestUser !== false; // default true
    if (keepTestUser) {
      // Ensure test user exists before clearing others
      const testWallet = '0x1234567890abcdef';
      await db.ensureUser(testWallet, 'Test Player');
      await db.clearAllButTestUser(testWallet);
    } else {
      await db.clearAllData();
    }
    res.json({ success: true, keptTestUser: keepTestUser });
  } catch (error: any) {
    console.error('❌ Failed to clear data:', error);
    res.status(500).json({ success: false, error: 'Failed to clear data', details: error.message });
  }
});

// Admin: update user balance
app.post('/api/admin/user/balance', async (req: Request, res: Response) => {
  try {
    const { userId, balance } = req.body || {}
    if (!userId || typeof balance !== 'number') {
      return res.status(400).json({ success: false, error: 'userId and numeric balance required' })
    }
    await db.updateUserBalance(userId, balance)
    const user = await db.getUserById(userId)
    res.json({ success: true, user })
  } catch (error: any) {
    console.error('❌ Failed to update user balance:', error)
    res.status(500).json({ success: false, error: 'Failed to update user balance', details: error.message })
  }
})


// Initialize database and start server
async function startServer() {
  try {
    console.log('🔧 Initializing database...');
    await db.initialize();

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Trading game server running on port ${PORT}`);
      console.log(`📊 Health endpoint ready at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
