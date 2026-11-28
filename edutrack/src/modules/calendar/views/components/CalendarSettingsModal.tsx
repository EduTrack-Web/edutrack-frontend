import { useEffect, useState } from 'react'
import type {
  CalendarPreferences,
  GoogleCalendarIntegrationStatus,
} from '../../models/calendar.types'
import { sortGoogleIntegrations } from '../../models/googleCalendarSync'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
import { Icon } from '@/shared/components/Icon'
import '../../styles/calendarScrollbar.css'

interface CalendarSettingsModalProps {
  isOpen: boolean
  preferences: CalendarPreferences
  isSaving: boolean
  googleIntegrations: GoogleCalendarIntegrationStatus[]
  isGoogleConfigured: boolean
  isUpdatingGoogleIntegrationId: string | null
  onClose: () => void
  onUpdatePreferences: (preferences: Partial<CalendarPreferences>) => Promise<boolean>
  onStartAddGoogleAccount: () => void
  onSetPrimaryGoogleAccount: (integrationId: string) => Promise<void>
  onToggleSyncToGoogle: (integrationId: string, enabled: boolean) => Promise<void>
  onToggleSyncFromGoogle: (integrationId: string, enabled: boolean) => Promise<void>
  onOpenSelectGoogleCalendars: (integration: GoogleCalendarIntegrationStatus) => void
}

type InfoSectionKey = 'lunar' | 'google'

interface InfoToggleButtonProps {
  ariaLabel: string
  controlsId: string
  isOpen: boolean
  onToggle: () => void
}

function InfoToggleButton({
  ariaLabel,
  controlsId,
  isOpen,
  onToggle,
}: InfoToggleButtonProps) {
  return (
    <button
      aria-controls={controlsId}
      aria-expanded={isOpen}
      aria-label={ariaLabel}
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
        isOpen
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
      }`}
      onClick={onToggle}
      type="button"
    >
      <Icon className="size-4" name="info" />
    </button>
  )
}

interface CalendarSettingsDialogContentProps
  extends Omit<CalendarSettingsModalProps, 'isOpen' | 'preferences'> {
  initialShowLunarCalendar: boolean
}

function CalendarSettingsDialogContent({
  initialShowLunarCalendar,
  isSaving,
  googleIntegrations,
  isGoogleConfigured,
  isUpdatingGoogleIntegrationId,
  onClose,
  onUpdatePreferences,
  onStartAddGoogleAccount,
  onSetPrimaryGoogleAccount,
  onToggleSyncToGoogle,
  onToggleSyncFromGoogle,
  onOpenSelectGoogleCalendars,
}: CalendarSettingsDialogContentProps) {
  const { t } = useTranslation()
  const [draftShowLunar, setDraftShowLunar] = useState(initialShowLunarCalendar)
  const [openInfoKey, setOpenInfoKey] = useState<InfoSectionKey | null>(null)
  const sortedIntegrations = sortGoogleIntegrations(googleIntegrations)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSaving, onClose])

  const toggleInfo = (section: InfoSectionKey) => {
    setOpenInfoKey((prev) => (prev === section ? null : section))
  }

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
          <h2
            className="text-base font-bold text-slate-900 sm:text-lg dark:text-white"
            id="calendar-general-settings-title"
          >
            {t('calendar.settings.title')}
          </h2>
          <button
            aria-label={t('calendar.settings.closeAria')}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:size-10 dark:hover:bg-white/10"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            <Icon className="size-4.5" name="close" />
          </button>
        </div>

        <div className="gcal-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3.5 sm:px-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="text-sm font-semibold text-slate-900 dark:text-white"
                  id="lunar-calendar-switch-label"
                >
                  {t('calendar.settings.lunarLabel')}
                </span>
                <InfoToggleButton
                  ariaLabel={t('calendar.settings.lunarInfoAria')}
                  controlsId="lunar-calendar-info-panel"
                  isOpen={openInfoKey === 'lunar'}
                  onToggle={() => toggleInfo('lunar')}
                />
              </div>

              <button
                aria-checked={draftShowLunar}
                aria-labelledby="lunar-calendar-switch-label"
                className="inline-flex min-h-9 shrink-0 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60"
                disabled={isSaving}
                onClick={() => setDraftShowLunar((prev) => !prev)}
                role="switch"
                type="button"
              >
                <span
                  className={`relative block h-6 w-11 rounded-full transition-colors ${
                    draftShowLunar ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${
                      draftShowLunar ? 'translate-x-5' : ''
                    }`}
                  />
                </span>
              </button>
            </div>

            {openInfoKey === 'lunar' && (
              <div
                className="mt-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                id="lunar-calendar-info-panel"
              >
                {t('calendar.settings.lunarDescription')}
              </div>
            )}
          </div>

          <div className="my-3.5 border-t border-slate-100 dark:border-white/10" />

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('calendar.google.settingsTitle')}
                </h3>
                <InfoToggleButton
                  ariaLabel={t('calendar.settings.googleInfoAria')}
                  controlsId="google-sync-info-panel"
                  isOpen={openInfoKey === 'google'}
                  onToggle={() => toggleInfo('google')}
                />
              </div>

              <button
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60"
                disabled={!isGoogleConfigured}
                onClick={onStartAddGoogleAccount}
                type="button"
              >
                <Icon className="size-3.5" name="plus" />
                <span>{t('calendar.google.addGmailButton')}</span>
              </button>
            </div>

            {openInfoKey === 'google' && (
              <div
                className="mt-2 space-y-1.5 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-xs leading-relaxed text-slate-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-slate-200"
                id="google-sync-info-panel"
              >
                <p>{t('calendar.google.settingsDesc')}</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    <strong className="font-semibold text-slate-900 dark:text-white">
                      {t('calendar.google.pushDirectionLabel')}:
                    </strong>{' '}
                    {t('calendar.google.pushDirectionDesc')}.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900 dark:text-white">
                      {t('calendar.google.pullDirectionLabel')}:
                    </strong>{' '}
                    {t('calendar.google.pullDirectionDesc')}.
                  </li>
                </ul>
                <p className="text-slate-600 dark:text-slate-300">
                  {t('calendar.google.toggleOffNote')}
                </p>
              </div>
            )}

            {!isGoogleConfigured && (
              <p className="mt-2.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {t('calendar.google.notConfigured')}
              </p>
            )}

            {sortedIntegrations.length === 0 ? (
              <p className="mt-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {t('calendar.google.unlinkedEmpty')}
              </p>
            ) : (
              <div className="mt-2.5 space-y-2">
                {sortedIntegrations.map((integration) => {
                  const isBusy = isUpdatingGoogleIntegrationId === integration.id
                  const selectedCount = integration.calendars.filter((c) => c.isSelected).length

                  return (
                    <div
                      className={`rounded-xl border px-3 py-2.5 transition-colors ${
                        integration.isPrimarySyncAccount
                          ? 'border-blue-200 bg-blue-50/25 dark:border-blue-800/60 dark:bg-slate-900/70'
                          : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'
                      }`}
                      key={integration.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <img alt="" className="size-4 shrink-0" src="/google-g-logo.png" />
                          <span
                            className="truncate text-sm font-semibold text-slate-900 dark:text-white"
                            title={integration.googleEmail}
                          >
                            {integration.googleEmail}
                          </span>
                          {integration.isPrimarySyncAccount && (
                            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {t('calendar.google.primaryShortBadge')}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {!integration.isPrimarySyncAccount && (
                            <button
                              className="min-h-8 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                              disabled={isBusy}
                              onClick={() => void onSetPrimaryGoogleAccount(integration.id)}
                              type="button"
                            >
                              {t('calendar.google.setPrimary')}
                            </button>
                          )}
                          <button
                            className="min-h-8 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            onClick={() => {
                              onClose()
                              onOpenSelectGoogleCalendars(integration)
                            }}
                            type="button"
                          >
                            {t('calendar.google.selectCalendarsCount', {
                              count: String(selectedCount),
                            })}
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-2 dark:border-white/10">
                        <label
                          className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-xs font-medium text-slate-800 sm:text-sm dark:text-slate-200"
                          title={t('calendar.google.pushDirectionDesc')}
                        >
                          <input
                            checked={integration.syncToGoogleEnabled}
                            className="size-4 shrink-0 cursor-pointer rounded accent-blue-600"
                            disabled={isBusy}
                            onChange={() =>
                              void onToggleSyncToGoogle(
                                integration.id,
                                !integration.syncToGoogleEnabled,
                              )
                            }
                            type="checkbox"
                          />
                          <span>{t('calendar.google.pushDirectionLabel')}</span>
                        </label>

                        <label
                          className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-xs font-medium text-slate-800 sm:text-sm dark:text-slate-200"
                          title={t('calendar.google.pullDirectionDesc')}
                        >
                          <input
                            checked={integration.syncFromGoogleEnabled}
                            className="size-4 shrink-0 cursor-pointer rounded accent-emerald-600"
                            disabled={isBusy}
                            onChange={() =>
                              void onToggleSyncFromGoogle(
                                integration.id,
                                !integration.syncFromGoogleEnabled,
                              )
                            }
                            type="checkbox"
                          />
                          <span>{t('calendar.google.pullDirectionLabel')}</span>
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 px-4 py-3 sm:px-5 dark:border-white/10">
          <button
            className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            {t('calendar.settings.cancel')}
          </button>
          <button
            className="min-h-10 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60"
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
  googleIntegrations,
  isGoogleConfigured,
  isUpdatingGoogleIntegrationId,
  onClose,
  onUpdatePreferences,
  onStartAddGoogleAccount,
  onSetPrimaryGoogleAccount,
  onToggleSyncToGoogle,
  onToggleSyncFromGoogle,
  onOpenSelectGoogleCalendars,
}: CalendarSettingsModalProps) {
  if (!isOpen) return null

  return (
    <CalendarSettingsDialogContent
      googleIntegrations={googleIntegrations}
      initialShowLunarCalendar={preferences.showLunarCalendar}
      isGoogleConfigured={isGoogleConfigured}
      isSaving={isSaving}
      isUpdatingGoogleIntegrationId={isUpdatingGoogleIntegrationId}
      onClose={onClose}
      onOpenSelectGoogleCalendars={onOpenSelectGoogleCalendars}
      onSetPrimaryGoogleAccount={onSetPrimaryGoogleAccount}
      onStartAddGoogleAccount={onStartAddGoogleAccount}
      onToggleSyncFromGoogle={onToggleSyncFromGoogle}
      onToggleSyncToGoogle={onToggleSyncToGoogle}
      onUpdatePreferences={onUpdatePreferences}
    />
  )
}
