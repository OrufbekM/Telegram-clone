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
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 text-foreground p-0 overflow-hidden border border-gray-200 dark:border-gray-700">
        <DialogHeader className="bg-gray-50 dark:bg-gray-800 p-6">
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white text-center">Foydalanuvchi ma'lumotlari</DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          <div className="flex flex-row items-center mb-6 gap-4">
            <Avatar className="w-20 h-20 border-4 border-gray-200 dark:border-gray-700">
              {userInfo.avatar && <AvatarImage src={toAbsoluteUrl(userInfo.avatar)} alt="avatar" />}
              <AvatarFallback className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-2xl">
                {initial}
              </AvatarFallback>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-gray-900">
                <div className={`w-full h-full rounded-full ${userInfo.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              </div>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{userInfo.firstName} {userInfo.lastName}</h2>
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
            <div className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <User className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ism</p>
                <p className="text-gray-900 dark:text-white">{userInfo.firstName || '-'} {userInfo.lastName || ''}</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <AtSign className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Username</p>
                <p className="text-gray-900 dark:text-white">@{userInfo.username || '-'}</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <Phone className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Telefon</p>
                <p className="text-gray-900 dark:text-white">{userInfo.phone || "Ma'lumot yo'q"}</p>
              </div>
            </div>
            
            {userInfo.bio && (
              <div className="flex items-start p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Bio</p>
                  <p className="text-gray-900 dark:text-white whitespace-pre-line">{userInfo.bio}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <Button 
              onClick={handleSendMessage} 
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Yuborilmoqda...
                </span>
              ) : (
                <span className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Xabar yuborish
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UserInfoDialog