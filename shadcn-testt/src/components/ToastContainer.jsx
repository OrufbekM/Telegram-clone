import React from 'react'
import Toast from './Toast'
const ToastContainer = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}
export default ToastContainer

