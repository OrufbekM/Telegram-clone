import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { useChannels } from '../hooks/useChannels'
import { useToast } from '../hooks/use-toast'
import { storage } from '../utils/storageUtils'
const CreateChannelDialog = ({ open, onOpenChange, onChannelCreated }) => {
  const [form, setForm] = useState({ name: '', description: '', isPrivate: false })
  const { createChannel, isLoading } = useChannels()
  const { toast } = useToast()
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = storage.getPersistent('chatToken')
      const data = await createChannel(token, form)
      const createdChannel = data?.channel || null
      toast({ title: 'Kanal yaratildi!', description: `${form.name} kanali yaratildi` })
      const event = createdChannel
        ? new CustomEvent('channel-created', { detail: { channel: createdChannel } })
        : new Event('channel-created')
      window.dispatchEvent(event)
      setForm({ name: '', description: '', isPrivate: false })
      onOpenChange(false)
      onChannelCreated && onChannelCreated()
    } catch (error) {
      toast({ title: 'Xatolik!', description: error.message, variant: 'destructive' })
    }
  }
  const handleClose = () => {
    setForm({ name: '', description: '', isPrivate: false })
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>Yangi kanal yaratish</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="channelName">Kanal nomi</Label>
            <Input id="channelName" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="channelDescription">Tavsif</Label>
            <Input id="channelDescription" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Bekor qilish</Button>
            <Button type="submit" className="flex-1 dark:bg-blue-900 dark:text-white" disabled={isLoading}>{isLoading ? 'Yaratilmoqda...' : 'Kanal yaratish'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default CreateChannelDialog
