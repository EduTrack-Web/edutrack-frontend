import { describe, expect, it } from 'vitest'
import { getCalendarEventCardColors } from './calendarEventColors'

describe('calendar event card colors', () => {
  it('uses white text on a dark card and keeps the selected background', () => {
    expect(getCalendarEventCardColors('#3f51b5')).toEqual({ backgroundColor: '#3f51b5', color: '#fff' })
  })

  it('uses white text on teal and medium blue cards with a slightly darker display shade', () => {
    expect(getCalendarEventCardColors('#009688')).toEqual({ backgroundColor: 'rgb(0 126 114)', color: '#fff' })
    expect(getCalendarEventCardColors('#4281ef')).toEqual({ backgroundColor: 'rgb(55 108 200)', color: '#fff' })
  })

  it('keeps bright yellow and salmon backgrounds with dark text', () => {
    expect(getCalendarEventCardColors('#fbd75b')).toEqual({ backgroundColor: '#fbd75b', color: '#000' })
    expect(getCalendarEventCardColors('#eb7b70')).toEqual({ backgroundColor: '#eb7b70', color: '#000' })
  })

  it('handles short hex colors and falls back if a background is missing or invalid', () => {
    expect(getCalendarEventCardColors('#fff')).toEqual({ backgroundColor: '#ffffff', color: '#000' })
    expect(getCalendarEventCardColors('#123')).toEqual({ backgroundColor: '#112233', color: '#fff' })
    expect(getCalendarEventCardColors('')).toEqual({ backgroundColor: '#2563EB', color: '#fff' })
    expect(getCalendarEventCardColors('invalid')).toEqual(getCalendarEventCardColors())
  })
})
