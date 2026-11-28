import { useEffect, useState } from 'react'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
import { Icon } from '@/shared/components/Icon'
import type { GoogleCalendarIntegrationStatus } from '../../models/calendar.types'
import { getGoogleAccessRoleLabel } from '../../models/googleCalendarSync'
import '../../styles/calendarScrollbar.css'

interface GoogleCalendarSelectModalProps {
  isOpen: boolean
  integration: GoogleCalendarIntegrationStatus | null
  isSaving: boolean
  isRefreshing: boolean
  onBack?: () => void
  onClose: () => void
  onRefreshList: (integrationId: string) => void
  onSaveSelection: (
    integrationId: string,
    selectedCalendarIds: string[],
    removedActions: Array<{ calendarConnectionId: string; action: 'keep' | 'delete' }>,
  ) => Promise<void>
}

interface GoogleCalendarSelectDialogContentProps
  extends Omit<GoogleCalendarSelectModalProps, 'isOpen' | 'integration'> {
  integration: GoogleCalendarIntegrationStatus
}

function GoogleCalendarSelectDialogContent({
  integration,
  isSaving,
  isRefreshing,
  onBack,
  onClose,
  onRefreshList,
  onSaveSelection,
}: GoogleCalendarSelectDialogContentProps) {
  const { t } = useTranslation()
  const [draftSelectedIds, setDraftSelectedIds] = useState<string[]>(() =>
    integration.calendars.filter((c) => c.isSelected).map((c) => c.id),
  )
  const [removalActions, setRemovalActions] = useState<Record<string, 'keep' | 'delete'>>({})
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        if (onBack) {
          onBack()
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSaving, onBack, onClose])

  const previouslySelected = integration.calendars.filter((c) => c.isSelected)
  const uncheckedPreviouslySelected = previouslySelected.filter(
    (c) => !draftSelectedIds.includes(c.id),
  )

  const toggleCalendar = (calId: string) => {
    setValidationError(null)
    setDraftSelectedIds((prev) =>
      prev.includes(calId) ? prev.filter((id) => id !== calId) : [...prev, calId],
    )
  }

  const handleSelectAll = () => {
    setValidationError(null)
    setDraftSelectedIds(integration.calendars.map((c) => c.id))
  }

  const handleDeselectAll = () => {
    setValidationError(null)
    setDraftSelectedIds([])
  }

  const handleConfirmSave = () => {
    const missingAction = uncheckedPreviouslySelected.find((cal) => !removalActions[cal.id])
    if (missingAction) {
      setValidationError(
        `Vui lòng chọn giữ lại hay xóa dữ liệu cho lịch "${missingAction.summary}" vừa bỏ chọn.`,
      )
      return
    }
    const removedActions = uncheckedPreviouslySelected.map((cal) => ({
      calendarConnectionId: cal.id,
      action: removalActions[cal.id] ?? 'keep',
    }))
    void onSaveSelection(integration.id, draftSelectedIds, removedActions)
  }

  return (
    <div
      aria-labelledby="google-calendar-select-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-4"
      onMouseDown={() => {
        if (!isSaving) onClose()
      }}
      role="dialog"
    >
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#021024]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 dark:border-white/10">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {onBack && (
              <button
                aria-label={t('calendar.google.backToSettingsAria')}
                className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 sm:size-10 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                disabled={isSaving}
                onClick={onBack}
                title={t('calendar.google.backToSettingsAria')}
                type="button"
              >
                <Icon className="size-4.5" name="arrowLeft" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h2
                className="text-base font-bold text-slate-900 sm:text-lg dark:text-white"
                id="google-calendar-select-title"
              >
                {t('calendar.google.selectModalTitle')}
              </h2>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {integration.displayName
                  ? `${integration.displayName} (${integration.googleEmail})`
                  : integration.googleEmail}
              </p>
            </div>
          </div>

          <button
            aria-label={t('calendar.google.selectModalCloseAria')}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:size-10 dark:hover:bg-white/10"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            <Icon className="size-4.5" name="close" />
          </button>
        </div>

        <div className="gcal-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                disabled={isSaving}
                onClick={handleSelectAll}
                type="button"
              >
                {t('calendar.google.selectAll')}
              </button>
              <button
                className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                disabled={isSaving}
                onClick={handleDeselectAll}
                type="button"
              >
                {t('calendar.google.deselectAll')}
              </button>
            </div>

            <button
              className="flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60 dark:border-white/10 dark:text-blue-400 dark:hover:bg-white/10"
              disabled={isSaving || isRefreshing}
              onClick={() => onRefreshList(integration.id)}
              type="button"
            >
              <Icon className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} name="clock" />
              <span>
                {isRefreshing
                  ? t('calendar.google.refreshingList')
                  : t('calendar.google.refreshList')}
              </span>
            </button>
          </div>

          <div className="space-y-2">
            {integration.calendars.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {t('calendar.google.emptyCalendars')}
              </p>
            ) : (
              integration.calendars.map((cal) => {
                const checked = draftSelectedIds.includes(cal.id)
                return (
                  <label
                    className="flex min-h-11 min-w-0 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-3 py-2 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                    htmlFor={`gcal-select-${cal.id}`}
                    key={cal.id}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      <input
                        checked={checked}
                        className="size-4 shrink-0 rounded accent-blue-600"
                        disabled={isSaving}
                        id={`gcal-select-${cal.id}`}
                        onChange={() => toggleCalendar(cal.id)}
                        type="checkbox"
                      />
                      <span
                        className="size-3.5 shrink-0 rounded-full border border-black/10"
                        style={{ backgroundColor: cal.backgroundColor }}
                      />
                      <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                          {cal.summary}
                        </span>
                        {cal.isPrimary && (
                          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            {t('calendar.google.primaryCalendarBadge')}
                          </span>
                        )}
                      </span>
                    </span>

                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {getGoogleAccessRoleLabel(cal.accessRole)}
                    </span>
                  </label>
                )
              })
            )}
          </div>

          {uncheckedPreviouslySelected.length > 0 && (
            <div className="mt-4 space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-800/60 dark:bg-amber-950/30">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Bạn vừa bỏ chọn {uncheckedPreviouslySelected.length} lịch đang đồng bộ. Vui lòng chọn cách xử lý các sự kiện đã nhập từ mỗi lịch:
              </p>
              {uncheckedPreviouslySelected.map((cal) => {
                const picked = removalActions[cal.id]
                return (
                  <div
                    className="rounded-lg border border-amber-200/80 bg-white p-2.5 dark:border-white/10 dark:bg-[#021024]"
                    key={cal.id}
                  >
                    <p className="break-words text-sm font-semibold text-slate-800 dark:text-white">
                      {cal.summary}
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-4">
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                        <input
                          checked={picked === 'keep'}
                          name={`remove-action-${cal.id}`}
                          onChange={() => {
                            setValidationError(null)
                            setRemovalActions((prev) => ({ ...prev, [cal.id]: 'keep' }))
                          }}
                          type="radio"
                        />
                        <span>{t('calendar.google.keepRemovedEvents')}</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        <input
                          checked={picked === 'delete'}
                          name={`remove-action-${cal.id}`}
                          onChange={() => {
                            setValidationError(null)
                            setRemovalActions((prev) => ({ ...prev, [cal.id]: 'delete' }))
                          }}
                          type="radio"
                        />
                        <span>{t('calendar.google.deleteRemovedEvents')}</span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {validationError && (
            <p className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
              {validationError}
            </p>
          )}

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t('calendar.google.fullSyncNotice')}
          </p>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:justify-end sm:px-5 dark:border-white/10">
          <button
            className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            disabled={isSaving}
            onClick={onBack ?? onClose}
            type="button"
          >
            {t('calendar.settings.cancel')}
          </button>
          <button
            className="min-h-10 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            disabled={isSaving}
            onClick={handleConfirmSave}
            type="button"
          >
            {isSaving ? t('calendar.google.savingSelection') : t('calendar.google.saveSelection')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function GoogleCalendarSelectModal(props: GoogleCalendarSelectModalProps) {
  if (!props.isOpen || !props.integration) return null

  return (
    <GoogleCalendarSelectDialogContent
      integration={props.integration}
      isRefreshing={props.isRefreshing}
      isSaving={props.isSaving}
      key={props.integration.id}
      onBack={props.onBack}
      onClose={props.onClose}
      onRefreshList={props.onRefreshList}
      onSaveSelection={props.onSaveSelection}
    />
  )
}
