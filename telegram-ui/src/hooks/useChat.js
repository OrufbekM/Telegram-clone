import { useState } from 'react'
import apiClient from '../../services/api-Client'
const WS_URL = 'ws://localhost:3000'
export const useChat = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const handleError = (err, fallbackMessage) => {
    const message = typeof err === 'string' ? err : err?.message || fallbackMessage
    setError(message)
    throw new Error(message)
  }
  const sendMessage = async (token, messageData) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/chat/send', messageData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const result = {
        data: data.data || data,
        success: true
      }
      return result
    } catch (err) {
      console.error('вќЊ Error sending message:', err)
      if (err?.response?.status === 403 && err?.response?.data?.message?.includes('deleted')) {
        window.dispatchEvent(new CustomEvent('chat-deleted-error', {
          detail: {
            chatType: messageData.chatType,
            chatId: messageData.chatId,
            error: 'Chat has been deleted'
          }
        }));
      }
      return handleError(err, 'Xabar yuborishda xatolik')
    } finally {
      setIsLoading(false)
    }
  }
  const fetchMessages = async (token, chatType, chatId, limit = 50, offset = 0) => {
    try {
      const { data } = await apiClient.get('/chat/messages', {
        params: { chatType, chatId, limit, offset }
      })
      return data
    } catch (err) {
      return handleError(err, 'Xabarlarni olishda xatolik')
    }
  }
  const editMessage = async (token, messageId, newContent) => {
    try {
      const { data } = await apiClient.put(`/chat/messages/${messageId}`, { content: newContent })
      return data
    } catch (err) {
      return handleError(err, 'Xabarni tahrirlashda xatolik')
    }
  }
  const deleteMessage = async (token, messageId) => {
    try {
      const { data } = await apiClient.delete(`/chat/messages/${messageId}`)
      return data
    } catch (err) {
      return handleError(err, 'Xabarni o\'chirishda xatolik')
    }
  }
  const markMessagesAsRead = async (token, chatType, chatId, messageIds) => {
    try {
      const { data } = await apiClient.post('/chat/messages/read', {
        chatType,
        chatId,
        messageIds
      })
      return data
    } catch (err) {
      return handleError(err, 'Xabarlarni o\'qilgan deb belgilashda xatolik')
    }
  }
  const markChatAsRead = async (token, chatType, chatId) => {
    try {
      const { data } = await apiClient.post('/chat/read', {
        chatType,
        chatId
      })
      return data
    } catch (err) {
      return handleError(err, 'Chatni o\'qilgan deb belgilashda xatolik')
    }
  }
  const clearChatHistory = async (token, chatType, chatId) => {
    try {
      const { data } = await apiClient.post('/chat/messages/clear', {
        chatType, 
        chatId
      })
      return data
    } catch (err) {
      return handleError(err, 'Chat tarixini tozalashda xatolik')
    }
  }
  const deleteChat = async (token, chatType, chatId) => {
    try {
      const { data } = await apiClient.post('/chat/delete', {
        chatType, 
        chatId
      })
      return data
    } catch (err) {
      return handleError(err, 'Chatni o\'chirishda xatolik')
    }
  }
  return {
    sendMessage,
    fetchMessages,
    editMessage,
    deleteMessage,
    markMessagesAsRead,
    markChatAsRead,
    clearChatHistory,
    deleteChat,
    createWebSocket: (onMessage, onOpen, onClose) => {
      try {
        const ws = new WebSocket(WS_URL)
        if (onOpen) ws.onopen = onOpen
        if (onClose) ws.onclose = onClose
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data)
            onMessage && onMessage(payload)
          } catch (e) {
            console.warn('WS parse error', e)
          }
        }
        return ws
      } catch (e) {
        console.error('WS init error', e)
        return null
      }
    },
    isLoading,
    error
  }
}

