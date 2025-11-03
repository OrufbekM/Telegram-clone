import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { useGroups } from '../hooks/useGroups'
import { useToast } from '../hooks/use-toast'
import { storage } from '../utils/storageUtils'
const CreateGroupDialog = ({ open, onOpenChange, onGroupCreated }) => {
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    isPrivate: false
  })
  const { createGroup, isLoading } = useGroups()
  const { toast } = useToast()
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = storage.getPersistent('chatToken')
      await createGroup(token, { ...groupForm, type: 'group' })
      toast({ title: 'Guruh yaratildi!', description: `${groupForm.name} guruhi yaratildi` })
      setGroupForm({ name: '', description: '', isPrivate: false })
      onOpenChange(false)
      onGroupCreated && onGroupCreated()
    } catch (error) {
      toast({ title: 'Xatolik!', description: error.message, variant: 'destructive' })
    }
  }
  const handleClose = () => {
    setGroupForm({ name: '', description: '', isPrivate: false })
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>Yangi guruh yaratish</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="groupName">Guruh nomi</Label>
            <Input id="groupName" value={groupForm.name} onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="groupDescription">Tavsif</Label>
            <Input id="groupDescription" value={groupForm.description} onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))} />
          </div>
          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Bekor qilish</Button>
            <Button type="submit" className="flex-1 dark:bg-blue-900 dark:text-white" disabled={isLoading}>{isLoading ? 'Yaratilmoqda...' : 'Guruh yaratish'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default CreateGroupDialog

