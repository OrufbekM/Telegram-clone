import { useState, useCallback } from 'react'
export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ha',
    cancelText: "Yo'q",
    variant: 'default',
    onConfirm: null
  })
  const confirm = useCallback(({
    title = 'Tasdiqlash',
    message,
    confirmText = 'Ha',
    cancelText = "Yo'q",
    variant = 'default'
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        variant,
        onConfirm: () => resolve(true)
      })
    })
  }, [])
  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({
      ...prev,
      isOpen: false,
      onConfirm: null
    }))
  }, [])
  const handleConfirm = useCallback(() => {
    if (confirmState.onConfirm) {
      confirmState.onConfirm()
    }
    closeConfirm()
  }, [confirmState.onConfirm, closeConfirm])
  return {
    confirm,
    confirmState,
    closeConfirm,
    handleConfirm
  }
}

