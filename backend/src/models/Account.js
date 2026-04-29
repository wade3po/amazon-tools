import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const accountSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '请输入账号'],
    unique: true,
    trim: true,
    minlength: [2, '账号至少2个字符'],
    maxlength: [30, '账号最多30个字符'],
  },
  password: {
    type: String,
    required: [true, '请输入密码'],
    minlength: [4, '密码至少4个字符'],
    select: false,
  },
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin',
  },
}, {
  timestamps: true,
});

// 保存前加密密码
accountSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// 验证密码
accountSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 返回安全信息
accountSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    username: this.username,
    role: this.role,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export default mongoose.model('Account', accountSchema);
