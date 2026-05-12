import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Shop from '../models/Shop.js';

const router = Router();

// GET /api/shop?keyword=xxx&page=1&pageSize=10
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { keyword = '', page = 1, pageSize = 10 } = req.query;
    const p = Math.max(1, parseInt(page));
    const size = Math.min(100, Math.max(1, parseInt(pageSize) || 10));

    const filter = {};
    if (keyword.trim()) {
      const regex = { $regex: keyword.trim(), $options: 'i' };
      filter.$or = [
        { name: regex },
        { marketplace: regex },
        { note: regex },
      ];
    }

    const [shops, total] = await Promise.all([
      Shop.find(filter).sort({ createdAt: -1 }).skip((p - 1) * size).limit(size),
      Shop.countDocuments(filter),
    ]);

    res.json({
      shops,
      total,
      page: p,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    });
  } catch (err) { next(err); }
});

// POST /api/shop
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, marketplace, note, labelFolder } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name required' });
    const shop = await Shop.create({ name: name.trim(), marketplace: marketplace?.trim(), note: note?.trim(), labelFolder: labelFolder?.trim() });
    res.status(201).json({ shop });
  } catch (err) { next(err); }
});

// PUT /api/shop/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { name, marketplace, note, labelFolder } = req.body;
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Not found' });

    if (name !== undefined) shop.name = name.trim();
    if (marketplace !== undefined) shop.marketplace = marketplace.trim();
    if (note !== undefined) shop.note = note.trim();
    if (labelFolder !== undefined) shop.labelFolder = labelFolder.trim();
    await shop.save();

    res.json({ shop });
  } catch (err) { next(err); }
});

// DELETE /api/shop/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
