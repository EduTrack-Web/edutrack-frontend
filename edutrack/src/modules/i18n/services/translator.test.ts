import { describe, expect, it } from 'vitest'

import { interfaceLocale, translate } from '@/modules/i18n/services/translator'

describe('i18n translator', () => {
  it('uses the dictionary selected by the interface language', () => {
    expect(translate('VI', 'chat.presence.online')).toBe('Đang hoạt động')
    expect(translate('EN', 'chat.presence.online')).toBe('Active now')
  })

  it('interpolates typed translation parameters', () => {
    expect(translate('VI', 'chat.presence.hoursAgo.many', { count: 3 }))
      .toBe('Hoạt động 3 giờ trước')
    expect(translate('EN', 'chat.presence.hoursAgo.many', { count: 3 }))
      .toBe('Active 3 hours ago')
  })

  it('maps interface languages to formatting locales', () => {
    expect(interfaceLocale('VI')).toBe('vi-VN')
    expect(interfaceLocale('EN')).toBe('en-US')
  })
})
