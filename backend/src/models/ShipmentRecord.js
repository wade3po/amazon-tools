import mongoose from 'mongoose';

const shipmentRecordSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },

  purchaseQty: { type: Number, default: null },    // 采购件数
  boxQty: { type: Number, default: null },         // 单箱数量
}, { timestamps: true });

shipmentRecordSchema.index({ productId: 1, shopId: 1 }, { unique: true });

export default mongoose.model('ShipmentRecord', shipmentRecordSchema);
