"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** z-index над картой (FAB ниже) */
  z?: number;
};

export function BottomSheet({ open, onClose, title, children, z = 50 }: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-auto fixed inset-0" style={{ zIndex: z }}>
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className="safe-area-pb absolute inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.18)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" aria-hidden />
        </div>
        {title ? (
          <h2 className="px-5 pt-3 text-lg font-semibold leading-tight text-slate-900">{title}</h2>
        ) : null}
        <div className="max-h-[calc(88dvh-3rem)] overflow-y-auto overscroll-y-contain px-5 pb-6 pt-3">
          {children}
        </div>
      </div>
    </div>
  );
}
