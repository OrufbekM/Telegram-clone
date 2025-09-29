import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'

const ConfirmDialog = ({ 
  open, 
  onOpenChange, 
  title = "Tasdiqlash", 
  message, 
  confirmText = "Ha", 
  cancelText = "Yo'q", 
  onConfirm, 
  variant = "default" 
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onOpenChange(false)
  }
  const handleCancel = () => {
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {message && (
            <DialogDescription className="text-base">
              {message}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex justify-end space-x-2 mt-4">
          <Button 
            variant="outline" 
            onClick={handleCancel}
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default ConfirmDialog

