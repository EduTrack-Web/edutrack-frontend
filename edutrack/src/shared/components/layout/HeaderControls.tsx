import { useEffect, useState } from 'react'

import { Icon } from '../Icon'
import { useTheme } from '../../viewmodels/useTheme'

export function HeaderControls() {
  const { theme, toggleTheme } = useTheme()
  const [language, setLanguage] = useState<'VI' | 'EN'>(() => localStorage.getItem('edutrack-language') === 'EN' ? 'EN' : 'VI')

  useEffect(() => {
    localStorage.setItem('edutrack-language', language)
    document.documentElement.lang = language === 'EN' ? 'en' : 'vi'
  }, [language])

  return (
    <div className="flex items-center gap-2">
      <button className="glass-control" type="button" aria-label={`Chuyển sang ${language === 'VI' ? 'EN' : 'VI'}`} onClick={() => setLanguage((current) => current === 'VI' ? 'EN' : 'VI')}><Icon name="globe" /><span className="text-xs font-bold">{language}</span></button>
      <button className="glass-control" type="button" aria-label={theme === 'dark' ? 'Bật chế độ sáng' : 'Bật chế độ tối'} onClick={toggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
    </div>
  )
}
