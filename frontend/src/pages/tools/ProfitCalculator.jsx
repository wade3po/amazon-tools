import { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../i18n';

export default function ProfitCalculator() {
  const { t } = useI18n();

  const [price, setPrice] = useState(29.99);
  const [commissionRate, setCommissionRate] = useState(15);
  const [fbaFee, setFbaFee] = useState(5.50);
  const [shippingCost, setShippingCost] = useState(3.00);
  const [productCost, setProductCost] = useState(6.00);
  const [acos, setAcos] = useState(30);

  const calc = useMemo(() => {
    const revenue = price;
    const commission = revenue * (commissionRate / 100);
    const totalCost = commission + fbaFee + shippingCost + productCost;
    const profitBeforeAd = revenue - totalCost;
    const profitMarginBeforeAd = revenue > 0 ? (profitBeforeAd / revenue) * 100 : 0;

    // Ad spend based on ACoS (ACoS = Ad Spend / Ad Revenue * 100)
    // Assuming all revenue comes from ads for worst case
    const adSpend = revenue * (acos / 100);
    const profitAfterAd = profitBeforeAd - adSpend;
    const profitMarginAfterAd = revenue > 0 ? (profitAfterAd / revenue) * 100 : 0;

    // Breakeven ACoS = profit margin before ads
    const breakevenAcos = profitMarginBeforeAd;

    return {
      revenue,
      commission,
      totalCost,
      profitBeforeAd,
      profitMarginBeforeAd,
      adSpend,
      profitAfterAd,
      profitMarginAfterAd,
      breakevenAcos,
      isLosing: profitAfterAd < 0,
    };
  }, [price, commissionRate, fbaFee, shippingCost, productCost, acos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm">
          <DollarSign className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('profitCalc.title')}</h1>
          <p className="text-sm text-gray-500">{t('profitCalc.desc')}</p>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-800">{t('profitCalc.costInputs')}</h3>

          <SliderInput label={t('profitCalc.sellingPrice')} value={price} onChange={setPrice} min={1} max={200} step={0.01} prefix="$" />
          <SliderInput label={t('profitCalc.commissionRate')} value={commissionRate} onChange={setCommissionRate} min={5} max={45} step={1} suffix="%" />
          <SliderInput label={t('profitCalc.fbaFee')} value={fbaFee} onChange={setFbaFee} min={0} max={30} step={0.1} prefix="$" />
          <SliderInput label={t('profitCalc.shippingCost')} value={shippingCost} onChange={setShippingCost} min={0} max={20} step={0.1} prefix="$" />
          <SliderInput label={t('profitCalc.productCost')} value={productCost} onChange={setProductCost} min={0} max={100} step={0.1} prefix="$" />

          <div className="border-t border-gray-100 pt-4">
            <SliderInput
              label={t('profitCalc.acos')}
              value={acos}
              onChange={setAcos}
              min={0}
              max={100}
              step={1}
              suffix="%"
              highlight
              danger={acos > calc.breakevenAcos}
            />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Profit cards */}
          <div className="grid gap-3 grid-cols-2">
            <ResultCard
              label={t('profitCalc.profitBeforeAd')}
              value={`$${calc.profitBeforeAd.toFixed(2)}`}
              sub={`${calc.profitMarginBeforeAd.toFixed(1)}%`}
              positive={calc.profitBeforeAd >= 0}
            />
            <ResultCard
              label={t('profitCalc.profitAfterAd')}
              value={`$${calc.profitAfterAd.toFixed(2)}`}
              sub={`${calc.profitMarginAfterAd.toFixed(1)}%`}
              positive={calc.profitAfterAd >= 0}
              highlight
            />
            <ResultCard
              label={t('profitCalc.breakevenAcos')}
              value={`${calc.breakevenAcos.toFixed(1)}%`}
              sub={t('profitCalc.breakevenHint')}
              neutral
            />
            <ResultCard
              label={t('profitCalc.adSpend')}
              value={`$${calc.adSpend.toFixed(2)}`}
              sub={`ACoS ${acos}%`}
              neutral
            />
          </div>

          {/* Visual profit bar */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h4 className="text-xs font-semibold text-gray-700 mb-3">{t('profitCalc.breakdown')}</h4>
            <div className="space-y-2">
              <BarItem label={t('profitCalc.productCost')} value={calc.totalCost > 0 ? productCost : 0} total={price} color="bg-gray-400" amount={productCost} />
              <BarItem label={t('profitCalc.shippingCost')} value={shippingCost} total={price} color="bg-blue-400" amount={shippingCost} />
              <BarItem label={t('profitCalc.fbaFee')} value={fbaFee} total={price} color="bg-purple-400" amount={fbaFee} />
              <BarItem label={t('profitCalc.commission')} value={calc.commission} total={price} color="bg-orange-400" amount={calc.commission} />
              <BarItem label={t('profitCalc.adSpend')} value={calc.adSpend} total={price} color="bg-red-400" amount={calc.adSpend} />
              <BarItem label={t('profitCalc.netProfit')} value={Math.max(0, calc.profitAfterAd)} total={price} color={calc.isLosing ? 'bg-red-500' : 'bg-green-500'} amount={calc.profitAfterAd} />
            </div>
          </div>

          {/* Warning */}
          {calc.isLosing && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-red-800">{t('profitCalc.losingMoney')}</p>
                <p className="text-[11px] text-red-600 mt-0.5">
                  {t('profitCalc.reduceAcos', { target: calc.breakevenAcos.toFixed(0) })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SliderInput({ label, value, onChange, min, max, step, prefix, suffix, highlight, danger }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-600">{label}</span>
        <div className="flex items-center gap-0.5">
          {prefix && <span className="text-xs text-gray-400">{prefix}</span>}
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            className={`w-16 rounded border px-1.5 py-0.5 text-right text-xs font-mono font-semibold focus:outline-none focus:ring-1 ${
              danger ? 'border-red-300 text-red-600 focus:ring-red-200' :
              highlight ? 'border-blue-300 text-blue-700 focus:ring-blue-200' :
              'border-gray-200 text-gray-800 focus:ring-blue-200'
            }`}
          />
          {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${
          danger ? '[&::-webkit-slider-thumb]:bg-red-500 bg-red-100' :
          highlight ? '[&::-webkit-slider-thumb]:bg-blue-500 bg-blue-100' :
          '[&::-webkit-slider-thumb]:bg-gray-600 bg-gray-200'
        } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full`}
      />
    </div>
  );
}

function ResultCard({ label, value, sub, positive, neutral, highlight }) {
  const borderColor = neutral ? 'border-gray-200' : positive ? 'border-green-200' : 'border-red-200';
  const bgColor = neutral ? 'bg-gray-50' : positive ? 'bg-green-50' : 'bg-red-50';
  const valueColor = neutral ? 'text-gray-900' : positive ? 'text-green-600' : 'text-red-600';
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4 ${highlight ? 'ring-2 ring-offset-1 ' + (positive ? 'ring-green-200' : 'ring-red-200') : ''}`}>
      <p className="text-[11px] text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {!neutral && <Icon className={`h-4 w-4 ${valueColor}`} />}
        <span className={`text-xl font-bold ${valueColor}`}>{value}</span>
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function BarItem({ label, value, total, color, amount }) {
  const width = total > 0 ? Math.min(100, Math.max(0, (Math.abs(value) / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-gray-500 w-20 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-[11px] font-mono text-gray-600 w-14 text-right">${Math.abs(amount).toFixed(2)}</span>
    </div>
  );
}
