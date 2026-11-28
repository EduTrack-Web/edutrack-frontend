import { useEffect } from 'react'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
import { Icon } from '@/shared/components/Icon'

interface ConfirmUnlinkGoogleCalendarModalProps {
  isOpen: boolean
  googleEmail: string
  isUnlinking: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmUnlinkGoogleCalendarModal({
  isOpen,
  googleEmail,
  isUnlinking,
  onClose,
  onConfirm,
}: ConfirmUnlinkGoogleCalendarModalProps) {
  const { t } = useTranslation()
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isUnlinking) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isUnlinking, onClose])

  if (!isOpen) return null

  return (
    <div
      aria-labelledby="unlink-google-calendar-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={() => {
        if (!isUnlinking) onClose()
      }}
      role="dialog"
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#021024]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <Icon className="size-5" name="warning" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white" id="unlink-google-calendar-title">
                {t('calendar.google.unlinkTitle')}
              </h2>
              {googleEmail && (
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400" title={googleEmail}>
                  {t('calendar.google.unlinkAccountLabel', { email: googleEmail })}
                </p>
              )}
            </div>
          </div>

          <button
            aria-label={t('calendar.google.closeDialogAria')}
            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10"
            disabled={isUnlinking}
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Hệ thống sẽ thu hồi quyền truy cập và xóa token đồng bộ khỏi EduTrack đối với tài khoản này.{' '}
          <strong className="font-semibold text-slate-800 dark:text-white">
            Các sự kiện đã đồng bộ trước đó sẽ được giữ nguyên ở cả hai phía
          </strong>{' '}
          (EduTrack và Google Lịch) và sẽ ngừng đồng bộ tự động cho tài khoản này từ lúc này. Các tài khoản Google khác (nếu có) vẫn tiếp tục hoạt động bình thường.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            disabled={isUnlinking}
            onClick={onClose}
            type="button"
          >
            {t('calendar.google.unlinkKeep')}
          </button>
          <button
            className="min-h-11 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
            disabled={isUnlinking}
            onClick={onConfirm}
            type="button"
          >
            {isUnlinking ? t('calendar.google.unlinking') : t('calendar.google.unlinkConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
