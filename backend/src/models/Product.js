import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, '请选择店铺'],
    index: true,
  },
  // 产品组号（合并单元格的序号，如 JAO-1）
  groupId: { type: String, trim: true, default: '' },
  sku: { type: String, required: [true, '请输入 SKU 编码'], trim: true },
  name: { type: String, required: [true, '请输入品名'], trim: true },
  fnsku: { type: String, trim: true, default: '' },

  // ── 价格与成本 ──
  price: { type: Number, default: null },              // 销售价
  cost: { type: Number, default: null },               // (采购)成本
  costRate: { type: Number, default: null },           // 成本占比%
  shippingCost: { type: Number, default: null },       // (头程)运费
  shippingRate: { type: Number, default: null },       // 运费占比%
  fbaFee: { type: Number, default: null },             // FBA费用
  fbaRate: { type: Number, default: null },            // FBA占比%
  amazonLogisticsFee: { type: Number, default: null }, // 其中亚马逊物流费
  commissionRate: { type: Number, default: null },     // 销售佣金占比%
  vatRate: { type: Number, default: null },            // 增值税税率%

  // ── 利润 ──
  grossProfit: { type: Number, default: null },        // 毛利（未除广告）
  grossProfitRate: { type: Number, default: null },    // 毛利占比%
  roi: { type: Number, default: null },                // 投入产出比
  suggestedPrice: { type: Number, default: null },     // 20%毛利率售价
  netProfit: { type: Number, default: null },          // 净利润

  // ── 物流与采购 ──
  weight: { type: Number, default: null },             // 重量/g
  purchaseQty: { type: Number, default: null },        // 采购件数
  totalWeight: { type: Number, default: null },        // 总重/kg
  estimatedInvestment: { type: Number, default: null },// 预计投入
  estimatedRevenue: { type: Number, default: null },   // 预计收益

  // ── 标签 ──
  labelName: { type: String, trim: true, default: '' },     // 标签名（PDF文件名）
  labelLink: { type: String, trim: true, default: '' },     // 标签（打开链接）
  labelPageName: { type: String, trim: true, default: '' }, // 中文标签

  // ── 包装 ──
  packageSize: { type: String, trim: true, default: '' },   // 包装后尺寸
  packageType: { type: String, trim: true, default: '' },   // 包装袋类型

  // ── 采购链接 ──
  purchaseLink: { type: String, trim: true, default: '' },  // 1688采购链接

  // ── 备注 ──
  note: { type: String, trim: true, default: '' },
}, {
  timestamps: true,
});

// 复合唯一索引：同一店铺下 SKU 唯一
productSchema.index({ shopId: 1, sku: 1 }, { unique: true });
productSchema.index({ shopId: 1, groupId: 1 });

export default mongoose.model('Product', productSchema);
