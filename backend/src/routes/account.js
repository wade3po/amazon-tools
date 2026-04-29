import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Account from '../models/Account.js';

const router = Router();

// GET /api/account/me — 获取当前账号信息
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

// GET /api/account — 获取所有账号列表
router.get('/', authenticate, async (req, res, next) => {
  try {
    const accounts = await Account.find().sort({ createdAt: 1 });
    res.json({ accounts: accounts.map((a) => a.toSafeObject()) });
  } catch (err) {
    next(err);
  }
});

// POST /api/account — 新增账号
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '请填写账号和密码' });
    }

    const account = await Account.create({ username, password });
    res.status(201).json({ account: account.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

// PUT /api/account/:id — 修改账号（用户名 / 密码）
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const account = await Account.findById(req.params.id).select('+password');

    if (!account) {
      return res.status(404).json({ message: '账号不存在' });
    }

    if (username !== undefined && username.trim()) {
      account.username = username.trim();
    }
    if (password !== undefined && password.trim()) {
      account.password = password.trim();
    }

    await account.save();
    res.json({ account: account.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/account/:id — 删除账号
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    // 不能删除自己
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: '不能删除当前登录的账号' });
    }

    const account = await Account.findByIdAndDelete(req.params.id);
    if (!account) {
      return res.status(404).json({ message: '账号不存在' });
    }

    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/account/me/password — 修改自己的密码
router.put('/me/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '请填写当前密码和新密码' });
    }

    const account = await Account.findById(req.user._id).select('+password');
    const isMatch = await account.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: '当前密码错误' });
    }

    account.password = newPassword;
    await account.save();

    res.json({ message: '密码修改成功' });
  } catch (err) {
    next(err);
  }
});

export default router;
