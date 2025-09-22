import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
const API_URL = 'http://localhost:3000';
export const useUnreadMessages = (user, currentChat, currentChatType) => {
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const getUnreadCount = async (chatType, chatId) => {
    try {
      const token = localStorage.getItem('chatToken');
      if (!token) return 0;
      const response = await axios.get(`${API_URL}/api/chat/unread`, {
        params: { chatType, chatId },
        headers: {
          'x-access-token': token
        }
      });
      return response.data.unreadCount || 0;
    } catch (error) {
      return 0;
    }
  };
  const getAllUnreadCounts = async () => {
    try {
      const token = localStorage.getItem('chatToken');
      if (!token) return {};
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/chat/unread/all`, {
        headers: {
          'x-access-token': token
        }
      });
      const counts = response.data.unreadCounts || {};
      setUnreadCounts(counts);
      return counts;
    } catch (error) {
      return {};
    } finally {
      setIsLoading(false);
    }
  };
  const updateUnreadCount = useCallback((chatType, chatId, count) => {
    const key = `${chatType}_${chatId}`;
    setUnreadCounts(prev => {
      if (count === 0) {
        const newCounts = { ...prev };
        delete newCounts[key];
        return newCounts;
      } else {
        return {
          ...prev,
          [key]: count
        };
      }
    });
  }, []);
  const incrementUnreadCount = useCallback((chatType, chatId, senderId) => {
    if (user && senderId === user.id) return;
    if (currentChat && currentChatType && 
        currentChatType === chatType && 
        currentChat.id === parseInt(chatId)) {
      return;
    }
    const key = `${chatType}_${chatId}`;
    setUnreadCounts(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + 1
    }));
  }, [user, currentChat, currentChatType]);
  const clearUnreadCount = useCallback((chatType, chatId) => {
    const key = `${chatType}_${chatId}`;
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[key];
      return newCounts;
    });
  }, []);
  const getUnreadCountFromState = useCallback((chatType, chatId) => {
    const key = `${chatType}_${chatId}`;
    return unreadCounts[key] || 0;
  }, [unreadCounts]);
  const getTotalUnreadCount = useCallback(() => {
    return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
  }, [unreadCounts]);
  useEffect(() => {
    if (user) {
      getAllUnreadCounts();
    } else {
      setUnreadCounts({});
    }
  }, [user]);
  useEffect(() => {
    const handleNewMessage = (event) => {
      const message = event.detail;
      if (message && message.user && message.chatType && message.chatId) {
        if (user && message.user.id !== user.id) {
          incrementUnreadCount(message.chatType, message.chatId, message.user.id);
        }
      }
    };
    const handleMessageRead = (event) => {
      const data = event.detail;
      if (data && data.chatType && data.chatId && data.reader && user && data.reader.id === user.id) {
        clearUnreadCount(data.chatType, data.chatId);
      }
    };
    const handleChatRead = (event) => {
      const data = event.detail;
      if (data && data.chatType && data.chatId) {
        clearUnreadCount(data.chatType, data.chatId);
      }
    };
    window.addEventListener('new-message', handleNewMessage);
    window.addEventListener('message-read', handleMessageRead);
    window.addEventListener('chat-read', handleChatRead);
    return () => {
      window.removeEventListener('new-message', handleNewMessage);
      window.removeEventListener('message-read', handleMessageRead);
      window.removeEventListener('chat-read', handleChatRead);
    };
  }, [user, incrementUnreadCount, clearUnreadCount]);
  return {
    unreadCounts,
    isLoading,
    getUnreadCount,
    getAllUnreadCounts,
    updateUnreadCount,
    incrementUnreadCount,
    clearUnreadCount,
    getUnreadCountFromState,
    getTotalUnreadCount
  };
};

