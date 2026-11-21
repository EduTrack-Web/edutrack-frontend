const CHAT_COMPOSER_GUIDE_VERSION = 'v1'

const guideStorageKey = (userId: string): string =>
  `edutrack:chat-composer-guide:${CHAT_COMPOSER_GUIDE_VERSION}:${userId}`

export const hasSeenChatComposerGuide = (userId: string): boolean =>
  Boolean(userId)
  && typeof window !== 'undefined'
  && window.localStorage.getItem(guideStorageKey(userId)) === 'seen'

export const markChatComposerGuideSeen = (userId: string): void => {
  if (userId) window.localStorage.setItem(guideStorageKey(userId), 'seen')
}
