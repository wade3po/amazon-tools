import mongoose from 'mongoose';

const adLogSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', index: true },
  action: { type: String, required: true },
  description: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('AdLog', adLogSchema);
