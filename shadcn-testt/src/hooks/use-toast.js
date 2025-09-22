import { useState, useCallback } from 'react'
export function useToast() {
  const [toasts, setToasts] = useState([])
  const toast = useCallback(({ title, description, variant = 'default' }) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = {
      id,
      title,
      description,
      variant,
      timestamp: Date.now()
    }
    setToasts(prev => [...prev, newToast])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
    return id
  }, [])
  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])
  return { toast, dismiss, toasts }
}

