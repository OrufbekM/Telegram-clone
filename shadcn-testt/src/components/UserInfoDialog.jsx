import React, { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import OnlineStatusIndicator from './OnlineStatusIndicator'
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

  const updateUserInfo = useCallback((userData) => {
    setUserInfo(prev => ({
      ...prev,
      username: userData.username || prev.username,
      email: userData.email || prev.email,
      firstName: userData.firstName || prev.firstName,
      lastName: userData.lastName || prev.lastName,
      bio: userData.bio || prev.bio,
      avatar: userData.avatar || prev.avatar,
      phone: userData.phone || prev.phone,
      isOnline: userData.isOnline !== undefined ? userData.isOnline : prev.isOnline,
      lastSeen: userData.lastSeen || prev.lastSeen
    }));
  }, []);

  useEffect(() => {
    if (open && user) {
      updateUserInfo({
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        avatar: user.avatar,
        phone: user.phone,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      });
    }
  }, [open, user, updateUserInfo]);

  // Listen for WebSocket updates
  useEffect(() => {
    if (!open || !user?.id) return;

    const handleProfileUpdate = (event) => {
      const { userId, updates } = event.detail;
      if (userId === user.id) {
        console.log('🔄 Received profile update for user:', userId, updates);
        updateUserInfo(updates);
      }
    };

    const handleStatusUpdate = (event) => {
      const { userId, isOnline, lastSeen } = event.detail;
      if (userId === user.id) {
        console.log('🔄 Received status update for user:', userId, { isOnline, lastSeen });
        updateUserInfo({
          isOnline,
          lastSeen
        });
      }
    };

    window.addEventListener('user-profile-updated', handleProfileUpdate);
    window.addEventListener('user-status-update-global', handleStatusUpdate);

    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
      window.removeEventListener('user-status-update-global', handleStatusUpdate);
    };
  }, [open, user?.id, updateUserInfo]);

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
                <OnlineStatusIndicator 
                  isOnline={userInfo.isOnline} 
                  lastSeen={userInfo.lastSeen}
                  username={`${userInfo.firstName} ${userInfo.lastName}`}
                  showText={true}
                  size="sm"
                />
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