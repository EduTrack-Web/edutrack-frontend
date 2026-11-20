import { useChatComposerGuide } from '@/modules/chat/viewmodels/useChatComposerGuide'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'

export function ChatComposerGuide({ userId }: { userId: string }) {
  const { isVisible, dismiss } = useChatComposerGuide(userId)
  const { t } = useTranslation()
  if (!isVisible) return null

  return (
    <section aria-labelledby="chat-composer-guide-title" aria-modal="false" className="absolute right-3 bottom-[calc(100%+8px)] left-3 z-20 rounded-2xl border border-palette-200/80 bg-white/96 p-4 text-left shadow-2xl backdrop-blur-xl sm:left-auto sm:w-80 dark:border-white/15 dark:bg-palette-950/96" role="dialog">
      <p className="text-[11px] font-extrabold tracking-wide text-palette-700 uppercase dark:text-palette-200">{t('chat.composerGuide.step')}</p>
      <h2 className="mt-1 text-sm font-black text-palette-900 dark:text-white" id="chat-composer-guide-title">{t('chat.composerGuide.title')}</h2>
      <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{t('chat.composerGuide.description')}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button className="min-h-11 rounded-xl px-3 text-xs font-bold text-palette-900 transition hover:bg-palette-100 focus-visible:outline-2 focus-visible:outline-palette-700 dark:text-white dark:hover:bg-white/10" onClick={dismiss} type="button">{t('chat.composerGuide.skip')}</button>
        <button className="min-h-11 rounded-xl bg-gradient-to-r from-palette-900 to-palette-700 px-4 text-xs font-extrabold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700" onClick={dismiss} type="button">{t('chat.composerGuide.understood')}</button>
      </div>
      <span aria-hidden="true" className="absolute -bottom-2 right-7 size-4 rotate-45 border-r border-b border-palette-200/80 bg-white/96 dark:border-white/15 dark:bg-palette-950/96" />
    </section>
  )
}
