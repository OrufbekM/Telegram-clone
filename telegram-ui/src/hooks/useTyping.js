import { useState, useEffect, useRef, useCallback } from 'react';
export const useTyping = (socket, chatType, chatId, userId) => {
  const [typingUsers, setTypingUsers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  
  const typingTimeoutRef = useRef(null);
  const stopTypingTimeoutRef = useRef(null);
  const lastTypingEmitTime = useRef(0);
  
  const TYPING_TIMEOUT = 3000; // 3 sekund - typing to'xtatilgandan keyin indicator yo'qoladi
  const TYPING_EMIT_INTERVAL = 2000;
  const AUTO_STOP_TIMEOUT = 5000; // 5 sekund - agar stop event kelmasa, avtomatik to'xtatadi
  const sendTypingStart = useCallback(() => {
    if (!socket || !chatType || !chatId || !userId) {
      return;
    }
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const now = Date.now(); 
    if (now - lastTypingEmitTime.current < TYPING_EMIT_INTERVAL) {
      return;
    }
    try {
      const message = {
        type: 'typingStart',
        chatType,
        chatId
      };
      socket.send(JSON.stringify(message));
      lastTypingEmitTime.current = now;
    } catch (error) {
      console.error('Error sending typing start:', error);
    }
  }, [socket, chatType, chatId, userId]);
  const sendTypingStop = useCallback(() => {
    if (!socket || !chatType || !chatId || !userId) {
      return;
    }
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      const message = {
        type: 'typingStop',
        chatType,
        chatId
      };
      socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending typing stop:', error);
    }
  }, [socket, chatType, chatId, userId]);
  const startTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStart();
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStop();
    }, TYPING_TIMEOUT);
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
    }
  }, [isTyping, sendTypingStart, sendTypingStop]);
  const stopTyping = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      sendTypingStop();
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
      stopTypingTimeoutRef.current = null;
    }
  }, [isTyping, sendTypingStop]);
  const handleTypingStart = useCallback((data) => {
    if (!data || !data.user) return;
    if (data.chatType === chatType && data.chatId === chatId && data.user.id !== userId) {
      setTypingUsers(prev => ({
        ...prev,
        [data.user.id]: {
          username: data.user.username,
          timestamp: Date.now()
        }
      }));
      setTimeout(() => {
        setTypingUsers(prev => {
          const updated = { ...prev };
          if (updated[data.user.id] && Date.now() - updated[data.user.id].timestamp >= AUTO_STOP_TIMEOUT) {
            delete updated[data.user.id];
          }
          return updated;
        });
      }, AUTO_STOP_TIMEOUT);
    }
  }, [chatType, chatId, userId]);
  const handleTypingStop = useCallback((data) => {
    if (!data || !data.user) return;
    if (data.chatType === chatType && data.chatId === chatId && data.user.id !== userId) {
      setTypingUsers(prev => {
        const updated = { ...prev };
        delete updated[data.user.id];
        return updated;
      });
    }
  }, [chatType, chatId, userId]);
  useEffect(() => {
    if (!socket) return;
    const handleWebSocketMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'typingStart') {
          handleTypingStart(data.data);
        } else if (data.type === 'typingStop') {
          handleTypingStop(data.data);
        }
      } catch (error) {
      }
    };
    socket.addEventListener('message', handleWebSocketMessage);
    return () => {
      socket.removeEventListener('message', handleWebSocketMessage);
    };
  }, [socket, handleTypingStart, handleTypingStop]);
  useEffect(() => {
    setTypingUsers({});
    stopTyping();
  }, [chatType, chatId, stopTyping]);
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current);
      }
    };
  }, []);
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const updated = {};
        Object.entries(prev).forEach(([userId, data]) => {
          if (now - data.timestamp < AUTO_STOP_TIMEOUT) {
            updated[userId] = data;
          }
        });
        return updated;
      });
    }, 1000);
    
    return () => {
      clearInterval(cleanup);
    };
  }, []);
  
  const getTypingText = useCallback(() => {
    const typingUsersList = Object.values(typingUsers);
    if (typingUsersList.length === 0) return '';
    if (typingUsersList.length === 1) {
      return `${typingUsersList[0].username} yozmoqda...`;
    } else if (typingUsersList.length === 2) {
      return `${typingUsersList[0].username} va ${typingUsersList[1].username} yozmoqda...`;
    } else {
      return `${typingUsersList[0].username} va ${typingUsersList.length - 1} kishi yozmoqda...`;
    }
  }, [typingUsers]);
  return {
    typingUsers,
    isTyping,
    hasTypingUsers: Object.keys(typingUsers).length > 0,
    typingText: getTypingText(),
    startTyping,
    stopTyping
  };
};
export default useTyping;

