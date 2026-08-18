type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

type Listener = (toasts: Toast[]) => void

let toasts: Toast[] = []
let listeners: Listener[] = []

export const toastState = {
  subscribe(listener: Listener) {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  },
  
  notify() {
    listeners.forEach((l) => l([...toasts]))
  },
  
  show(message: string, variant: ToastVariant = 'info') {
    const id = Math.random().toString(36).substr(2, 9)
    toasts = [...toasts, { id, message, variant }]
    this.notify()
    
    setTimeout(() => {
      this.remove(id)
    }, 4000)
  },
  
  remove(id: string) {
    toasts = toasts.filter((t) => t.id !== id)
    this.notify()
  }
}

export const toast = {
  success: (msg: string) => toastState.show(msg, 'success'),
  error: (msg: string) => toastState.show(msg, 'error'),
  info: (msg: string) => toastState.show(msg, 'info'),
}
