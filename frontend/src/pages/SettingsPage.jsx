import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

// 配置项定义：后续新增配置只需在这里加一行
const SETTING_ITEMS = [
  { key: 'exchangeRate', label: '美元兑人民币汇率', type: 'number', step: '0.01', default: 7.2 },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/setting').then((res) => {
      const map = {};
      for (const item of SETTING_ITEMS) {
        map[item.key] = res.data.settings?.[item.key]?.value ?? item.default;
      }
      setSettings(map);
    }).catch(() => {
      // 用默认值
      const map = {};
      for (const item of SETTING_ITEMS) {
        map[item.key] = item.default;
      }
      setSettings(map);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of SETTING_ITEMS) {
        const value = item.type === 'number' ? Number(settings[item.key]) : settings[item.key];
        await api.put(`/setting/${item.key}`, {
          value,
          label: item.label,
        });
      }
      toast.success('配置已保存');
    } catch (err) {
      toast.error(err.msg || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-apple-gray-200 border-t-apple-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-apple-gray-900">系统配置</h1>
        <p className="mt-0.5 text-sm text-apple-gray-500">管理全局参数设置</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-apple-gray-200">
        <div className="space-y-4">
          {SETTING_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center gap-4">
              <label className="w-48 text-sm font-medium text-apple-gray-700">{item.label}</label>
              <input
                type={item.type}
                step={item.step}
                value={settings[item.key] ?? ''}
                onChange={(e) => setSettings({ ...settings, [item.key]: e.target.value })}
                className="w-48 rounded-lg border border-apple-gray-200 bg-apple-gray-50 px-3 py-2 text-sm text-apple-gray-900 focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20"
              />
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-apple-blue px-5 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
}
