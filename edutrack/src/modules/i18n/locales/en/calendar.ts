import type { calendarVi } from '@/modules/i18n/locales/vi/calendar'

export const calendarEn = {
  'calendar.holiday.calendarName': 'Holidays in Vietnam',
  'calendar.holiday.closeAria': 'Close holiday details',
  'calendar.holiday.allDay': 'All day',
  'calendar.holiday.typePublic': 'Public holiday',
  'calendar.holiday.typeCompensatory': 'Compensatory / swapped holiday',
  'calendar.holiday.typeObservance': 'Observance / traditional holiday',
  'calendar.holiday.loadError': 'Unable to load Vietnamese holiday data',
  'calendar.holiday.outOfRange': 'No holiday data available for this period yet',
  'calendar.holiday.emptyToday': 'No events or holidays on this day.',
} as const satisfies Record<keyof typeof calendarVi, string>
