import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from '../src/routes/auth.js';
import accountRoutes from '../src/routes/account.js';
import shopRoutes from '../src/routes/shop.js';
import productRoutes from '../src/routes/product.js';
import settingRoutes from '../src/routes/setting.js';
import { errorHandler } from '../src/middleware/error.js';
import { seedDefaultAccount } from '../src/seed.js';

const app = express();

// CORS: allow all origins in serverless (stateless)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/product', productRoutes);
app.use('/api/setting', settingRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

// MongoDB connection reuse across warm invocations
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    });
    isConnected = true;
    console.log('MongoDB connected');
    await seedDefaultAccount();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

// Vercel serverless handler
export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
  return app(req, res);
}
