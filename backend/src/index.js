import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/account.js';
import shopRoutes from './routes/shop.js';
import productRoutes from './routes/product.js';
import settingRoutes from './routes/setting.js';
import adRoutes from './routes/ad.js';
import { errorHandler } from './middleware/error.js';
import { seedDefaultAccount } from './seed.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: support web frontend + Electron desktop (origin is null for file://)
app.use(cors({
  origin: (origin, callback) => {
    // Electron desktop sends null origin, always allow
    if (!origin) return callback(null, true);

    const allowed = [
      'http://localhost:5173',
      'http://localhost:5178',
    ];

    // Add production frontend URL if configured
    if (process.env.FRONTEND_URL) {
      allowed.push(process.env.FRONTEND_URL);
    }

    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/product', productRoutes);
app.use('/api/setting', settingRoutes);
app.use('/api/ad', adRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Connect to MongoDB and start server
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 初始化默认管理员账号
    await seedDefaultAccount();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

start();
