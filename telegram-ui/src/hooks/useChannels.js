import { useState } from 'react'
import apiClient from '../../services/api-Client'
export const useChannels = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const handleError = (err, fallbackMessage) => {
    const message = typeof err === 'string' ? err : err?.message || fallbackMessage
    setError(message)
    throw new Error(message)
  }
  const createChannel = async (token, payload) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/channels', payload)
      return data
    } catch (err) {
      return handleError(err, 'Kanal yaratishda xatolik')
    } finally {
      setIsLoading(false)
    }
  }
  const getUserChannels = async (token) => {
    try {
      const { data } = await apiClient.get('/channels/user')
      return data
    } catch (err) {
      if (err?.status === 404 || err?.response?.status === 404) {
        return { channels: [] }
      }
      return handleError(err, 'Kanallarni olishda xatolik')
    }
  }
  const joinChannel = async (token, channelId) => {
    try {
      const { data } = await apiClient.post(`/channels/${channelId}/join`)
      return data
    } catch (err) {
      return handleError(err, 'Kanala qo\'shilishda xatolik')
    }
  }
  const leaveChannel = async (token, channelId) => {
    try {
      const { data } = await apiClient.post(`/channels/${channelId}/leave`)
      return data
    } catch (err) {
      return handleError(err, 'Kanaldan chiqishda xatolik')
    }
  }
  const getChannelStatus = async (token, channelId) => {
    try {
      const { data } = await apiClient.get(`/channels/${channelId}/status`)
      return data
    } catch (err) {
      if (err?.status === 404 || err?.response?.status === 404) {
        return { isMember: false, role: 'none' }
      }
      return handleError(err, 'Kanal statusini olishda xatolik')
    }
  }
  const grantAdmin = async (token, channelId, targetUserId) => {
    try {
      const { data } = await apiClient.post('/channels/grant-admin', { channelId, targetUserId })
      return data
    } catch (err) {
      return handleError(err, 'Adminlik berishda xatolik')
    }
  }
  return {
    createChannel,
    getUserChannels,
    joinChannel,
    leaveChannel,
    getChannelStatus,
    grantAdmin,
    isLoading,
    error
  }
} 
