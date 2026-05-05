import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';

/**
 * FormDialog
 * Props:
 *   open, onClose, title, children
 *   maxWidth  — Tailwind max-w class, default 'max-w-md'
 *   tall      — if true, limits height to 90vh with scrollable body
 */
export default function FormDialog({ open, onClose, title, children, maxWidth = 'max-w-md', tall = false }) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[100]">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95 translate-y-2" enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <DialogPanel
              className={`flex w-full ${maxWidth} flex-col rounded-2xl bg-white shadow-2xl ${tall ? 'max-h-[90vh]' : ''}`}
            >
              {/* 固定标题栏 */}
              <div className="flex-shrink-0 border-b border-apple-gray-100 px-6 py-4">
                <DialogTitle className="text-[15px] font-semibold text-apple-gray-900">
                  {title}
                </DialogTitle>
              </div>

              {/* 内容区：tall 模式下可滚动 */}
              <div className={`flex-1 px-6 py-5 ${tall ? 'overflow-y-auto' : ''}`}>
                {children}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
