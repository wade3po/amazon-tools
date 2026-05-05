import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Product from '../models/Product.js';

const router = Router();

// GET /api/product?shopId=xxx&keyword=xxx&page=1&pageSize=50
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { shopId, keyword, groupId, page = 1, pageSize = 50 } = req.query;
    if (!shopId) return res.status(400).json({ message: 'shopId 必填' });

    const filter = { shopId };
    if (keyword) {
      const re = new RegExp(keyword, 'i');
      filter.$or = [
        { sku: re },
        { name: re },
        { fnsku: re },
        { groupId: re },
      ];
    }
    if (groupId) filter.groupId = groupId;

    const p = Math.max(1, Number(page));
    const size = Math.min(5000, Math.max(1, Number(pageSize)));

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ groupId: 1, sku: 1 }).skip((p - 1) * size).limit(size),
      Product.countDocuments(filter),
    ]);

    console.log(`[product] shopId=${shopId} total=${total} returned=${products.length}`);
    res.json({ products, total, page: p, pageSize: size });
  } catch (err) { next(err); }
});

// POST /api/product — 新增单个
router.post('/', authenticate, async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ product });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: '该店铺下 SKU 已存在' });
    }
    next(err);
  }
});

// POST /api/product/batch — 批量导入
router.post('/batch', authenticate, async (req, res, next) => {
  try {
    const { shopId, products } = req.body;
    console.log(`[batch] shopId=${shopId} count=${products?.length}`);
    if (!shopId || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: '参数不完整' });
    }

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const item of products) {
      if (!item.sku) { failed++; errors.push({ sku: '', error: 'SKU 为空' }); continue; }
      try {
        const filter = { shopId, sku: item.sku };
        const update = { $set: { ...item, shopId } };

        // upsert: 新增时设置 createdAt，更新时不覆盖
        const existing = await Product.findOne(filter).select('_id').lean();
        if (existing) {
          await Product.updateOne(filter, update);
          updated++;
        } else {
          await Product.create({ ...item, shopId });
          inserted++;
        }
      } catch (e) {
        failed++;
        errors.push({ sku: item.sku, error: e.message });
      }
    }

    res.json({ success: true, inserted, updated, failed });
  } catch (err) { next(err); }
});

// PUT /api/product/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: '未找到' });
    res.json({ product });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: '该店铺下 SKU 已存在' });
    }
    next(err);
  }
});

// DELETE /api/product/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: '未找到' });
    res.json({ message: '已删除' });
  } catch (err) { next(err); }
});

// DELETE /api/product/batch/delete — 批量删除
router.post('/batch/delete', authenticate, async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择要删除的产品' });
    }
    const result = await Product.deleteMany({ _id: { $in: ids } });
    res.json({ deleted: result.deletedCount });
  } catch (err) { next(err); }
});

export default router;
