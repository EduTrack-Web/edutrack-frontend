import type { ReactNode } from 'react'

interface NoteConfirmDialogProps {
  confirmLabel: string
  description: string
  icon: ReactNode
  isBusy: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
}

export function NoteConfirmDialog({
  confirmLabel,
  description,
  icon,
  isBusy,
  onCancel,
  onConfirm,
  title,
}: NoteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-palette-900/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => { if (!isBusy) onCancel() }}>
      <section aria-describedby="note-confirm-description" aria-labelledby="note-confirm-title" aria-modal="true" className="content-card w-full max-w-md p-6" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200">{icon}</span>
        <h2 className="mt-4 text-center text-xl font-extrabold text-palette-900 dark:text-white" id="note-confirm-title">{title}</h2>
        <p className="mt-2 text-center text-sm leading-6 text-slate-600 dark:text-slate-300" id="note-confirm-description">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="secondary-button !min-h-11 !p-3" disabled={isBusy} onClick={onCancel} type="button">Hủy</button>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-[linear-gradient(135deg,#991b1b,#e11d48)] p-3 text-sm font-extrabold text-white shadow-lg shadow-red-950/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={isBusy} onClick={onConfirm} type="button">
            {icon}
            {isBusy ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
