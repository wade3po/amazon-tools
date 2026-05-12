import { Router } from 'express';
import Setting from '../models/Setting.js';
import { authenticate as auth } from '../middleware/auth.js';

const router = Router();

// 获取所有配置
router.get('/', auth, async (req, res, next) => {
  try {
    const settings = await Setting.find();
    const map = {};
    for (const s of settings) {
      map[s.key] = { value: s.value, label: s.label };
    }
    res.json({ settings: map });
  } catch (err) { next(err); }
});

// 获取单个配置
router.get('/:key', auth, async (req, res, next) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key });
    if (!setting) return res.json({ key: req.params.key, value: null, label: '' });
    res.json({ key: setting.key, value: setting.value, label: setting.label });
  } catch (err) { next(err); }
});

// 更新或创建配置
router.put('/:key', auth, async (req, res, next) => {
  try {
    const { value, label } = req.body;
    const setting = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { value, label: label || '' },
      { upsert: true, new: true }
    );
    res.json({ key: setting.key, value: setting.value, label: setting.label });
  } catch (err) { next(err); }
});

export default router;
