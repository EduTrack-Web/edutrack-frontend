export type ToastLevel = 'error' | 'warning' | 'info' | 'success'

export interface ToastMessage {
  id: number
  level: ToastLevel
  message: string
}
