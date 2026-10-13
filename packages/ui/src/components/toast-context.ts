import { createContext, useContext, useMemo } from 'react'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export interface ToastInput {
  title: string
  description?: string
  tone?: ToastTone
  /** Milliseconds; 0 keeps it until dismissed. Default 5000. */
  duration?: number
}

export const ToastContext = createContext<((toast: ToastInput) => void) | null>(null)

export function useToast() {
  const push = useContext(ToastContext)
  if (!push) throw new Error('useToast must be used inside <ToastProvider>')
  return useMemo(() => ({ toast: push }), [push])
}
