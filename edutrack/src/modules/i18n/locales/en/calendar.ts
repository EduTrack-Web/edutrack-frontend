import type { calendarVi } from '@/modules/i18n/locales/vi/calendar'

export const calendarEn = {
  'calendar.settings.button': 'Settings',
  'calendar.settings.openAria': 'Calendar settings',
  'calendar.settings.title': 'Calendar settings',
  'calendar.settings.subtitle': 'Customize display preferences for your calendar. Click Save to apply changes.',
  'calendar.settings.closeAria': 'Close calendar settings',
  'calendar.settings.lunarLabel': 'Show lunar calendar',
  'calendar.settings.lunarDescription': 'Display Vietnamese lunar dates alongside solar dates.',
  'calendar.settings.cancel': 'Cancel',
  'calendar.settings.save': 'Save',
  'calendar.settings.saving': 'Saving...',
  'calendar.settings.saveSuccess': 'Calendar display settings updated.',
  'calendar.settings.saveError': 'Could not save settings, please try again.',
  'calendar.settings.loadError': 'Could not load calendar display settings. Using defaults temporarily.',
  'calendar.lunar.outOfRange': 'Selected calendar range is outside the supported years for lunar dates.',
  'calendar.lunar.rateLimited': 'You are navigating too quickly. Please try again in a few seconds.',
  'calendar.lunar.loadError': 'Could not load lunar calendar data. Solar calendar remains available.',
  'calendar.lunar.tooltipPrefix': 'Lunar',
  'calendar.lunar.leapSuffix': ' leap',
  'calendar.lunar.leapSrOnly': ' (leap month)',
} as const satisfies Record<keyof typeof calendarVi, string>
