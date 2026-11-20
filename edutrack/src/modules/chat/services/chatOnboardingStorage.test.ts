import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  hasSeenChatComposerGuide,
  markChatComposerGuideSeen,
} from '@/modules/chat/services/chatOnboardingStorage'

afterEach(() => vi.unstubAllGlobals())

describe('chat composer onboarding storage', () => {
  it('shows the guide once for each account on the device', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    })

    expect(hasSeenChatComposerGuide('user-a')).toBe(false)
    markChatComposerGuideSeen('user-a')
    expect(hasSeenChatComposerGuide('user-a')).toBe(true)
    expect(hasSeenChatComposerGuide('user-b')).toBe(false)
  })
})
