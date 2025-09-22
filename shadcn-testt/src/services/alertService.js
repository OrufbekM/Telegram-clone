let toastFunction = null
let confirmFunction = null
export const initAlertService = (toast, confirm) => {
  toastFunction = toast
  confirmFunction = confirm
  const originalAlert = window.alert
  window.alert = (message) => {
    if (toastFunction) {
      toastFunction({
        title: "Diqqat!",
        description: message || "Xabar",
        variant: "default"
      })
    } else {
      originalAlert(message)
    }
  }
  const originalConfirm = window.confirm
  window.confirm = async (message) => {
    if (confirmFunction) {
      try {
        const result = await confirmFunction({
          title: "Tasdiqlash",
          message: message || "Davom etishni xohlaysizmi?",
          confirmText: "Ha",
          cancelText: "Yo'q"
        })
        return !!result
      } catch (error) {
        return false
      }
    } else {
      return originalConfirm(message)
    }
  }
  window.customAlert = (message, variant = "default") => {
    if (toastFunction) {
      let title = "Xabar"
      switch (variant) {
        case "success":
          title = "Muvaffaqiyat!"
          break
        case "error":
        case "destructive":
          title = "Xatolik!"
          break
        case "warning":
          title = "Ogohlantirish!"
          break
        default:
          title = "Xabar"
      }
      toastFunction({
        title,
        description: message,
        variant: variant === "error" ? "destructive" : variant
      })
    }
  }
  window.customConfirm = async ({
    message,
    title = "Tasdiqlash",
    confirmText = "Ha",
    cancelText = "Yo'q",
    variant = "default"
  }) => {
    if (confirmFunction) {
      try {
        const result = await confirmFunction({
          title,
          message,
          confirmText,
          cancelText,
          variant
        })
        return !!result
      } catch (error) {
        return false
      }
    }
    return false
  }
}
export const restoreNativeAlerts = () => {
  if (window.originalAlert) {
    window.alert = window.originalAlert
  }
  if (window.originalConfirm) {
    window.confirm = window.originalConfirm
  }
}
export const showSuccessAlert = (message) => {
  window.customAlert(message, "success")
}
export const showErrorAlert = (message) => {
  window.customAlert(message, "error")
}
export const showWarningAlert = (message) => {
  window.customAlert(message, "warning")
}
export const showInfoAlert = (message) => {
  window.customAlert(message, "default")
}
export const showConfirm = async (message, options = {}) => {
  return await window.customConfirm({
    message,
    ...options
  })
}

