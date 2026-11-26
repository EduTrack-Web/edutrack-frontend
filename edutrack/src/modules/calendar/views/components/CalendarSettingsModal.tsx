import { useEffect, useState } from 'react'
import type { CalendarPreferences } from '../../models/calendar.types'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
import { Icon } from '@/shared/components/Icon'

interface CalendarSettingsModalProps {
  isOpen: boolean
  preferences: CalendarPreferences
  isSaving: boolean
  onClose: () => void
  onUpdatePreferences: (preferences: Partial<CalendarPreferences>) => Promise<boolean>
}

interface SwitchRowProps {
  id: string
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onToggle: () => void
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  disabled,
  onToggle,
}: SwitchRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-white/10 dark:bg-white/5">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800 dark:text-white" id={id}>
          {label}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <button
        aria-checked={checked}
        aria-labelledby={id}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60"
        disabled={disabled}
        onClick={onToggle}
        role="switch"
        type="button"
      >
        <span
          className={`relative block h-7 w-12 rounded-full transition-colors ${
            checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${
              checked ? 'translate-x-5' : ''
            }`}
          />
        </span>
      </button>
    </div>
  )
}

interface CalendarSettingsDialogContentProps {
  initialShowLunarCalendar: boolean
  isSaving: boolean
  onClose: () => void
  onUpdatePreferences: (preferences: Partial<CalendarPreferences>) => Promise<boolean>
}

function CalendarSettingsDialogContent({
  initialShowLunarCalendar,
  isSaving,
  onClose,
  onUpdatePreferences,
}: CalendarSettingsDialogContentProps) {
  const { t } = useTranslation()
  const [draftShowLunar, setDraftShowLunar] = useState(initialShowLunarCalendar)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSaving, onClose])

  const handleSave = async () => {
    const saved = await onUpdatePreferences({ showLunarCalendar: draftShowLunar })
    if (saved) {
      onClose()
    }
  }

  return (
    <div
      aria-labelledby="calendar-general-settings-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={() => { if (!isSaving) onClose() }}
      role="dialog"
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#021024]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white" id="calendar-general-settings-title">
              {t('calendar.settings.title')}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('calendar.settings.subtitle')}
            </p>
          </div>
          <button
            aria-label={t('calendar.settings.closeAria')}
            className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <SwitchRow
            checked={draftShowLunar}
            description={t('calendar.settings.lunarDescription')}
            disabled={isSaving}
            id="lunar-calendar-switch-label"
            label={t('calendar.settings.lunarLabel')}
            onToggle={() => setDraftShowLunar((prev) => !prev)}
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            {t('calendar.settings.cancel')}
          </button>
          <button
            className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60"
            disabled={isSaving}
            onClick={() => void handleSave()}
            type="button"
          >
            {isSaving ? t('calendar.settings.saving') : t('calendar.settings.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function CalendarSettingsModal({
  isOpen,
  preferences,
  isSaving,
  onClose,
  onUpdatePreferences,
}: CalendarSettingsModalProps) {
  if (!isOpen) return null

  return (
    <CalendarSettingsDialogContent
      initialShowLunarCalendar={preferences.showLunarCalendar}
      isSaving={isSaving}
      onClose={onClose}
      onUpdatePreferences={onUpdatePreferences}
    />
  )
}
