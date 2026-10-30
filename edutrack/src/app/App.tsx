import { Outlet } from 'react-router-dom'

import { AppShell } from '../shared/components/layout/AppShell'

export function App() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
