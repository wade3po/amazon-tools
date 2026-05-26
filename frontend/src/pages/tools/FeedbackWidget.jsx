import { useState } from 'react';
import { MessageCircle, X, Send, Loader2, CheckCircle2, Bug, Lightbulb, MessageSquare } from 'lucide-react';
import { useI18n } from '../../i18n';

const TYPES = [
  { key: 'bug', icon: Bug, colorClass: 'border-red-200 bg-red-50 text-red-700' },
  { key: 'feature', icon: Lightbulb, colorClass: 'border-amber-200 bg-amber-50 text-amber-700' },
  { key: 'other', icon: MessageSquare, colorClass: 'border-blue-200 bg-blue-50 text-blue-700' },
];

export default function FeedbackWidget() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'bug', name: '', contact: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSent(true);
        setForm({ type: 'bug', name: '', contact: '', message: '' });
        setTimeout(() => { setSent(false); setOpen(false); }, 3000);
      } else {
        setError(t('feedback.sendFailed'));
      }
    } catch {
      setError(t('feedback.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-200 transition-all hover:scale-110 hover:shadow-xl"
        title={t('feedback.title')}
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6 sm:items-center sm:justify-center">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-semibold text-gray-900 mb-1">{t('feedback.title')}</h3>
            <p className="text-xs text-gray-500 mb-4">{t('feedback.subtitle')}</p>

            {sent ? (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
                <p className="text-sm font-medium text-gray-900">{t('feedback.thankYou')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('feedback.willReply')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Type selector */}
                <div className="flex gap-2">
                  {TYPES.map(({ key, icon: Icon, colorClass }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, type: key })}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-medium transition-all ${
                        form.type === key ? colorClass : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t(`feedback.type_${key}`)}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t(`feedback.placeholder_${form.type}`)}
                  rows={4}
                  required
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />

                {/* Contact info */}
                <div className="space-y-2">
                  <p className="text-[11px] text-gray-400">{t('feedback.contactHint')}</p>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t('feedback.namePlaceholder')}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <input
                    type="text"
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    placeholder={t('feedback.contactPlaceholder')}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={sending || !form.message.trim()}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-md disabled:opacity-50"
                >
                  {sending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('feedback.sending')}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Send className="h-3.5 w-3.5" /> {t('feedback.send')}
                    </span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
