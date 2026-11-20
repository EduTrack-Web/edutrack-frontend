import { useEffect, useState } from 'react'

import { formatFriendRequestElapsed } from '@/modules/chat/models/friendRequestTime'
import { useLanguage } from '@/modules/i18n/viewmodels/useLanguage'

interface FriendRequestTimeProps {
  createdAt: string
}

export function FriendRequestTime({ createdAt }: FriendRequestTimeProps) {
  const { language } = useLanguage()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return <time dateTime={createdAt}>{formatFriendRequestElapsed(createdAt, language, now)}</time>
}
