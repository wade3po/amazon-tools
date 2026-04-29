import { Router } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import Account from '../models/Account.js';

const router = Router();

// 登录限流
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: '登录尝试过于频繁，请15分钟后再试' },
});

function signToken(accountId) {
  return jwt.sign({ id: accountId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/login — 账号密码登录
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '请输入账号和密码' });
    }

    const account = await Account.findOne({ username }).select('+password');
    if (!account) {
      return res.status(401).json({ message: '账号或密码错误' });
    }

    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: '账号或密码错误' });
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
