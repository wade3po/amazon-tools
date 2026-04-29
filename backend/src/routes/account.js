import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Account from '../models/Account.js';

const router = Router();

// GET /api/account/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

// GET /api/account?keyword=xxx&page=1&pageSize=10
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { keyword = '', page = 1, pageSize = 10 } = req.query;
    const p = Math.max(1, parseInt(page));
    const size = Math.min(100, Math.max(1, parseInt(pageSize) || 10));

    const filter = {};
    if (keyword.trim()) {
      filter.username = { $regex: keyword.trim(), $options: 'i' };
    }

    const [accounts, total] = await Promise.all([
      Account.find(filter).sort({ createdAt: 1 }).skip((p - 1) * size).limit(size),
      Account.countDocuments(filter),
    ]);

    res.json({
      accounts: accounts.map((a) => a.toSafeObject()),
      total,
      page: p,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    });
  } catch (err) { next(err); }
});

// POST /api/account
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }
    const account = await Account.create({ username, password });
    res.status(201).json({ account: account.toSafeObject() });
  } catch (err) { next(err); }
});

// PUT /api/account/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const account = await Account.findById(req.params.id).select('+password');
    if (!account) return res.status(404).json({ message: 'Not found' });

    if (username !== undefined && username.trim()) account.username = username.trim();
    if (password !== undefined && password.trim()) account.password = password.trim();
    await account.save();

    res.json({ account: account.toSafeObject() });
  } catch (err) { next(err); }
});

// DELETE /api/account/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete current account' });
    }
    const account = await Account.findByIdAndDelete(req.params.id);
    if (!account) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// PUT /api/account/me/password
router.put('/me/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both passwords required' });
    }
    const account = await Account.findById(req.user._id).select('+password');
    const isMatch = await account.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: 'Wrong current password' });

    account.password = newPassword;
    await account.save();
    res.json({ message: 'Password changed' });
  } catch (err) { next(err); }
});

export default router;
