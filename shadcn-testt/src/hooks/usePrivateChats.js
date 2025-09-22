import { useState } from 'react'
import apiClient from '../../services/api-Client'
export const usePrivateChats = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const handleError = (err, fallbackMessage) => {
    const message = typeof err === 'string' ? err : err?.message || fallbackMessage
    setError(message)
    throw new Error(message)
  }
  const startPrivateChat = async (token, targetUserId) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/users/private-chat', { targetUserId }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return data
    } catch (err) {
      return handleError(err, 'Private chat boshlashda xatolik')
    } finally {
      setIsLoading(false)
    }
  }
  const getPrivateChats = async () => {
    try {
      const { data } = await apiClient.get('/users/private-chats')
      return { privateChats: data.chats ?? data.privateChats ?? [] }
    } catch (err) {
      return handleError(err, 'Private chatlarni olishda xatolik')
    }
  }
  return {
    startPrivateChat,
    getPrivateChats,
    isLoading,
    error,
  }
}

