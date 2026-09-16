import { reactive } from 'vue'

export type ToastKind = 'info' | 'success' | 'error'

export interface ToastItem {
  id: number
  message: string
  kind: ToastKind
  duration: number
}

const toasts = reactive<ToastItem[]>([])
let seq = 0

function dismiss(id: number): void {
  const index = toasts.findIndex(t => t.id === id)
  if (index >= 0)
    toasts.splice(index, 1)
}

function push(message: string, kind: ToastKind, duration: number): number {
  const id = ++seq
  toasts.push({ id, message, kind, duration })
  if (toasts.length > 5)
    toasts.shift()
  if (duration > 0)
    setTimeout(dismiss, duration, id)
  return id
}

/** 轻量全局提示：任意组件调用，`MToastHost` 负责渲染 */
export function useToast(): {
  toasts: ToastItem[]
  dismiss: (id: number) => void
  info: (message: string, duration?: number) => number
  success: (message: string, duration?: number) => number
  error: (message: string, duration?: number) => number
} {
  return {
    toasts,
    dismiss,
    info: (message: string, duration = 2600) => push(message, 'info', duration),
    success: (message: string, duration = 2600) => push(message, 'success', duration),
    error: (message: string, duration = 3600) => push(message, 'error', duration),
  }
}
