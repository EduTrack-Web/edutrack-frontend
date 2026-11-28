import { useEffect } from 'react'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
import { Icon } from '@/shared/components/Icon'

interface ConfirmDeleteGoogleEventModalProps {
  isOpen: boolean
  title: string
  isReadOnly: boolean
  isDeleting: boolean
  onClose: () => void
  onConfirm: (scope: 'local_only' | 'both') => void
}

export function ConfirmDeleteGoogleEventModal({
  isOpen,
  title,
  isReadOnly,
  isDeleting,
  onClose,
  onConfirm,
}: ConfirmDeleteGoogleEventModalProps) {
  const { t } = useTranslation()
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDeleting, isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      aria-labelledby="delete-google-event-title"
      aria-modal="true"
      className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={() => {
        if (!isDeleting) onClose()
      }}
      role="dialog"
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#021024]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <Icon className="size-5" name="trash" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white" id="delete-google-event-title">
                {t('calendar.google.deleteTitle')}
              </h3>
              <p className="mt-1 break-words text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {t('calendar.google.deleteLinkedPrefix')}{' '}
                <strong className="break-words text-slate-700 dark:text-slate-200">“{title}”</strong>{' '}
                {t('calendar.google.deleteLinkedSuffix')}{' '}
                {isReadOnly
                  ? t('calendar.google.deleteReadOnlyHint')
                  : t('calendar.google.deleteChooseScopeHint')}
              </p>
            </div>
          </div>

          <button
            aria-label={t('calendar.google.closeDialogAria')}
            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            disabled={isDeleting}
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="mt-5 space-y-2.5">
          <button
            className="flex min-h-11 w-full flex-col items-start rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-left transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            disabled={isDeleting}
            onClick={() => onConfirm('local_only')}
            type="button"
          >
              <span className="text-xs font-bold text-slate-900 dark:text-white">
              {t('calendar.google.deleteLocalOnly')}
            </span>
            <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {t('calendar.google.deleteLocalOnlyDesc')}
            </span>
          </button>

          {!isReadOnly && (
            <button
              className="flex min-h-11 w-full flex-col items-start rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-2.5 text-left transition-colors hover:bg-rose-100 disabled:opacity-60 dark:border-rose-900/50 dark:bg-rose-950/30 dark:hover:bg-rose-950/50"
              disabled={isDeleting}
              onClick={() => onConfirm('both')}
              type="button"
            >
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                {t('calendar.google.deleteBoth')}
              </span>
              <span className="mt-0.5 text-[11px] text-rose-600/85 dark:text-rose-300/80">
                {t('calendar.google.deleteBothDesc')}
              </span>
            </button>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            disabled={isDeleting}
            onClick={onClose}
            type="button"
          >
            {t('calendar.settings.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
