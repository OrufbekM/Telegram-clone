﻿import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { useAuth } from '../hooks/useAuth'
import LogoutConfirmDialog from './LogoutConfirmDialog'
import { storage } from '../utils/storageUtils'
const API_URL = 'http://localhost:3000'
const toAbsoluteUrl = (url) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_URL}${url}`
}
const ProfileDialog = ({ open, onOpenChange, onLogout }) => {
  const token = typeof window !== 'undefined' ? storage.getPersistent('chatToken') : null
  const storedUser = typeof window !== 'undefined' ? JSON.parse(storage.getPersistent('chatUser') || '{}') : {}
  const [profile, setProfile] = useState({ username: '', email: '', firstName: '', lastName: '', bio: '', avatar: '' })
  const [form, setForm] = useState({ username: '', firstName: '', lastName: '', bio: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { getUserProfile, updateProfile, uploadAvatar, updateAvatar, logout } = useAuth()
  useEffect(() => {
    const load = async () => {
      if (!open || !token || !storedUser?.id) return
      try {
        const data = await getUserProfile(token, storedUser.id)
        const p = data?.user || data
        setProfile({
          username: p?.username || storedUser.username || '',
          email: p?.email || storedUser.email || '',
          firstName: p?.firstName || '',
          lastName: p?.lastName || '',
          bio: p?.bio || '',
          avatar: p?.avatar || ''
        })
        setForm({ 
          username: p?.username || storedUser.username || '', 
          firstName: p?.firstName || '', 
          lastName: p?.lastName || '', 
          bio: p?.bio || '' 
        })
      } catch (_) {
        setProfile({
          username: storedUser.username || '',
          email: storedUser.email || '',
          firstName: storedUser.firstName || '',
          lastName: storedUser.lastName || '',
          bio: storedUser.bio || '',
          avatar: storedUser.avatar || ''
        })
        setForm({ 
          username: storedUser.username || '', 
          firstName: storedUser.firstName || '', 
          lastName: storedUser.lastName || '', 
          bio: storedUser.bio || '' 
        })
      }
    }
    load()
  }, [open])
  const handleSave = async (e) => {
    e.preventDefault()
    if (!token) return
    try {
      setLoading(true)
      const updated = await updateProfile(token, form)
      const merged = { ...storedUser, ...updated.user }
      storage.setPersistent('chatUser', JSON.stringify(merged))
      setProfile(p => ({ ...p, ...updated.user }))
      setIsEditing(false)
    } finally {
      setLoading(false)
    }
  }
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    try {
      setUploading(true)
      const res = await uploadAvatar(token, file)
      if (res && res.user) {
        const merged = { ...storedUser, ...res.user }
        storage.setPersistent('chatUser', JSON.stringify(merged))
        setProfile(p => ({ ...p, ...res.user }))
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
    } finally {
      setUploading(false)
    }
  }
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }
  const handleLogoutConfirm = async () => {
    try {
      const token = storage.getPersistent('chatToken')
      if (token) {
        await logout(token)
      }
      if (onLogout) {
        onLogout()
      }
      setShowLogoutConfirm(false)
      onOpenChange(false)
    } catch (error) {
      console.error('Logout error:', error)
      if (typeof window !== 'undefined') {
        storage.removePersistent('chatToken')
        storage.removePersistent('chatUser')
        storage.clearSessionData()
      }
      if (onLogout) {
        onLogout()
      }
    }
  }
  
  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false)
  }
  
  const initial = (profile.username || 'U')[0].toUpperCase()
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Profil</DialogTitle>
        </DialogHeader>
        {}
        {!isEditing && (
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <Avatar className="w-12 h-12">
                {profile.avatar && <AvatarImage src={toAbsoluteUrl(profile.avatar)} alt="avatar" />}
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">{initial}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{profile.username}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <div className="space-y-1 text-sm text-foreground">
              <p><span className="text-muted-foreground">Ism:</span> {profile.firstName || '-'}</p>
              <p><span className="text-muted-foreground">Familya:</span> {profile.lastName || '-'}</p>
              <p><span className="text-muted-foreground">Bio:</span> {profile.bio || '-'}</p>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button className="flex-1" onClick={() => setIsEditing(true)}>Tahrirlash</Button>
                <Button variant="outline" className="flex-1" onClick={handleLogoutClick}>Chiqish</Button>
            </div>
          </div>
        )}
        {}
        {isEditing && (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="flex items-center space-x-3">
              <Avatar className="w-16 h-16">
                {profile.avatar && <AvatarImage src={toAbsoluteUrl(profile.avatar)} alt="avatar" />}
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">{initial}</AvatarFallback>
              </Avatar>
              <label className="inline-flex items-center px-3 py-2 rounded-md border cursor-pointer text-sm bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent">
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
                {uploading ? 'Yuklanmoqda...' : 'Avatar yuklash'}
              </label>
            </div>
              <Input placeholder="Username" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} className="bg-sidebar text-foreground placeholder:text-muted-foreground" />
            <Input placeholder="Ism" value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} className="bg-sidebar text-foreground placeholder:text-muted-foreground" />
            <Input placeholder="Familya" value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} className="bg-sidebar text-foreground placeholder:text-muted-foreground" />
            <Input placeholder="Bio" value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} className="bg-sidebar text-foreground placeholder:text-muted-foreground" />
            <div className="flex space-x-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Bekor qilish</Button>
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Saqlanmoqda...' : 'Saqlash'}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
      <LogoutConfirmDialog 
        open={showLogoutConfirm} 
        onOpenChange={setShowLogoutConfirm}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </>
  )
}
export default ProfileDialog

