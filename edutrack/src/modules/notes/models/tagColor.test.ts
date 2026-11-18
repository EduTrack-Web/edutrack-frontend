import { describe, expect, it } from 'vitest'

import { getTagTextColor } from '@/modules/notes/models/tagColor'

describe('tag text contrast', () => {
  it('uses the light theme color on dark tag backgrounds', () => {
    expect(getTagTextColor('#052659')).toBe('#c1e8ff')
    expect(getTagTextColor('#0b8043')).toBe('#c1e8ff')
  })

  it('uses the dark theme color on light tag backgrounds', () => {
    expect(getTagTextColor('#f6bf26')).toBe('#021024')
    expect(getTagTextColor('#b39ddb')).toBe('#021024')
  })
})
