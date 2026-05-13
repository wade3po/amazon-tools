import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import PurchaseRecord from '../models/PurchaseRecord.js';
import Product from '../models/Product.js';

const router = Router();

// GET /api/purchase?shopId=xxx — 获取该店铺所有采购记录（自动同步产品表）
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { shopId } = req.query;
    if (!shopId) return res.status(400).json({ message: 'shopId 必填' });

    // 获取该店铺所有产品
    const products = await Product.find({ shopId })
      .select('_id shopId groupId sku name fnsku weight purchaseLink')
      .lean();

    // 获取已有的采购记录
    const existingRecords = await PurchaseRecord.find({ shopId }).lean();
    const existingMap = new Map(existingRecords.map(r => [r.productId.toString(), r]));

    // 找出没有采购记录的产品，批量创建
    const missing = products.filter(p => !existingMap.has(p._id.toString()));
    if (missing.length > 0) {
      const newRecords = missing.map(p => ({
        productId: p._id,
        shopId: p.shopId,
      }));
      await PurchaseRecord.insertMany(newRecords, { ordered: false }).catch(() => {});
    }

    // 重新查询所有记录并关联产品信息
    const records = await PurchaseRecord.find({ shopId }).lean();
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    const result = records.map(r => {
      const product = productMap.get(r.productId.toString());
      if (!product) return null;
      return {
        ...r,
        groupId: product.groupId,
        sku: product.sku,
        name: product.name,
        fnsku: product.fnsku,
        // 优先用采购记录自己的值，没有则 fallback 到产品表
        weight: r.weight != null ? r.weight : product.weight,
        purchaseLink: r.purchaseLink || product.purchaseLink || '',
      };
    }).filter(Boolean);

    res.json({ records: result });
  } catch (err) { next(err); }
});

// PUT /api/purchase/:id — 更新采购记录
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const record = await PurchaseRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: '记录不存在' });

    const { purchaseLink, weight, shippingQty, totalWeight, unit, size, shape, color, plannedQty, stockQty, actualQty, note } = req.body;

    if (purchaseLink !== undefined) record.purchaseLink = purchaseLink;
    if (weight !== undefined) record.weight = weight;
    if (shippingQty !== undefined) record.shippingQty = shippingQty;
    if (totalWeight !== undefined) record.totalWeight = totalWeight;
    if (unit !== undefined) record.unit = unit;
    if (size !== undefined) record.size = size;
    if (shape !== undefined) record.shape = shape;
    if (color !== undefined) record.color = color;
    if (plannedQty !== undefined) record.plannedQty = plannedQty;
    if (stockQty !== undefined) record.stockQty = stockQty;
    if (actualQty !== undefined) record.actualQty = actualQty;
    if (note !== undefined) record.note = note;

    await record.save();
    res.json({ record });
  } catch (err) { next(err); }
});

// PUT /api/purchase/batch — 批量更新采购记录（行内编辑保存）
router.put('/batch/update', authenticate, async (req, res, next) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: '无更新数据' });
    }

    let updated = 0;
    for (const item of updates) {
      if (!item._id) continue;
      const { _id, ...fields } = item;
      await PurchaseRecord.findByIdAndUpdate(_id, { $set: fields });
      updated++;
    }

    res.json({ success: true, updated });
  } catch (err) { next(err); }
});

// POST /api/purchase/batch/import — 批量导入采购数据（按SKU匹配更新）
router.post('/batch/import', authenticate, async (req, res, next) => {
  try {
    const { shopId, items } = req.body;
    if (!shopId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: '参数不完整' });
    }

    // 获取该店铺所有产品（用于SKU匹配）
    const products = await Product.find({ shopId }).select('_id sku groupId').lean();
    const skuMap = new Map(products.map(p => [p.sku, p]));

    // 确保所有产品都有采购记录
    const existingRecords = await PurchaseRecord.find({ shopId }).lean();
    const existingProductIds = new Set(existingRecords.map(r => r.productId.toString()));
    const missing = products.filter(p => !existingProductIds.has(p._id.toString()));
    if (missing.length > 0) {
      await PurchaseRecord.insertMany(
        missing.map(p => ({ productId: p._id, shopId })),
        { ordered: false }
      ).catch(() => {});
    }

    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      if (!item.sku) { skipped++; continue; }
      const product = skuMap.get(item.sku);
      if (!product) { skipped++; continue; }

      const updateFields = {};
      if (item.purchaseLink !== undefined) updateFields.purchaseLink = item.purchaseLink;
      if (item.weight !== undefined) updateFields.weight = item.weight;
      if (item.shippingQty !== undefined) updateFields.shippingQty = item.shippingQty;
      if (item.totalWeight !== undefined) updateFields.totalWeight = item.totalWeight;
      if (item.unit !== undefined) updateFields.unit = item.unit;
      if (item.size !== undefined) updateFields.size = item.size;
      if (item.shape !== undefined) updateFields.shape = item.shape;
      if (item.color !== undefined) updateFields.color = item.color;
      if (item.plannedQty !== undefined) updateFields.plannedQty = item.plannedQty;
      if (item.stockQty !== undefined) updateFields.stockQty = item.stockQty;
      if (item.actualQty !== undefined) updateFields.actualQty = item.actualQty;

      if (Object.keys(updateFields).length > 0) {
        await PurchaseRecord.updateOne(
          { shopId, productId: product._id },
          { $set: updateFields }
        );
        updated++;
      }
    }

    res.json({ success: true, updated, skipped });
  } catch (err) { next(err); }
});

export default router;
