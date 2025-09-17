import React from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'
const Toast = ({ toast, onDismiss }) => {
  const getVariantClasses = (variant) => {
    switch (variant) {
      case 'destructive':
        return 'border-red-200 bg-red-50 text-red-800'
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800'
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800'
    }
  }
  return (
    <div
      className={cn(
        'relative w-full max-w-sm p-4 border rounded-lg shadow-lg transition-all duration-300 ease-in-out',
        getVariantClasses(toast.variant)
      )}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-1">
          {toast.title && (
            <h4 className="text-sm font-semibold mb-1">{toast.title}</h4>
          )}
          {toast.description && (
            <p className="text-sm opacity-90">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
export default Toast

