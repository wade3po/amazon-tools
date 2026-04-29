import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '请输入店铺名称'],
    trim: true,
    maxlength: [50, '店铺名称最多50个字符'],
  },
  marketplace: {
    type: String,
    trim: true,
    default: '',
  },
  note: {
    type: String,
    trim: true,
    default: '',
    maxlength: [200, '备注最多200个字符'],
  },
}, {
  timestamps: true,
});

export default mongoose.model('Shop', shopSchema);
