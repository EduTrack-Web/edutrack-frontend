import { useLanguage } from '@/modules/i18n/viewmodels/useLanguage'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
import { Icon } from '@/shared/components/Icon'
import { useTheme } from '@/shared/viewmodels/useTheme'

export function HeaderControls() {
  const { theme, toggleTheme } = useTheme()
  const { language, toggleLanguage } = useLanguage()
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2">
      <button className="glass-control" type="button" aria-label={t('common.language.switchTo', { language: language === 'VI' ? 'EN' : 'VI' })} onClick={toggleLanguage}><Icon name="globe" /><span className="text-xs font-bold">{language}</span></button>
      <button className="glass-control" type="button" aria-label={t(theme === 'dark' ? 'common.theme.enableLight' : 'common.theme.enableDark')} onClick={toggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
    </div>
  )
}
