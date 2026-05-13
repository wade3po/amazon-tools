import mongoose from 'mongoose';

const purchaseRecordSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },

  // 采购相关字段
  purchaseLink: { type: String, trim: true, default: '' },   // 采购链接（可覆盖产品表）
  weight: { type: Number, default: null },                   // 重量/g（可覆盖产品表）
  shippingQty: { type: Number, default: null },              // 发货件数
  totalWeight: { type: Number, default: null },              // 总重
  unit: { type: String, trim: true, default: '' },           // 单位
  size: { type: String, trim: true, default: '' },           // 尺寸
  shape: { type: String, trim: true, default: '' },          // 形状
  color: { type: String, trim: true, default: '' },          // 颜色
  plannedQty: { type: Number, default: null },               // 计划采购数量
  stockQty: { type: Number, default: null },                 // 产品库存数量
  actualQty: { type: Number, default: null },                // 实际应采购数量
  note: { type: String, trim: true, default: '' },           // 备注
}, { timestamps: true });

// 一个产品只有一条采购记录
purchaseRecordSchema.index({ productId: 1, shopId: 1 }, { unique: true });

export default mongoose.model('PurchaseRecord', purchaseRecordSchema);
