import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from '../src/routes/auth.js';
import accountRoutes from '../src/routes/account.js';
import shopRoutes from '../src/routes/shop.js';
import { errorHandler } from '../src/middleware/error.js';
import { seedDefaultAccount } from '../src/seed.js';

const app = express();

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5178',
    ];
    if (process.env.FRONTEND_URL) allowed.push(process.env.FRONTEND_URL);
    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Vercel serverless: allow all for now
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/shop', shopRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

// Connect to MongoDB once (reuse across invocations)
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  await seedDefaultAccount();
}

// Vercel serverless handler
export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}
