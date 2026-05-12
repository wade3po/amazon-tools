import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Product from '../models/Product.js';
import PriceLog from '../models/PriceLog.js';

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
    // 先读取旧数据，检测价格变化
    const oldProduct = await Product.findById(req.params.id);
    if (!oldProduct) return res.status(404).json({ message: '未找到' });

    const oldPrice = oldProduct.price;
    const newPrice = req.body.price !== undefined ? Number(req.body.price) : undefined;

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // 价格发生变化时记录日志
    if (newPrice !== undefined && oldPrice !== newPrice && !isNaN(newPrice)) {
      const change = Number((newPrice - (oldPrice || 0)).toFixed(2));
      const direction = change > 0 ? '加价' : '降价';
      const note = `产品${direction}${Math.abs(change)}，目前价格${newPrice}`;
      await PriceLog.create({
        productId: product._id,
        shopId: product.shopId,
        field: 'price',
        oldValue: oldPrice || 0,
        newValue: newPrice,
        change,
        note,
      });
    }

    res.json({ product });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: '该店铺下 SKU 已存在' });
    }
    next(err);
  }
});

// GET /api/product/:id/price-logs — 获取价格变动记录
router.get('/:id/price-logs', authenticate, async (req, res, next) => {
  try {
    const logs = await PriceLog.find({ productId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ logs });
  } catch (err) { next(err); }
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
