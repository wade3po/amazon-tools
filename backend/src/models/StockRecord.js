import mongoose from 'mongoose';

const stockRecordSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },

  unit: { type: String, trim: true, default: '' },       // 单位
  stockQty: { type: Number, default: null },             // 库存数量
}, { timestamps: true });

stockRecordSchema.index({ productId: 1, shopId: 1 }, { unique: true });

export default mongoose.model('StockRecord', stockRecordSchema);
