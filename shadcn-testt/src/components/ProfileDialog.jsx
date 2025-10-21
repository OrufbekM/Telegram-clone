﻿import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { useAuth } from '../hooks/useAuth'
import LogoutConfirmDialog from './LogoutConfirmDialog'
import { storage } from '../utils/storageUtils'
import { MoreVertical, User, Phone, AtSign, Edit3, LogOut, MessageSquare, FileText } from 'lucide-react' // Updated imports

const API_URL = 'http://localhost:3000'
const toAbsoluteUrl = (url) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_URL}${url}`
}

const ProfileDialog = ({ open, onOpenChange, onLogout }) => {
  const token = typeof window !== 'undefined' ? storage.getPersistent('chatToken') : null
  const storedUser = typeof window !== 'undefined' ? JSON.parse(storage.getPersistent('chatUser') || '{}') : {}
  const [profile, setProfile] = useState({ username: '', email: '', firstName: '', lastName: '', bio: '', avatar: '', phone: '' })
  const [form, setForm] = useState({ username: '', firstName: '', lastName: '', bio: '', phone: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const { getUserProfile, updateProfile, uploadAvatar, updateAvatar, logout } = useAuth()

  // Added useEffect to handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('.profile-menu')) {
        setShowMenu(false)
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

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
          avatar: p?.avatar || '',
          phone: p?.phone || '' // Added phone field
        })
        setForm({ 
          username: p?.username || storedUser.username || '', 
          firstName: p?.firstName || '', 
          lastName: p?.lastName || '', 
          bio: p?.bio || '',
          phone: p?.phone || '' // Added phone field
        })
      } catch (_) {
        setProfile({
          username: storedUser.username || '',
          email: storedUser.email || '',
          firstName: storedUser.firstName || '',
          lastName: storedUser.lastName || '',
          bio: storedUser.bio || '',
          avatar: storedUser.avatar || '',
          phone: storedUser.phone || '' // Added phone field
        })
        setForm({ 
          username: storedUser.username || '', 
          firstName: storedUser.firstName || '', 
          lastName: storedUser.lastName || '', 
          bio: storedUser.bio || '',
          phone: storedUser.phone || '' // Added phone field
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
  
  // Added function to handle menu option clicks
  const handleMenuOptionClick = (action) => {
    setShowMenu(false);
    if (action === 'edit') {
      setIsEditing(true);
    } else if (action === 'logout') {
      handleLogoutClick();
    }
  }

  const initial = (profile.username || 'U')[0].toUpperCase()
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background text-foreground p-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="text-primary-foreground items-start p-6" >
          <DialogTitle className="text-xl text-black font-bold text-center">Profil</DialogTitle>
          <div className="absolute top-4 right-4 profile-menu">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-black hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-background rounded-md shadow-lg border border-border py-1 z-50">
                <button
                  onClick={() => handleMenuOptionClick('edit')}
                  className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Tahrirlash
                </button>
                <button
                  onClick={() => handleMenuOptionClick('logout')}
                  className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Chiqish
                </button>
              </div>
            )}
          </div>
        </DialogHeader>
        {}
        {!isEditing && (
          <div className="p-6">
            <div className="flex  flex-row items- mb-6 gap-4">
              <Avatar className="w-19 h-19 mb-4">
                {profile.avatar && <AvatarImage src={toAbsoluteUrl(profile.avatar)} alt="avatar" />}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initial}</AvatarFallback>
              </Avatar>
              <div>
                  <h2 className="text-xl font-semibold text-foreground">{profile.firstName} {profile.lastName}</h2>

              <p className='text-xs text-green-700' >Online</p>
              </div>
              
            
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground mr-3" />
                <div>
                  <p className="text-xs text-muted-foreground">Ism</p>
                  <p className="text-foreground">{profile.firstName || '-'} {profile.lastName || ''}</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 rounded-lg bg-muted/50">
                <AtSign className="h-5 w-5 text-muted-foreground mr-3" />
                <div>
                  <p className="text-xs text-muted-foreground">Username</p>
                  <p className="text-foreground">@{profile.username || '-'}</p>
                </div>
              </div>
              
              {/* Phone number without exclamation mark */}
                <div className="flex items-center p-3 rounded-lg bg-muted/50">
                  <Phone className="h-5 w-5 text-muted-foreground mr-3" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefon</p>

                    <p className="text-foreground">{profile.phone || "Ma'lumot yo'q"}</p>
                  </div>
                </div>
              
              

                <div className="flex items-center p-3 rounded-lg bg-muted/50">
                  <FileText className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bio</p>
                    <p className="text-foreground">{profile.bio || "Ma'lumot yo'q"}</p>
                  </div>
                </div>
            </div>
            
            
          </div>
        )}
        {}
        {isEditing && (
          <form onSubmit={handleSave} className="p-6">
            <div className="flex flex-col items-center mb-6">
              <Avatar className="w-20 h-20 mb-4">
                {profile.avatar && <AvatarImage src={toAbsoluteUrl(profile.avatar)} alt="avatar" />}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initial}</AvatarFallback>
              </Avatar>
              <label className="inline-flex items-center px-4 py-2 rounded-md border cursor-pointer text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80">
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
                {uploading ? 'Yuklanmoqda...' : 'Avatar yuklash'}
              </label>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Ism</label>
                <Input 
                  placeholder="Ism" 
                  value={form.firstName} 
                  onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} 
                  className="mt-1" 
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Familya</label>
                <Input 
                  placeholder="Familya" 
                  value={form.lastName} 
                  onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} 
                  className="mt-1" 
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Username</label>
                <Input 
                  placeholder="Username" 
                  value={form.username} 
                  onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} 
                  className="mt-1" 
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Telefon</label>
                <Input 
                  placeholder="Telefon raqami" 
                  value={form.phone} 
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} 
                  className="mt-1" 
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Bio</label>
                <Input 
                  placeholder="Bio" 
                  value={form.bio} 
                  onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} 
                  className="mt-1" 
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
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