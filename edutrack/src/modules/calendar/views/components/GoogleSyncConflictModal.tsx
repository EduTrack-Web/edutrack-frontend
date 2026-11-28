import { useEffect, useState } from 'react'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
import { Icon } from '@/shared/components/Icon'
import type { GoogleCalendarConflictItem, GoogleSyncConflictVersion } from '../../models/calendar.types'
import { formatConflictVersionRange, GOOGLE_CONFLICT_FIELD_LABELS } from '../../models/googleCalendarSync'

interface GoogleSyncConflictModalProps {
  isOpen: boolean
  conflicts: GoogleCalendarConflictItem[]
  resolvingConflictId: string | null
  onClose: () => void
  onResolve: (
    conflictId: string,
    payload: { choice?: 'local' | 'google'; fieldChoices?: Record<string, 'local' | 'google'> },
  ) => void
}

function ConflictVersionCard({
  heading,
  badgeClass,
  version,
  buttonLabel,
  buttonClass,
  disabled,
  onSelect,
}: {
  heading: string
  badgeClass: string
  version: GoogleSyncConflictVersion
  buttonLabel: string
  buttonClass: string
  disabled: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const updatedAtLabel = new Date(version.updatedAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <div className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badgeClass}`}>
            {heading}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {t('calendar.google.conflictEditedAt')} {updatedAtLabel}
          </span>
        </div>

        <div className="min-w-0">
          <p className="break-words text-sm font-bold text-slate-900 dark:text-white">{version.title}</p>
          <p className="mt-1 break-words text-xs font-medium text-slate-600 dark:text-slate-300">
            {formatConflictVersionRange(version)}
          </p>
        </div>

        {version.location && (
          <p className="break-words text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold">{t('calendar.google.conflictLocationLabel')}</span> {version.location}
          </p>
        )}

        {version.description && (
          <p className="line-clamp-3 break-words text-xs text-slate-500 dark:text-slate-400">
            {version.description}
          </p>
        )}
      </div>

      <button
        className={`mt-4 min-h-11 w-full rounded-xl px-3.5 text-xs font-bold shadow-xs transition-colors disabled:cursor-wait disabled:opacity-60 ${buttonClass}`}
        disabled={disabled}
        onClick={onSelect}
        type="button"
      >
        {buttonLabel}
      </button>
    </div>
  )
}

function formatFieldDisplay(field: string, version: GoogleSyncConflictVersion): string {
  switch (field) {
    case 'startDate':
      return new Date(version.startDate).toLocaleString('vi-VN', { hour12: false })
    case 'endDate':
      return new Date(version.endDate).toLocaleString('vi-VN', { hour12: false })
    case 'isAllDay':
      return version.isAllDay ? 'Cả ngày' : 'Theo giờ'
    case 'availability':
      return version.availability === 'free' ? 'Rảnh' : 'Bận'
    case 'visibility':
      return version.visibility === 'private' ? 'Riêng tư' : version.visibility === 'public' ? 'Công khai' : 'Mặc định'
    default: {
      const value = (version as unknown as Record<string, unknown>)[field]
      return typeof value === 'string' && value.trim() ? value : '(Trống)'
    }
  }
}

export function GoogleSyncConflictModal({
  isOpen,
  conflicts,
  resolvingConflictId,
  onClose,
  onResolve,
}: GoogleSyncConflictModalProps) {
  const { t } = useTranslation()
  const currentConflict = conflicts[0]
  const isBusy = Boolean(currentConflict && resolvingConflictId === currentConflict.id)
  const [fieldChoicesByConflict, setFieldChoicesByConflict] = useState<
    Record<string, Record<string, 'local' | 'google'>>
  >({})

  useEffect(() => {
    if (!isOpen || conflicts.length === 0) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [conflicts.length, isBusy, isOpen, onClose])

  if (!isOpen || !currentConflict) return null

  const conflictedFields = currentConflict.conflictedFields ?? []
  const hasFieldLevel = conflictedFields.length > 0
  const currentChoices = fieldChoicesByConflict[currentConflict.id] ?? {}
  const resolvedFieldChoices: Record<string, 'local' | 'google'> = Object.fromEntries(
    conflictedFields.map((field) => [field, currentChoices[field] ?? 'local']),
  )

  return (
    <div
      aria-labelledby="google-sync-conflict-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={() => {
        if (!isBusy) onClose()
      }}
      role="dialog"
    >
      <div
        className="gcal-scrollbar max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5 dark:border-white/10 dark:bg-[#021024]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white" id="google-sync-conflict-title">
                {t('calendar.google.conflictModalTitle')}
              </h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                {t('calendar.google.conflictRemaining', { count: conflicts.length })}
              </span>
            </div>
            {(currentConflict.accountEmail || currentConflict.calendarName) && (
              <p className="mt-1 break-words text-xs font-semibold text-blue-600 dark:text-blue-400">
                {[currentConflict.accountEmail, currentConflict.calendarName].filter(Boolean).join(' • ')}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('calendar.google.conflictModalDesc')}
            </p>
          </div>

          <button
            aria-label={t('calendar.google.conflictCloseAria')}
            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10"
            disabled={isBusy}
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <ConflictVersionCard
            badgeClass="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200"
            buttonClass="bg-blue-600 text-white hover:bg-blue-700"
            buttonLabel={isBusy ? t('calendar.google.conflictApplying') : t('calendar.google.conflictPickLocal')}
            disabled={isBusy}
            heading={t('calendar.google.conflictLocalTitle')}
            onSelect={() => onResolve(currentConflict.id, { choice: 'local' })}
            version={currentConflict.localVersion}
          />

          <ConflictVersionCard
            badgeClass="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
            buttonClass="bg-emerald-600 text-white hover:bg-emerald-700"
            buttonLabel={isBusy ? t('calendar.google.conflictApplying') : t('calendar.google.conflictPickGoogle')}
            disabled={isBusy}
            heading={t('calendar.google.conflictGoogleTitle')}
            onSelect={() => onResolve(currentConflict.id, { choice: 'google' })}
            version={currentConflict.googleVersion}
          />
        </div>

        {hasFieldLevel && (
          <div className="mt-4 space-y-2.5 rounded-xl border border-slate-200 p-3.5 dark:border-white/10">
            <p className="text-xs font-bold text-slate-800 dark:text-white">
              {t('calendar.google.conflictFieldTitle')}
            </p>
            {conflictedFields.map((field) => {
              const picked = resolvedFieldChoices[field] ?? 'local'
              return (
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-white/5" key={field}>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {GOOGLE_CONFLICT_FIELD_LABELS[field] ?? field}
                  </p>
                  <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="flex min-w-0 cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-white/10 dark:bg-[#021024]">
                      <input
                        checked={picked === 'local'}
                        className="mt-0.5 shrink-0"
                        name={`conflict-${currentConflict.id}-${field}`}
                        onChange={() =>
                          setFieldChoicesByConflict((prev) => ({
                            ...prev,
                            [currentConflict.id]: {
                              ...(prev[currentConflict.id] ?? {}),
                              [field]: 'local',
                            },
                          }))
                        }
                        type="radio"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-blue-600 dark:text-blue-400">EduTrack</span>
                        <span className="block break-words text-slate-700 dark:text-slate-200">
                          {formatFieldDisplay(field, currentConflict.localVersion)}
                        </span>
                      </span>
                    </label>
                    <label className="flex min-w-0 cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-white/10 dark:bg-[#021024]">
                      <input
                        checked={picked === 'google'}
                        className="mt-0.5 shrink-0"
                        name={`conflict-${currentConflict.id}-${field}`}
                        onChange={() =>
                          setFieldChoicesByConflict((prev) => ({
                            ...prev,
                            [currentConflict.id]: {
                              ...(prev[currentConflict.id] ?? {}),
                              [field]: 'google',
                            },
                          }))
                        }
                        type="radio"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-emerald-600 dark:text-emerald-400">Google</span>
                        <span className="block break-words text-slate-700 dark:text-slate-200">
                          {formatFieldDisplay(field, currentConflict.googleVersion)}
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              )
            })}

            <div className="flex justify-end pt-1">
              <button
                className="min-h-11 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-700"
                disabled={isBusy}
                onClick={() =>
                  onResolve(currentConflict.id, { fieldChoices: resolvedFieldChoices })
                }
                type="button"
              >
                {isBusy ? t('calendar.google.conflictSavingFields') : t('calendar.google.conflictApplyFields')}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            className="min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            disabled={isBusy}
            onClick={onClose}
            type="button"
          >
            {t('calendar.google.conflictLater')}
          </button>
        </div>
      </div>
    </div>
  )
}
