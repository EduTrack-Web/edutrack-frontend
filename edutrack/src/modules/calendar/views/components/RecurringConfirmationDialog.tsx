import { useEffect, useId, useRef } from 'react'
import type { RecurringConfirmation } from '../../viewmodels/useRecurringConfirmation'

export function RecurringConfirmationDialog({ confirmation }: { confirmation: RecurringConfirmation }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); confirmation.respond(false) }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-900/60 dark:border-white/10 dark:bg-[#021024] dark:text-white sm:p-6"
    >
      <h2 id={titleId} className="wrap-anywhere text-base font-bold">{confirmation.title}</h2>
      <p id={descriptionId} className="mt-2 text-sm text-slate-600 dark:text-slate-300">{confirmation.message}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button autoFocus type="button" className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10" onClick={() => confirmation.respond(false)}>
          Hủy
        </button>
        <button type="button" className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700" onClick={() => confirmation.respond(true)}>
          {confirmation.label}
        </button>
      </div>
    </dialog>
  )
}
