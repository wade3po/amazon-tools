import mongoose from 'mongoose';

const adRecordSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  hasAd: { type: Boolean, default: false },
  adStartDate: { type: Date, default: null },
  adBid: { type: Number, default: null },
  adAcos: { type: Number, default: null },
  adNote: { type: String, default: '' },
  isOutOfStock: { type: Boolean, default: false },
  outOfStockStart: { type: Date, default: null },
  outOfStockEnd: { type: Date, default: null },
}, { timestamps: true });

// 一个产品只有一条广告记录
adRecordSchema.index({ productId: 1, shopId: 1 }, { unique: true });

export default mongoose.model('AdRecord', adRecordSchema);
