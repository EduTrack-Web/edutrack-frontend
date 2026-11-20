import { Outlet } from 'react-router-dom'

import { ChatPresenceProvider } from '@/modules/chat/viewmodels/ChatPresenceProvider'
import { AppShell } from '@/shared/components/layout/AppShell'

export function App() {
  return (
    <ChatPresenceProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </ChatPresenceProvider>
  )
}
