import mongoose from 'mongoose';

const priceLogSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', index: true },
  field: { type: String, default: 'price' },
  oldValue: { type: Number },
  newValue: { type: Number },
  change: { type: Number },
  note: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('PriceLog', priceLogSchema);
