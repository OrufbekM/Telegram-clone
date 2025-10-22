import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { storage } from '../utils/storageUtils'
import { User, Phone, AtSign, MessageSquare, FileText, Circle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePrivateChats } from '../hooks/usePrivateChats'
import { useToast } from '../hooks/use-toast'

const API_URL = 'http://localhost:3000'
const toAbsoluteUrl = (url) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_URL}${url}`
}

const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'offline'
  
  const date = new Date(lastSeen)
  const now = new Date()
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'last seen just now'
  if (diffInMinutes < 60) return `last seen ${diffInMinutes} minutes ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `last seen ${diffInHours} hours ago`
  
  return `last seen ${date.toLocaleDateString()}`
}

const UserInfoDialog = ({ open, onOpenChange, user }) => {
  const [userInfo, setUserInfo] = useState({ 
    username: '', 
    email: '', 
    firstName: '', 
    lastName: '', 
    bio: '', 
    avatar: '', 
    phone: '',
    isOnline: false,
    lastSeen: null
  })
  const { getUserProfile } = useAuth()
  const { startPrivateChat } = usePrivateChats()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && user) {
      setUserInfo({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
        phone: user.phone || '',
        isOnline: user.isOnline || false,
        lastSeen: user.lastSeen || null
      })
    }
  }, [open, user])

  const initial = (userInfo.username || 'U')[0].toUpperCase()
  
  const handleSendMessage = async () => {
    if (!user || !user.id) return
    
    setIsLoading(true)
    try {
      const token = storage.getPersistent('chatToken')
      if (!token) {
        toast({
          title: "Xatolik",
          description: "Foydalanuvchi tizimga kirmagan",
          variant: "destructive"
        })
        return
      }
      
      // Start or get existing private chat
      const response = await startPrivateChat(token, user.id)
      const chatId = response.chatId || response.data?.chatId
      
      if (chatId) {
        // Close the dialog
        onOpenChange(false)
        
        // Navigate to the chat using the existing event system
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sidebar-start-chat', {
            detail: {
              chatId: chatId,
              type: 'private',
              user: user
            }
          }))
        }, 100)
      } else {
        throw new Error('Chat ID not found in response')
      }
    } catch (error) {
      console.error('Error starting private chat:', error)
      toast({
        title: "Xatolik",
        description: error.message || "Xabar yuborishda xatolik yuz berdi",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background text-foreground p-0 overflow-hidden" >
        <DialogHeader className="text-primary-foreground items-start p-6">
          <DialogTitle className="text-xl text-black font-bold text-center">User Info</DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          <div className="flex flex-row items-center mb-6 gap-4">
            <Avatar className="w-19 h-19 mb-4">
              {userInfo.avatar && <AvatarImage src={toAbsoluteUrl(userInfo.avatar)} alt="avatar" />}
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initial}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{userInfo.firstName} {userInfo.lastName}</h2>
              <div className="flex items-center mt-1">
                {userInfo.isOnline ? (
                  <>
                    <span className="text-green-600 text-sm">online</span>
                  </>
                ) : (
                  <span className="text-gray-500 text-sm">
                    {userInfo.lastSeen ? formatLastSeen(userInfo.lastSeen) : 'offline'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center p-3 rounded-lg bg-muted/50">
              <User className="h-5 w-5 text-muted-foreground mr-3" />
              <div>
                <p className="text-xs text-muted-foreground">Ism</p>
                <p className="text-foreground">{userInfo.firstName || '-'} {userInfo.lastName || ''}</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 rounded-lg bg-muted/50">
              <AtSign className="h-5 w-5 text-muted-foreground mr-3" />
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="text-foreground">@{userInfo.username || '-'}</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 rounded-lg bg-muted/50">
              <Phone className="h-5 w-5 text-muted-foreground mr-3" />
              <div>
                <p className="text-xs text-muted-foreground">Telefon</p>
                <p className="text-foreground">{userInfo.phone || "Ma'lumot yo'q"}</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 rounded-lg bg-muted/50">
              <FileText className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Bio</p>
                <p className="text-foreground">{userInfo.bio || "Ma'lumot yo'q"}</p>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3 mt-6">

            <Button className="flex-1" onClick={handleSendMessage} disabled={isLoading}>
              <MessageSquare className="h-4 w-4 mr-2" />
              {isLoading ? 'Yuborilmoqda...' : 'Xabar yuborish'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UserInfoDialog