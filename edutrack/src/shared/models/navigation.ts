export type NavigationIcon = 'dashboard' | 'calendar' | 'notes' | 'chat' | 'account'

export interface NavigationItem {
  label: string
  icon: NavigationIcon
  to: string
  available: boolean
}
