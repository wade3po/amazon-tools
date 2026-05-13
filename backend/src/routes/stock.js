import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import StockRecord from '../models/StockRecord.js';
import Product from '../models/Product.js';

const router = Router();

// GET /api/stock?shopId=xxx — 获取该店铺所有库存记录（自动同步产品表）
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { shopId } = req.query;
    if (!shopId) return res.status(400).json({ message: 'shopId 必填' });

    const products = await Product.find({ shopId })
      .select('_id shopId groupId sku name')
      .lean();

    const existingRecords = await StockRecord.find({ shopId }).lean();
    const existingMap = new Map(existingRecords.map(r => [r.productId.toString(), r]));

    const missing = products.filter(p => !existingMap.has(p._id.toString()));
    if (missing.length > 0) {
      await StockRecord.insertMany(
        missing.map(p => ({ productId: p._id, shopId: p.shopId })),
        { ordered: false }
      ).catch(() => {});
    }

    const records = await StockRecord.find({ shopId }).lean();
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    const result = records.map(r => {
      const product = productMap.get(r.productId.toString());
      if (!product) return null;
      return {
        ...r,
        groupId: product.groupId,
        sku: product.sku,
        name: product.name,
      };
    }).filter(Boolean);

    res.json({ records: result });
  } catch (err) { next(err); }
});

// PUT /api/stock/:id — 更新库存记录
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const record = await StockRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: '记录不存在' });

    const { unit, stockQty } = req.body;
    if (unit !== undefined) record.unit = unit;
    if (stockQty !== undefined) record.stockQty = stockQty;

    await record.save();
    res.json({ record });
  } catch (err) { next(err); }
});

export default router;
