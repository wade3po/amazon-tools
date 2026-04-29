import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = '确定', cancelText = '取消', danger = false, loading = false }) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[100]">
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </TransitionChild>

        {/* Panel */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95 translate-y-2"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                {danger && (
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
                    <ExclamationTriangleIcon className="h-5 w-5 text-apple-red" />
                  </div>
                )}
                <div className="flex-1">
                  <DialogTitle className="text-[15px] font-semibold text-apple-gray-900">
                    {title}
                  </DialogTitle>
                  {message && (
                    <p className="mt-1.5 text-sm text-apple-gray-500">{message}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-lg border border-apple-gray-200 px-4 py-2 text-sm font-medium text-apple-gray-700 transition-colors hover:bg-apple-gray-50 disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50 ${
                    danger
                      ? 'bg-apple-red hover:bg-red-600'
                      : 'bg-apple-blue hover:bg-apple-blue-hover'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      处理中...
                    </span>
                  ) : confirmText}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
