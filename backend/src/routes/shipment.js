import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import ShipmentRecord from '../models/ShipmentRecord.js';
import Product from '../models/Product.js';

const router = Router();

// GET /api/shipment?shopId=xxx
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { shopId } = req.query;
    if (!shopId) return res.status(400).json({ message: 'shopId 必填' });

    const products = await Product.find({ shopId })
      .select('_id shopId groupId sku name fnsku weight')
      .lean();

    const existingRecords = await ShipmentRecord.find({ shopId }).lean();
    const existingMap = new Map(existingRecords.map(r => [r.productId.toString(), r]));

    const missing = products.filter(p => !existingMap.has(p._id.toString()));
    if (missing.length > 0) {
      await ShipmentRecord.insertMany(
        missing.map(p => ({ productId: p._id, shopId: p.shopId })),
        { ordered: false }
      ).catch(() => {});
    }

    const records = await ShipmentRecord.find({ shopId }).lean();
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
        weight: product.weight,
      };
    }).filter(Boolean);

    res.json({ records: result });
  } catch (err) { next(err); }
});

// PUT /api/shipment/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const record = await ShipmentRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: '记录不存在' });

    const { purchaseQty, boxQty } = req.body;
    if (purchaseQty !== undefined) record.purchaseQty = purchaseQty;
    if (boxQty !== undefined) record.boxQty = boxQty;

    await record.save();
    res.json({ record });
  } catch (err) { next(err); }
});

export default router;
