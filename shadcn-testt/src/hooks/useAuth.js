import { useState, useCallback } from 'react'
import apiClient from '../../services/api-Client'
const WS_URL = 'ws://localhost:3000'
export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const handleError = (err, fallbackMessage) => {
    const message = typeof err === 'string' ? err : err?.message || fallbackMessage
    setError(message)
    throw new Error(message)
  }
  const signup = async (userData) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/auth/signup', userData)
      return data
    } catch (err) {
      return handleError(err, 'Ro\'yxatdan o\'tishda xatolik')
    } finally {
      setIsLoading(false)
    }
  }
  const signin = async (credentials) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/auth/signin', credentials)
      return data
    } catch (err) {
      return handleError(err, 'Tizimga kirishda xatolik')
    } finally {
      setIsLoading(false)
    }
  }
  const getUserProfile = async (token, userId) => {
    try {
      const { data } = await apiClient.get(`/users/${userId}/profile`)
      return data.user ?? data
    } catch (err) {
      return handleError(err, 'Profil ma\'lumotlarini olishda xatolik')
    }
  }
  const updateProfile = async (token, profileData, socket = null) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.put('/users/profile', profileData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      // Emit profile update event through WebSocket if socket is provided
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'profile_update',
          data: { user: data.user || data }
        }));
      }
      
      return data
    } catch (err) {
      return handleError(err, 'Profilni yangilashda xatolik')
    } finally {
      setIsLoading(false)
    }
  }
  const updateAvatar = async (token, avatarUrl) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.put('/users/avatar', { avatar: avatarUrl })
      return data
    } catch (err) {
      return handleError(err, 'Avatarni yangilashda xatolik')
    } finally {
      setIsLoading(false)
    }
  }
  const uploadAvatar = async (token, file) => {
    setIsLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const { data } = await apiClient.post('/upload/avatar', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      
      // After uploading, update the user's avatar URL
      if (data.url) {
        const updateResponse = await apiClient.put('/users/avatar', { avatar: data.url }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        return updateResponse.data
      }
      
      return data
    } catch (err) {
      return handleError(err, 'Avatar yuklashda xatolik')
    } finally {
      setIsLoading(false)
    }
  }
  const logout = async (token) => {
    setIsLoading(true)
    setError(null)
    try {
      await apiClient.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chatToken')
        localStorage.removeItem('chatUser')
      }
      return { message: 'Logged out successfully' }
    } catch (err) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chatToken')
        localStorage.removeItem('chatUser')
      }
      return handleError(err, 'Chiqishda xatolik')
    } finally {
      setIsLoading(false)
    }
  }
  return {
    signup,
    signin,
    getUserProfile,
    updateProfile,
    updateAvatar,
    uploadAvatar,
    logout,
    isLoading,
    error
  }
}

