import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Account from '../models/Account.js';

const router = Router();

function signToken(accountId) {
  return jwt.sign({ id: accountId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const account = await Account.findOne({ username }).select('+password');
    if (!account) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(account._id);

    res.json({
      token,
      user: account.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
