import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import AdRecord from '../models/AdRecord.js';
import AdLog from '../models/AdLog.js';
import Product from '../models/Product.js';

const router = Router();

// GET /api/ad?shopId=xxx — 获取该店铺所有广告记录（自动同步产品表）
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { shopId } = req.query;
    if (!shopId) return res.status(400).json({ message: 'shopId 必填' });

    // 获取该店铺所有产品
    const products = await Product.find({ shopId }).select('_id shopId groupId sku name fnsku').lean();

    // 获取已有的广告记录
    const existingRecords = await AdRecord.find({ shopId }).lean();
    const existingMap = new Map(existingRecords.map(r => [r.productId.toString(), r]));

    // 找出没有广告记录的产品，批量创建
    const missing = products.filter(p => !existingMap.has(p._id.toString()));
    if (missing.length > 0) {
      const newRecords = missing.map(p => ({
        productId: p._id,
        shopId: p.shopId,
        hasAd: false,
        adBid: null,
        adAcos: null,
        isOutOfStock: false,
      }));
      await AdRecord.insertMany(newRecords, { ordered: false }).catch(() => {});
    }

    // 重新查询所有记录并关联产品信息
    const records = await AdRecord.find({ shopId }).lean();
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
      };
    }).filter(Boolean);

    res.json({ records: result });
  } catch (err) { next(err); }
});

// PUT /api/ad/:id — 更新广告记录（自动生成操作日志）
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const oldRecord = await AdRecord.findById(req.params.id);
    if (!oldRecord) return res.status(404).json({ message: '记录不存在' });

    const { hasAd, adStartDate, adBid, adAcos, isOutOfStock, outOfStockStart, outOfStockEnd, adNote } = req.body;
    const logs = [];

    // 如果广告操作内容变了，记录变动
    if (adNote !== undefined && adNote.trim() && adNote.trim() !== (oldRecord.adNote || '').trim()) {
      logs.push({ action: 'custom', description: '广告操作：' + adNote.trim() });
    }

    // 检测广告竞价变化
    if (adBid !== undefined && adBid !== null) {
      const oldBid = oldRecord.adBid != null ? Number(oldRecord.adBid) : null;
      const newBid = Number(adBid);
      if (oldBid !== null && oldBid !== newBid && !isNaN(newBid)) {
        const diff = Number((newBid - oldBid).toFixed(2));
        if (diff > 0) {
          logs.push({ action: 'bid_increase', description: `广告竞价增加${diff}美元，目前竞价${newBid}美元` });
        } else {
          logs.push({ action: 'bid_decrease', description: `广告竞价降低${Math.abs(diff)}美元，目前竞价${newBid}美元` });
        }
      } else if (oldBid === null && !isNaN(newBid)) {
        logs.push({ action: 'bid_set', description: `设置广告竞价${newBid}美元` });
      }
    }

    // 检测 ACOS 变化
    if (adAcos !== undefined && adAcos !== null) {
      const oldAcos = oldRecord.adAcos != null ? Number(oldRecord.adAcos) : null;
      const newAcos = Number(adAcos);
      if (oldAcos !== null && oldAcos !== newAcos && !isNaN(newAcos)) {
        logs.push({ action: 'acos_change', description: `ACOS 从${oldAcos}%变为${newAcos}%` });
      }
    }

    // 检测广告开关变化
    if (hasAd !== undefined && hasAd !== oldRecord.hasAd) {
      if (hasAd) {
        logs.push({ action: 'resume_ad', description: '开启广告' });
      } else {
        logs.push({ action: 'pause_ad', description: '暂停广告' });
      }
    }

    // 检测断货状态变化
    if (isOutOfStock !== undefined && isOutOfStock !== oldRecord.isOutOfStock) {
      if (isOutOfStock) {
        logs.push({ action: 'out_of_stock', description: '产品断货' });
      } else {
        logs.push({ action: 'back_in_stock', description: '产品恢复有货' });
      }
    }

    // 更新记录
    if (hasAd !== undefined) oldRecord.hasAd = hasAd;
    if (adStartDate !== undefined) oldRecord.adStartDate = adStartDate || null;
    if (adBid !== undefined) oldRecord.adBid = adBid;
    if (adAcos !== undefined) oldRecord.adAcos = adAcos;
    if (adNote !== undefined) oldRecord.adNote = adNote.trim();
    if (isOutOfStock !== undefined) oldRecord.isOutOfStock = isOutOfStock;
    if (outOfStockStart !== undefined) oldRecord.outOfStockStart = outOfStockStart || null;
    if (outOfStockEnd !== undefined) oldRecord.outOfStockEnd = outOfStockEnd || null;
    await oldRecord.save();

    // 写入操作日志（合并为一条记录）
    if (logs.length > 0) {
      const combinedDesc = logs.map(l => l.description).join('；');
      const primaryAction = logs[0].action;
      await AdLog.create({
        productId: oldRecord.productId,
        shopId: oldRecord.shopId,
        action: primaryAction,
        description: combinedDesc,
      });
    }

    res.json({ record: oldRecord });
  } catch (err) { next(err); }
});

// POST /api/ad/:id/log — 手动添加操作日志（否词等自定义操作）
router.post('/:id/log', authenticate, async (req, res, next) => {
  try {
    const record = await AdRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: '记录不存在' });

    const { action, description } = req.body;
    if (!description) return res.status(400).json({ message: '描述不能为空' });

    const log = await AdLog.create({
      productId: record.productId,
      shopId: record.shopId,
      action: action || 'custom',
      description,
    });

    res.json({ log });
  } catch (err) { next(err); }
});

// GET /api/ad/:id/logs — 获取某产品的操作日志
router.get('/:id/logs', authenticate, async (req, res, next) => {
  try {
    const record = await AdRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: '记录不存在' });

    const logs = await AdLog.find({ productId: record.productId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ logs });
  } catch (err) { next(err); }
});

export default router;
