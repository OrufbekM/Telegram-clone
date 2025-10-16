import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
const LogoutConfirmDialog = ({ open, onOpenChange, onConfirm, onCancel }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Chiqishni tasdiqlang</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Rostan ham tizimdan chiqishni xohlaysizmi? Barcha ma'lumotlar saqlanadi.
          </DialogDescription>
        </DialogHeader>
        <div className="flex space-x-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Bekor qilish
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm}>
            Ha, chiqish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default LogoutConfirmDialog